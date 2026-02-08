import redis.asyncio as aioredis
import logging
from src.config.settings import get_settings

logger = logging.getLogger(__name__)

# Singleton Redis
_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    """Obtiene o crea la conexion Redis."""
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = aioredis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password,
            decode_responses=True,
        )
        logger.info("Conexion Redis creada")
    return _redis


async def close_redis():
    """Cierra la conexion Redis."""
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
        logger.info("Conexion Redis cerrada")
