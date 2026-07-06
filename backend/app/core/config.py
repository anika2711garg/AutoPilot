from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Autopilot"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_USER: str = "autopilot"
    POSTGRES_PASSWORD: str = "autopilot_password"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "autopilot_db"
    
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"

settings = Settings()
