from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    environment: str = "local"
    database_url: str = "postgresql+psycopg://agentos:agentos_local@127.0.0.1:55432/agentos"
    analytics_database_url: str = "postgresql+psycopg://agentos_report:report_local@127.0.0.1:55432/agentos"
    session_secret: str = "local-only-change-this-32-character-secret"
    auth_mode: str = "development"
    model_mode: str = "development"
    gemini_api_key: str = ""
    gemini_model: str = ""
    gemini_free_tier_verified: bool = False
    supabase_url: str = ""
    supabase_jwt_audience: str = "authenticated"
    frontend_origin: str = "http://localhost:3000"
    enable_public_demo: bool = False
    embedding_mode: str = "hybrid"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_cache_dir: str = str(ROOT / ".cache" / "embeddings")
    request_limit: int = 30
    daily_model_budget: int = 100
    log_retention_days: int = 14
    tool_timeout_seconds: int = 30

    @model_validator(mode="after")
    def validate_modes(self):
        if self.environment not in {"local", "test", "hosted"}:
            raise ValueError("Invalid environment")
        if self.auth_mode not in {"development", "supabase"} or self.model_mode not in {
            "development",
            "live",
        }:
            raise ValueError("Invalid authentication/model mode")
        if self.environment == "hosted":
            if self.auth_mode != "supabase" or not self.supabase_url.startswith("https://"):
                raise ValueError("Hosted operation requires Supabase Auth")
            if self.session_secret.startswith("local-") or len(self.session_secret) < 32:
                raise ValueError("Hosted operation requires a unique strong session secret")
            if not self.frontend_origin.startswith("https://"):
                raise ValueError("Hosted frontend must use HTTPS")
        if self.model_mode == "live" and not (
            self.gemini_api_key and self.gemini_model and self.gemini_free_tier_verified
        ):
            raise ValueError(
                "Live mode requires a key, explicit verified model, and free-tier quota attestation"
            )
        return self

    @property
    def psycopg_url(self):
        return self.database_url.replace("postgresql+psycopg://", "postgresql://")


@lru_cache
def settings():
    return Settings()
