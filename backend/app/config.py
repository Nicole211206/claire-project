from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    claire_token: str = ""
    database_url: str = "sqlite:///./claire.db"
    uploads_dir: str = "./uploads"
    port: int = 18792
    hostaway_account_id: str = ""
    hostaway_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
