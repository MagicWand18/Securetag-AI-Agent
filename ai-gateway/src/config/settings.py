from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configuracion del AI Gateway via variables de entorno."""

    # Base de datos
    database_url: str = "postgres://securetag:securetagpwd@core-db:5432/securetag"

    # Redis
    redis_host: str = "core-redis"
    redis_port: int = 6379
    redis_password: str = "securetagredis"

    # Cifrado BYOK keys
    securetag_system_secret: str = "s3cur3t4g-syst3m-s3cr3t-2025"

    # Creditos
    credit_cost_proxy: float = 0.1
    credit_cost_blocked: float = 0.01

    # Rate limiting defaults
    default_rpm_per_key: int = 30
    default_rpm_per_tenant: int = 60

    # LLM proxy
    llm_timeout_seconds: int = 120

    # Pipeline
    injection_score_threshold: float = 0.8

    # Config cache TTL (segundos)
    config_cache_ttl: int = 60

    # Logging
    log_level: str = "INFO"

    model_config = {"env_prefix": "AI_GW_", "env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
