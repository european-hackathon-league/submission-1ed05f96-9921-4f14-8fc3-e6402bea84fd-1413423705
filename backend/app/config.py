"""Settings from the environment. Local dev also reads backend/.env and the repo-root .env (both git-ignored)."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR.parent / ".env", BACKEND_DIR / ".env"), extra="ignore"
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

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
