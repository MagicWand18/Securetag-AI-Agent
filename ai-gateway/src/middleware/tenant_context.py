import json
import logging
import time
from src.services.db import fetch_one
from src.services.redis_client import get_redis
from src.services.encryption import decrypt_value
from src.models.schemas import TenantGatewayConfig, KeyConfig
from src.config.settings import get_settings

logger = logging.getLogger(__name__)

# Cache en memoria con TTL
_config_cache: dict[str, tuple[TenantGatewayConfig, float]] = {}
_key_config_cache: dict[str, tuple[KeyConfig | None, float]] = {}


async def get_tenant_config(tenant_id: str) -> TenantGatewayConfig:
    """
    Carga la config del AI Gateway para un tenant.
    Cache in-memory con TTL de 60s.
    """
    settings = get_settings()
    now = time.time()

    # Revisar cache
    if tenant_id in _config_cache:
        config, cached_at = _config_cache[tenant_id]
        if now - cached_at < settings.config_cache_ttl:
            return config

    # Query a DB
    row = await fetch_one(
        """SELECT tenant_id, is_enabled, allowed_models, blocked_models,
                  max_tokens_per_request, max_requests_per_minute,
                  pii_action, pii_entities, prompt_injection_enabled,
                  secrets_scanning_enabled, output_scanning_enabled,
                  prompt_logging_mode
           FROM securetag.ai_gateway_config
           WHERE tenant_id = $1""",
        tenant_id
    )

    if row is None:
        # Retornar config por defecto si no existe
        config = TenantGatewayConfig(tenant_id=tenant_id)
    else:
        config = TenantGatewayConfig(
            tenant_id=row["tenant_id"],
            is_enabled=row["is_enabled"],
            allowed_models=json.loads(row["allowed_models"])
                if isinstance(row["allowed_models"], str)
                else row["allowed_models"],
            blocked_models=json.loads(row["blocked_models"])
                if isinstance(row["blocked_models"], str)
                else row["blocked_models"],
            max_tokens_per_request=row["max_tokens_per_request"],
            max_requests_per_minute=row["max_requests_per_minute"],
            pii_action=row["pii_action"],
            pii_entities=json.loads(row["pii_entities"])
                if isinstance(row["pii_entities"], str)
                else row["pii_entities"],
            prompt_injection_enabled=row["prompt_injection_enabled"],
            secrets_scanning_enabled=row["secrets_scanning_enabled"],
            output_scanning_enabled=row["output_scanning_enabled"],
            prompt_logging_mode=row["prompt_logging_mode"],
        )

    _config_cache[tenant_id] = (config, now)
    return config


async def get_key_config(api_key_id: str) -> KeyConfig | None:
    """
    Carga la config de AI Gateway para una API key especifica.
    Incluye BYOK provider keys desencriptadas.
    """
    settings = get_settings()
    now = time.time()

    if api_key_id in _key_config_cache:
        config, cached_at = _key_config_cache[api_key_id]
        if now - cached_at < settings.config_cache_ttl:
            return config

    row = await fetch_one(
        """SELECT id, tenant_id, api_key_id, key_alias,
                  model_access, rate_limit_rpm,
                  provider_keys_encrypted, is_active
           FROM securetag.ai_gateway_key_config
           WHERE api_key_id = $1::uuid AND is_active = true""",
        api_key_id
    )

    if row is None:
        _key_config_cache[api_key_id] = (None, now)
        return None

    # Desencriptar provider keys si existen
    provider_keys = None
    if row["provider_keys_encrypted"]:
        raw = row["provider_keys_encrypted"]
        if isinstance(raw, str):
            raw = json.loads(raw)
        provider_keys = {}
        for provider, encrypted_key in raw.items():
            try:
                provider_keys[provider] = decrypt_value(encrypted_key)
            except Exception as e:
                logger.error(
                    f"Error desencriptando key de {provider} "
                    f"para api_key {api_key_id}: {e}"
                )

    config = KeyConfig(
        id=str(row["id"]),
        tenant_id=row["tenant_id"],
        api_key_id=str(row["api_key_id"]),
        key_alias=row["key_alias"],
        model_access=json.loads(row["model_access"])
            if isinstance(row["model_access"], str)
            else row["model_access"],
        rate_limit_rpm=row["rate_limit_rpm"],
        provider_keys_encrypted=provider_keys,
        is_active=row["is_active"],
    )

    _key_config_cache[api_key_id] = (config, now)
    return config


def invalidate_config_cache(tenant_id: str | None = None) -> None:
    """Invalida el cache de configuracion."""
    if tenant_id:
        _config_cache.pop(tenant_id, None)
    else:
        _config_cache.clear()
    _key_config_cache.clear()
