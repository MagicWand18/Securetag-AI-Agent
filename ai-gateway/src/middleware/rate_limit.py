import logging
from fastapi import HTTPException
from src.services.redis_client import get_redis
from src.config.settings import get_settings

logger = logging.getLogger(__name__)


async def check_rate_limit(
    tenant_id: str,
    api_key_id: str,
    key_rpm: int | None = None,
    tenant_rpm: int | None = None,
) -> None:
    """
    Rate limiting basado en Redis con ventana deslizante de 60s.
    Verifica limites por API key y por tenant.
    """
    settings = get_settings()
    redis = get_redis()

    key_limit = key_rpm or settings.default_rpm_per_key
    tenant_limit = tenant_rpm or settings.default_rpm_per_tenant

    # Rate limit por API key
    key_counter = f"ai_gw:rl:key:{api_key_id}"
    key_count = await redis.incr(key_counter)
    if key_count == 1:
        await redis.expire(key_counter, 60)

    if key_count > key_limit:
        logger.warning(
            f"Rate limit por key excedido: key={api_key_id} "
            f"count={key_count}/{key_limit}"
        )
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {key_limit} requests per minute per key"
        )

    # Rate limit por tenant
    tenant_counter = f"ai_gw:rl:tenant:{tenant_id}"
    tenant_count = await redis.incr(tenant_counter)
    if tenant_count == 1:
        await redis.expire(tenant_counter, 60)

    if tenant_count > tenant_limit:
        logger.warning(
            f"Rate limit por tenant excedido: tenant={tenant_id} "
            f"count={tenant_count}/{tenant_limit}"
        )
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {tenant_limit} requests per minute per tenant"
        )
