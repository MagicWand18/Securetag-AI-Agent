import hashlib
import logging
import time
from fastapi import HTTPException

from src.config.settings import get_settings
from src.models.schemas import (
    AuthContext, ProxyRequest, TenantGatewayConfig, KeyConfig,
    GatewayLogEntry, LogStatus, PiiAction, PiiIncident
)
from src.services.credits import (
    check_and_reserve_credits, charge_inspection_fee, get_balance
)
from src.services.audit_logger import fire_and_forget_log, fire_and_forget_log_with_pii
from src.services.encryption import hash_prompt, encrypt_value
from src.middleware.tenant_context import get_tenant_config, get_key_config
from src.middleware.rate_limit import check_rate_limit
from src.pipeline.llm_proxy import call_llm
from src.pipeline.presidio_scan import scan_messages
from src.pipeline.llm_guard_scan import scan_input, scan_output

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
    4. LLM Guard input (injection + secrets)
    5. Presidio PII scan (redact/block/log_only)
    6. LiteLLM call
    7. LLM Guard output (PII + secrets)
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

    # 4. LLM Guard input scan (injection + secrets)
    raw_messages_for_guard = [m.model_dump() for m in request.messages]
    guard_result = scan_input(
        messages=raw_messages_for_guard,
        injection_enabled=config.prompt_injection_enabled,
        secrets_enabled=config.secrets_scanning_enabled,
        injection_threshold=settings.injection_score_threshold,
    )

    if guard_result.blocked:
        await charge_inspection_fee(
            auth.tenant_id, settings.credit_cost_proxy, settings.credit_cost_blocked
        )

        if guard_result.block_reason == "injection":
            _log_blocked(auth, request, LogStatus.BLOCKED_INJECTION, start_time,
                         injection_score=guard_result.injection_score)
            raise HTTPException(status_code=403, detail={
                "error": "Prompt injection detected",
                "score": guard_result.injection_score,
                "patterns": guard_result.injection_patterns,
            })

        if guard_result.block_reason == "secrets":
            _log_blocked(auth, request, LogStatus.BLOCKED_SECRETS, start_time,
                         secrets_detected=[{"type": s["type"]} for s in guard_result.secrets])
            raise HTTPException(status_code=400, detail={
                "error": "Secrets/credentials detected in request",
                "count": len(guard_result.secrets),
                "types": [s["type"] for s in guard_result.secrets],
            })

    # 5. Presidio PII scan
    raw_messages = [m.model_dump() for m in request.messages]
    pii_result = scan_messages(
        messages=raw_messages,
        pii_action=config.pii_action,
        pii_entities=config.pii_entities,
        tenant_id=auth.tenant_id,
    )

    pii_incidents_data = []
    if pii_result.pii_found:
        # Preparar modelos PiiIncident (log_id se asigna despues en fire_and_forget)
        pii_incidents_data = [
            PiiIncident(
                log_id="pending",
                tenant_id=auth.tenant_id,
                entity_type=inc["entity_type"],
                action_taken=inc["action"],
                confidence=inc["score"],
            )
            for inc in pii_result.incidents
        ]

        if config.pii_action == PiiAction.BLOCK:
            # Reembolso parcial y bloqueo
            await charge_inspection_fee(
                auth.tenant_id,
                settings.credit_cost_proxy,
                settings.credit_cost_blocked,
            )
            _log_blocked(
                auth, request, LogStatus.BLOCKED_PII, start_time,
                pii_incidents=pii_incidents_data,
                pii_detected=pii_result.incidents,
            )
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "PII detected in request",
                    "entities": [
                        {"type": inc["entity_type"], "score": inc["score"]}
                        for inc in pii_result.incidents
                    ],
                }
            )

    sanitized_messages = pii_result.sanitized_messages

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
        _log_error(
            auth, request, start_time, str(e),
            pii_incidents=pii_incidents_data if pii_result.pii_found else None,
            pii_detected=pii_result.incidents if pii_result.pii_found else None,
        )
        raise HTTPException(status_code=502, detail=f"LLM provider error: {e}")

    # 8. LLM Guard output scan (PII + secrets en respuesta)
    output_incidents = []
    if config.output_scanning_enabled and llm_response.get("choices"):
        output_text = llm_response["choices"][0].get("message", {}).get("content", "")
        if output_text:
            output_result = scan_output(
                text=output_text,
                pii_entities=config.pii_entities,
                secrets_enabled=config.secrets_scanning_enabled,
                tenant_id=auth.tenant_id,
            )
            if output_result.was_modified:
                llm_response["choices"][0]["message"]["content"] = output_result.sanitized_text
            output_incidents = output_result.pii_incidents + output_result.secrets_incidents

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
        pii_detected=pii_result.incidents if pii_result.pii_found else None,
        injection_score=guard_result.injection_score,
        secrets_detected=output_incidents if output_incidents else None,
    )

    if pii_incidents_data:
        fire_and_forget_log_with_pii(log_entry, pii_incidents_data)
    else:
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
    status: LogStatus, start_time: float,
    pii_incidents: list[PiiIncident] | None = None,
    pii_detected: list[dict] | None = None,
    injection_score: float | None = None,
    secrets_detected: list[dict] | None = None,
) -> None:
    """Log para requests bloqueados, incluyendo PII/injection/secrets data si aplica."""
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
        pii_detected=pii_detected,
        injection_score=injection_score,
        secrets_detected=secrets_detected,
    )
    if pii_incidents:
        fire_and_forget_log_with_pii(entry, pii_incidents)
    else:
        fire_and_forget_log(entry)


def _log_error(
    auth: AuthContext, request: ProxyRequest,
    start_time: float, error_msg: str,
    pii_incidents: list[PiiIncident] | None = None,
    pii_detected: list[dict] | None = None,
    injection_score: float | None = None,
    secrets_detected: list[dict] | None = None,
) -> None:
    """Log para errores de LLM, incluyendo PII/injection/secrets data si aplica."""
    latency_ms = int((time.time() - start_time) * 1000)
    entry = GatewayLogEntry(
        tenant_id=auth.tenant_id,
        api_key_id=auth.api_key_id,
        request_model=request.model,
        request_provider=_get_provider(request.model),
        credits_charged=0,
        latency_ms=latency_ms,
        status=LogStatus.ERROR,
        pii_detected=pii_detected,
        injection_score=injection_score,
        secrets_detected=secrets_detected,
    )
    if pii_incidents:
        fire_and_forget_log_with_pii(entry, pii_incidents)
    else:
        fire_and_forget_log(entry)
