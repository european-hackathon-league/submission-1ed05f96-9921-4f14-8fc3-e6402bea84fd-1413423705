"""Settings from the environment. Local dev also reads backend/.env and the repo-root .env (both git-ignored)."""
import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
# Tests set DIXI_NO_ENV_FILES=1 so no real key or database from a .env file can be used by accident.
ENV_FILES = () if os.environ.get("DIXI_NO_ENV_FILES") else (BACKEND_DIR.parent / ".env", BACKEND_DIR / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        # Empty placeholders copied from .env.example must not override a key set in the other file.
        env_ignore_empty=True,
        extra="ignore",
    )

    environment: str = "development"
    cors_origins: str = "http://localhost:3000"

    openai_api_key: str | None = None
    # Scouts search and summarise; the orchestrator merges, links and judges strength.
    openai_model_fast: str = "gpt-6-luna"
    openai_model_strong: str = "gpt-6.1-sol"

    tavily_api_key: str | None = None
    # Without a key: use Tavily's keyless mode (search + extract, rate-limited). Fine for dev, not for production.
    tavily_keyless: bool = True
    tavily_mcp_url: str = "https://mcp.tavily.com/mcp/"
    # Sent as Tavily's DEFAULT_PARAMETERS header: keeps every search at 1 credit on the free tier.
    tavily_search_depth: str = "basic"
    # Tool budget per scout run (Tavily credits ≈ calls on basic depth).
    scout_tool_calls: int = 6

    # Supabase (hosted project "Dixi"). Backend-only keys; without them the API keeps data in memory (dev/tests).
    supabase_url: str | None = None
    supabase_secret_key: str | None = None
    supabase_service_role_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
