from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key-replace-in-production"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./trading_ai.db"

    # AI defaults (per-agent keys override these)
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Broker defaults
    BINANCE_API_KEY: str = ""
    BINANCE_SECRET: str = ""

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
