import json
import os
import statistics
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

# The frozen evaluation is deterministic by design, regardless of the local
# runtime mode selected in .env. Individual fault tests opt into live mode with
# monkeypatches and mocked clients.
os.environ["MODEL_MODE"] = "development"

RESULTS = []


@pytest.fixture(scope="session", autouse=True)
def collect_results():
    yield
    if not RESULTS:
        return
    passed = sum(r["passed"] for r in RESULTS)
    warm = [r["latency_ms"] for r in RESULTS if not r.get("cold_start")]
    p95 = sorted(warm)[min(len(warm) - 1, int(len(warm) * 0.95))] if warm else None
    policy = [r for r in RESULTS if r["category"] == "policy"]
    analytics = [r for r in RESULTS if r["category"] == "analytics"]
    result = {
        "mode": "deterministic-development; real PostgreSQL and MCP; explicitly injected recovery faults",
        "dataset_seed": 20261009,
        "dataset": "evaluation/final.json",
        "test_date": datetime.now(ZoneInfo("Asia/Kolkata")).isoformat(),
        "run_count": 1,
        "model": "development-rules-v1",
        "model_calls": 0,
        "token_usage": None,
        "live_model_verified": False,
        "summary": {
            "total": len(RESULTS),
            "passed": passed,
            "failed": len(RESULTS) - passed,
            "case_success_rate": passed / len(RESULTS),
            "policy_cases_passed": sum(r["passed"] for r in policy),
            "analytics_cases_passed": sum(r["passed"] for r in analytics),
            "unauthorized_access_actions_observed": sum(r.get("unauthorized", 0) for r in RESULTS),
            "duplicate_submissions_observed": sum(r.get("duplicates", 0) for r in RESULTS),
            "median_warm_latency_ms": statistics.median(warm) if warm else None,
            "p95_warm_latency_ms": p95,
            "cold_start_cases": [
                {"id": r["id"], "latency_ms": r["latency_ms"]} for r in RESULTS if r.get("cold_start")
            ],
        },
        "limitations": "Deterministic service, API, MCP, and checkpoint scenarios; not 60 live-model end-to-end trials. Extractive citation support is checked by source containment, not independent human review. Synthetic data only. Latencies mix scenario complexity, with cold embedding initialization separated.",
        "cases": RESULTS,
    }
    Path("artifacts").mkdir(exist_ok=True)
    Path("artifacts/evaluation-results.json").write_text(json.dumps(result, indent=2))
