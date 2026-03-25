from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cashflow Decision Engine MVP"
    API_V1_STR: str = "/api/v1"
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./cashflow.db"

    class Config:
        case_sensitive = True

settings = Settings()
