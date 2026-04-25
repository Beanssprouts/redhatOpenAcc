from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "FastAPI Backend"
    APP_VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    NEMOCLAW_BASE_URL: str = ""   # e.g. https://nemoclaw-80a5b4.brevlab.com
    NEMOCLAW_API_KEY: str = "nemoclaw"  # Brev default; change if yours differs
    NEMOCLAW_MODEL: str = "nemoclaw"

    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""  # service role key — NOT the publishable one
    AUDIO_BUCKET: str = "audio"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
