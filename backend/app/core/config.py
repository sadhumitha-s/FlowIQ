from pathlib import Path
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cashflow Decision Engine MVP"
    API_V1_STR: str = "/api/v1"
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./cashflow.db"

    VISION_FALLBACK_ENABLED: bool = False
    VISION_TIMEOUT_SECONDS: float = 45.0

    GROQ_API_KEY: str | None = None
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_MODEL: str = "llama-3.2-11b-vision-preview"
    GROQ_REASONING_MODEL: str = "llama-3.1-8b-instant"
    REASONING_LLM_ENABLED: bool = True
    REASONING_TIMEOUT_SECONDS: float = 20.0
    GROQ_NEGOTIATION_MODEL: str = "llama-3.1-8b-instant"
    NEGOTIATION_LLM_ENABLED: bool = True
    NEGOTIATION_TIMEOUT_SECONDS: float = 20.0

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
