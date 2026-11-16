from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(os.getenv("PROJECT_ROOT", Path.cwd()))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT / ".env", Path.cwd() / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = Field(default="development", alias="APP_ENV")
    api_port: int = Field(default=8000, alias="API_PORT")

    database_url: str = Field(
        default="postgresql+psycopg://automatic:automatic@localhost:5432/automatic",
        alias="DATABASE_URL",
    )

    jwt_secret: str = Field(
        default="dev-secret-change-me-please-32-chars-minimum",
        alias="JWT_SECRET",
    )
    jwt_expire_minutes: int = Field(default=10080, alias="JWT_EXPIRE_MINUTES")
    cors_origins: str = Field(
        default=(
            "http://localhost:8081,http://localhost:19006,"
            "http://localhost:5173,http://localhost:4173"
        ),
        alias="CORS_ORIGINS",
    )

    llm_provider: str = Field(default="fake", alias="LLM_PROVIDER")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")
    google_cloud_project: str = Field(default="", alias="GOOGLE_CLOUD_PROJECT")
    google_cloud_location: str = Field(default="global", alias="GOOGLE_CLOUD_LOCATION")
    gemini_model: str = Field(default="gemini-3.5-flash-lite", alias="GEMINI_MODEL")
    gemini_max_output_tokens: int = Field(default=512, alias="GEMINI_MAX_OUTPUT_TOKENS")
    gemini_max_tool_calls: int = Field(default=4, alias="GEMINI_MAX_TOOL_CALLS")
    # ReAct loop budget: think → act → observe, then answer.
    agent_max_steps: int = Field(default=5, alias="AGENT_MAX_STEPS")
    gemini_temperature: float = Field(default=0.0, alias="GEMINI_TEMPERATURE")
    agent_max_answer_chars: int = Field(default=220, alias="AGENT_MAX_ANSWER_CHARS")
    llm_timeout_seconds: int = Field(default=20, alias="LLM_TIMEOUT_SECONDS")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    datasets_dir: Path = Field(
        default=Path(os.getenv("DATASETS_DIR", Path.cwd() / "datasets")),
        alias="DATASETS_DIR",
    )
    demo_mode: bool = Field(default=True, alias="EXPO_PUBLIC_DEMO_MODE")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_test(self) -> bool:
        return self.app_env.lower() in {"test", "testing", "ci"}

    @property
    def gemini_enabled(self) -> bool:
        return self.llm_provider.lower() == "gemini" and bool(self.google_cloud_project)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
