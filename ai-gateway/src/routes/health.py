import logging
from fastapi import APIRouter
from src.services.db import get_pool
from src.services.redis_client import get_redis

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/healthz")
async def healthz():
    """Health check del AI Gateway."""
    checks = {"status": "ok", "service": "ai-gateway"}

    # Verificar PostgreSQL
    try:
        pool = await get_pool()
        await pool.fetchval("SELECT 1")
        checks["db"] = "ok"
    except Exception as e:
        checks["db"] = f"error: {e}"
        checks["status"] = "degraded"

    # Verificar Redis
    try:
        redis = get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        checks["status"] = "degraded"

    status_code = 200 if checks["status"] == "ok" else 503
    return checks
