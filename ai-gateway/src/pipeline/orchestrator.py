import hashlib
import logging
import time
from fastapi import HTTPException

from src.config.settings import get_settings
from src.models.schemas import (
    AuthContext, ProxyRequest, TenantGatewayConfig, KeyConfig,
    GatewayLogEntry, LogStatus
)
from src.services.credits import (
    check_and_reserve_credits, charge_inspection_fee, get_balance
)
from src.services.audit_logger import fire_and_forget_log
from src.services.encryption import hash_prompt, encrypt_value
from src.middleware.tenant_context import get_tenant_config, get_key_config
from src.middleware.rate_limit import check_rate_limit
from src.pipeline.llm_proxy import call_llm

logger = logging.getLogger(__name__)


async def process_request(
    auth: AuthContext,
    request: ProxyRequest,
) -> dict:
    """
    Pipeline principal del AI Gateway:
    1. Config + rate limit
    2. Credits check (upfront)
    3. Model validation
    4. LLM Guard input (stub Fase 3)
    5. Presidio PII (stub Fase 2)
    6. LiteLLM call
    7. LLM Guard output (stub Fase 3)
    8. Credits confirm
    9. Async log
    """
    settings = get_settings()
    start_time = time.time()

    # 1. Cargar config del tenant y key
    config = await get_tenant_config(auth.tenant_id)
    key_config = await get_key_config(auth.api_key_id)

    # Rate limit
    await check_rate_limit(
        tenant_id=auth.tenant_id,
        api_key_id=auth.api_key_id,
        key_rpm=key_config.rate_limit_rpm if key_config else None,
        tenant_rpm=config.max_requests_per_minute,
    )

    # Streaming no soportado en MVP
    if request.stream:
        raise HTTPException(
            status_code=400,
            detail="Streaming is not supported yet. Use stream: false"
        )

    # 2. Credits check (upfront)
    has_credits = await check_and_reserve_credits(
        auth.tenant_id, settings.credit_cost_proxy
    )
    if not has_credits:
        balance = await get_balance(auth.tenant_id)
        _log_blocked(auth, request, LogStatus.BLOCKED_CREDITS, start_time)
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Insufficient credits",
                "required": settings.credit_cost_proxy,
                "balance": balance,
            }
        )

    # 3. Validar modelo
    _validate_model(request.model, config)

    # 4. LLM Guard input scan (stub - Fase 3)
    # TODO: Fase 3 - PromptInjectionScanner + SecretsScanner

    # 5. Presidio PII scan (stub - Fase 2)
    # TODO: Fase 2 - PII detection + redaction
    sanitized_messages = [m.model_dump() for m in request.messages]

    # 6. Resolver provider key (BYOK)
    provider_key = _resolve_provider_key(request, key_config)

    # 7. LiteLLM call
    try:
        llm_response = await call_llm(
            model=request.model,
            messages=sanitized_messages,
            api_key=provider_key,
            temperature=request.temperature,
            max_tokens=request.max_tokens or config.max_tokens_per_request,
            timeout=settings.llm_timeout_seconds,
        )
    except Exception as e:
        # Reembolsar creditos si LLM falla
        from src.services.credits import refund_credits
        await refund_credits(
            auth.tenant_id, settings.credit_cost_proxy, f"LLM error: {e}"
        )
        _log_error(auth, request, start_time, str(e))
        raise HTTPException(status_code=502, detail=f"LLM provider error: {e}")

    # 8. LLM Guard output scan (stub - Fase 3)
    # TODO: Fase 3 - output scanning

    # 9. Async log (fire-and-forget)
    latency_ms = int((time.time() - start_time) * 1000)
    prompt_text = " ".join(m.content for m in request.messages)

    log_entry = GatewayLogEntry(
        tenant_id=auth.tenant_id,
        api_key_id=auth.api_key_id,
        request_model=request.model,
        request_provider=_get_provider(request.model),
        prompt_hash=hash_prompt(prompt_text),
        prompt_encrypted=encrypt_value(prompt_text)
            if config.prompt_logging_mode.value == "encrypted" else None,
        prompt_tokens=llm_response.get("usage", {}).get("prompt_tokens"),
        completion_tokens=llm_response.get("usage", {}).get("completion_tokens"),
        total_tokens=llm_response.get("usage", {}).get("total_tokens"),
        cost_usd=llm_response.get("_hidden_params", {}).get("response_cost"),
        credits_charged=settings.credit_cost_proxy,
        latency_ms=latency_ms,
        status=LogStatus.SUCCESS,
    )
    fire_and_forget_log(log_entry)

    return llm_response


def _validate_model(model: str, config: TenantGatewayConfig) -> None:
    """Valida que el modelo solicitado esta permitido para el tenant."""
    # Verificar blocked_models
    if model in config.blocked_models:
        raise HTTPException(
            status_code=403,
            detail=f"Model '{model}' is blocked for this tenant"
        )

    # Verificar allowed_models (wildcard * permite todo)
    if "*" not in config.allowed_models and model not in config.allowed_models:
        raise HTTPException(
            status_code=403,
            detail=f"Model '{model}' is not in the allowed list"
        )


def _resolve_provider_key(
    request: ProxyRequest, key_config: KeyConfig | None
) -> str | None:
    """Resuelve la API key del provider LLM a usar."""
    # Prioridad 1: key enviada directamente en el request
    if request.provider_key:
        return request.provider_key

    # Prioridad 2: BYOK keys del key_config
    if key_config and key_config.provider_keys_encrypted:
        provider = _get_provider(request.model)
        return key_config.provider_keys_encrypted.get(provider)

    return None


def _get_provider(model: str) -> str:
    """Infiere el provider a partir del nombre del modelo."""
    model_lower = model.lower()
    if any(x in model_lower for x in ["gpt", "o1", "o3", "dall-e"]):
        return "openai"
    if any(x in model_lower for x in ["claude", "haiku", "sonnet", "opus"]):
        return "anthropic"
    if any(x in model_lower for x in ["gemini", "palm"]):
        return "google"
    if any(x in model_lower for x in ["llama", "mixtral", "mistral"]):
        return "together_ai"
    return "openai"  # Default


def _log_blocked(
    auth: AuthContext, request: ProxyRequest,
    status: LogStatus, start_time: float
) -> None:
    """Log para requests bloqueados."""
    latency_ms = int((time.time() - start_time) * 1000)
    settings = get_settings()
    entry = GatewayLogEntry(
        tenant_id=auth.tenant_id,
        api_key_id=auth.api_key_id,
        request_model=request.model,
        request_provider=_get_provider(request.model),
        credits_charged=settings.credit_cost_blocked
            if status != LogStatus.BLOCKED_CREDITS else 0,
        latency_ms=latency_ms,
        status=status,
    )
    fire_and_forget_log(entry)


def _log_error(
    auth: AuthContext, request: ProxyRequest,
    start_time: float, error_msg: str
) -> None:
    """Log para errores de LLM."""
    latency_ms = int((time.time() - start_time) * 1000)
    entry = GatewayLogEntry(
        tenant_id=auth.tenant_id,
        api_key_id=auth.api_key_id,
        request_model=request.model,
        request_provider=_get_provider(request.model),
        credits_charged=0,
        latency_ms=latency_ms,
        status=LogStatus.ERROR,
    )
    fire_and_forget_log(entry)
