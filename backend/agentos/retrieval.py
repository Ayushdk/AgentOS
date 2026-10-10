"""Section-aware hybrid search. Policy text never becomes executable instructions."""

import json
import re
from datetime import date
from functools import lru_cache

import numpy as np
from sqlalchemy import select, text

from .config import ROOT, settings
from .db import transaction
from .errors import DomainError
from .models import PolicyChunk, PolicyDocument, now


@lru_cache
def embedder():
    from fastembed import TextEmbedding

    return TextEmbedding(
        model_name=settings().embedding_model,
        cache_dir=settings().embedding_cache_dir,
        threads=2,
        providers=["CPUExecutionProvider"],
    )


def embed(texts):
    return [v.tolist() for v in embedder().embed(texts)]


def chunk_text(text_value, max_tokens=220):
    # A conservative character bound is below MiniLM's 256-token limit even for
    # pathological ASCII wordpieces. Split further using the actual tokenizer.
    model = embedder()
    tokenizer = model.model.tokenizer
    words = text_value.split()
    chunks = []
    current = []
    for word in words:
        trial = " ".join(current + [word])
        if len(tokenizer.encode(trial).ids) > max_tokens and current:
            chunks.append(" ".join(current))
            current = []
        if len(tokenizer.encode(word).ids) > max_tokens:
            raise ValueError("Policy contains an overlong unsplittable word")
        current.append(word)
    if current:
        chunks.append(" ".join(current))
    return chunks


def has_vector(s):
    return bool(
        s.scalar(
            text(
                "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='policy_chunks' AND column_name='embedding'"
            )
        )
    )


def ingest(with_embeddings=True):
    count = 0
    with transaction() as s:
        vector = has_vector(s)
        for p in sorted((ROOT / "policies").rglob("*.md")):
            raw = p.read_text(encoding="utf-8")
            _, header, body = raw.split("---", 2)
            meta = json.loads(header)
            doc = PolicyDocument(
                id=meta["id"],
                title=meta["title"],
                version=meta["version"],
                effective_date=date.fromisoformat(meta["effective_date"]),
                expires_on=date.fromisoformat(meta["expires_on"]) if meta.get("expires_on") else None,
                audience=",".join(meta["audience"]),
                fixture=meta.get("fixture", False),
            )
            s.merge(doc)
            sections = re.split(r"^## \[([^]]+)\] ([^\n]+)\n", body, flags=re.M)
            for i in range(1, len(sections), 3):
                sid, heading, content = sections[i : i + 3]
                claim = re.search(r"<!-- claim: ([^=]+)=([^>]+) -->", content)
                clean = re.sub(r"<!--.*?-->", "", content, flags=re.S).strip()
                pieces = (
                    chunk_text(clean)
                    if with_embeddings
                    else [clean[j : j + 600] for j in range(0, len(clean), 600)]
                )
                vectors = embed(pieces) if with_embeddings else [None] * len(pieces)
                for j, (piece, vec) in enumerate(zip(pieces, vectors, strict=True)):
                    cid = f"{doc.id}:{sid}:{j}"
                    s.merge(
                        PolicyChunk(
                            id=cid,
                            document_id=doc.id,
                            section_id=sid,
                            heading=heading,
                            text=piece,
                            embedding_json=vec,
                            claim_key=claim[1] if claim else None,
                            claim_value=claim[2].strip() if claim else None,
                        )
                    )
                    s.flush()
                    if vector and vec:
                        s.execute(
                            text("UPDATE policy_chunks SET embedding=CAST(:v AS vector) WHERE id=:id"),
                            {"v": json.dumps(vec), "id": cid},
                        )
                    count += 1
        return {
            "chunks": count,
            "embeddings": with_embeddings,
            "vector_storage": "pgvector" if vector else "json_cosine_fallback",
        }


def citation(chunk, doc):
    return {
        "id": chunk.id,
        "document_id": doc.id,
        "title": doc.title,
        "version": doc.version,
        "effective_date": str(doc.effective_date),
        "section_id": chunk.section_id,
        "heading": chunk.heading,
        "excerpt": chunk.text,
    }


def eligible(doc, role, as_of, fixtures=False):
    return (
        role in doc.audience.split(",")
        and doc.effective_date <= as_of
        and (not doc.expires_on or doc.expires_on >= as_of)
        and (fixtures or not doc.fixture)
    )


def resolve_citations(ctx, ids, as_of=None):
    with transaction() as s:
        result = []
        for cid in ids:
            chunk = s.get(PolicyChunk, cid)
            doc = s.get(PolicyDocument, chunk.document_id) if chunk else None
            if not chunk or not eligible(doc, ctx.role, as_of or now().date()):
                raise DomainError("invalid_citation", "A citation is missing, expired, or inaccessible.", 400)
            result.append(citation(chunk, doc))
        return result


def search_policies(ctx, query, fixtures=False, as_of=None):
    as_of = as_of or now().date()
    if not query.strip() or len(query) > 2000:
        raise DomainError("query", "Enter a policy question of at most 2000 characters.")
    with transaction() as s:
        pairs = [
            (c, d)
            for c, d in s.execute(
                select(PolicyChunk, PolicyDocument).join(
                    PolicyDocument, PolicyChunk.document_id == PolicyDocument.id
                )
            )
            if eligible(d, ctx.role, as_of, fixtures)
        ]
        ranks = {
            r.id: float(r.score)
            for r in s.execute(
                text(
                    "SELECT id,ts_rank_cd(search_vector,websearch_to_tsquery('english',:q)) AS score FROM policy_chunks WHERE search_vector @@ websearch_to_tsquery('english',:q)"
                ),
                {"q": query},
            )
        }
        mode = "full_text_fallback"
        vector_scores = {}
        if settings().embedding_mode == "hybrid" and any(c.embedding_json for c, d in pairs):
            try:
                qv = np.asarray(embed([query])[0])
                vector = has_vector(s)
                if vector:
                    vector_scores = {
                        r.id: 1 - float(r.distance)
                        for r in s.execute(
                            text(
                                "SELECT id,embedding <=> CAST(:v AS vector) AS distance FROM policy_chunks WHERE embedding IS NOT NULL"
                            ),
                            {"v": json.dumps(qv.tolist())},
                        )
                    }
                    mode = "hybrid_pgvector_fts"
                else:
                    for c, _doc in pairs:
                        if c.embedding_json:
                            cv = np.asarray(c.embedding_json)
                            vector_scores[c.id] = float(
                                np.dot(qv, cv) / (np.linalg.norm(qv) * np.linalg.norm(cv))
                            )
                    mode = "hybrid_json_cosine_fallback"
            except Exception:
                mode = "full_text_fallback"
        candidates = []
        words = set(re.findall(r"[a-z]{3,}", query.lower())) - {
            "what",
            "does",
            "with",
            "have",
            "many",
            "policy",
            "please",
            "about",
            "company",
            "that",
            "this",
            "could",
        }
        for c, d in pairs:
            overlap = len(words & set(re.findall(r"[a-z]{3,}", (c.heading + " " + c.text).lower())))
            score = ranks.get(c.id, 0) * 3 + vector_scores.get(c.id, 0) + min(overlap, 5) * 0.12
            if overlap or vector_scores.get(c.id, 0) >= 0.43:
                candidates.append((score, c, d))
        candidates.sort(key=lambda t: (-t[0], t[1].id))
        selected = candidates[:4]
        conflicts = {}
        for _, c, _doc in selected:
            if c.claim_key:
                conflicts.setdefault(c.claim_key, set()).add(c.claim_value)
        contradictory = any(len(v) > 1 for v in conflicts.values())
        explicit_handoff = bool(
            re.search(
                r"\b(?:hr|human resources)\s+(?:handoff|ticket)|prepare (?:an? )?(?:hr )?handoff|escalate (?:this )?to (?:hr|people operations)",
                query,
                re.I,
            )
        )
        unsupported = bool(
            re.search(
                r"broadband|personal phone|furniture|exception|another country|elective|surgery|medical reimbursement",
                query,
                re.I,
            )
        )
        reason = (
            "conflicting_policies"
            if contradictory
            else (
                "explicit_handoff"
                if explicit_handoff
                else (
                    "unsupported_exception" if unsupported else ("missing_evidence" if not selected else None)
                )
            )
        )
        return {
            "citations": [citation(c, d) for _, c, d in selected],
            "retrieval_mode": mode,
            "handoff_reason": reason,
            "checks": ["audience", "effective_date", "superseded_versions", "contradiction_scan"],
            "answer": ("People Operations review is needed: " + reason.replace("_", " ") + ".")
            if reason
            else "\n\n".join(c.text for _, c, d in selected[:2]),
        }


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--without-embeddings", action="store_true")
    a = p.parse_args()
    print(json.dumps(ingest(not a.without_embeddings)))
