from pydantic import BaseModel, Field, field_validator
from typing import Optional
from enum import Enum


# --- Request/Response del proxy ---

VALID_ROLES = {"user", "assistant", "system", "tool", "function"}


class ChatMessage(BaseModel):
    role: str
    content: str
    name: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Invalid role '{v}'. Must be one of: {', '.join(sorted(VALID_ROLES))}")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if len(v) > 100_000:
            raise ValueError("Message content exceeds 100,000 character limit")
        return v


class ProxyRequest(BaseModel):
    """Request OpenAI-compatible que recibe el gateway."""
    model: str
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=200)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=128_000)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    stream: bool = False
    # BYOK: el developer puede enviar su key directamente
    provider_key: Optional[str] = None


class ProxyResponse(BaseModel):
    """Wrapper de respuesta del gateway."""
    id: str
    object: str = "chat.completion"
    model: str
    choices: list[dict]
    usage: Optional[dict] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


# --- Auth context ---

class AuthContext(BaseModel):
    """Contexto de autenticacion del request."""
    tenant_id: str
    api_key_id: str
    user_id: Optional[str] = None
    key_hash: str
    ai_gateway_enabled: bool = False
    is_banned: bool = False


# --- Tenant config ---

class PiiAction(str, Enum):
    REDACT = "redact"
    BLOCK = "block"
    LOG_ONLY = "log_only"


class LoggingMode(str, Enum):
    HASH = "hash"
    ENCRYPTED = "encrypted"


class TenantGatewayConfig(BaseModel):
    """Config de AI Shield para un tenant."""
    tenant_id: str
    is_enabled: bool = False
    allowed_models: list[str] = ["*"]
    blocked_models: list[str] = []
    max_tokens_per_request: int = 4096
    max_requests_per_minute: int = 60
    pii_action: PiiAction = PiiAction.REDACT
    pii_entities: list[str] = [
        "CREDIT_CARD", "EMAIL_ADDRESS", "PHONE_NUMBER",
        "PERSON", "US_SSN", "IP_ADDRESS"
    ]
    prompt_injection_enabled: bool = True
    secrets_scanning_enabled: bool = True
    output_scanning_enabled: bool = True
    prompt_logging_mode: LoggingMode = LoggingMode.HASH


# --- Key config ---

class KeyConfig(BaseModel):
    """Config de AI Gateway para una API key especifica."""
    id: str
    tenant_id: str
    api_key_id: str
    key_alias: str
    model_access: list[str] = ["*"]
    rate_limit_rpm: int = 30
    provider_keys_encrypted: Optional[dict] = None
    is_active: bool = True


# --- Log status ---

class LogStatus(str, Enum):
    SUCCESS = "success"
    BLOCKED_PII = "blocked_pii"
    BLOCKED_INJECTION = "blocked_injection"
    BLOCKED_SECRETS = "blocked_secrets"
    BLOCKED_POLICY = "blocked_policy"
    BLOCKED_CREDITS = "blocked_credits"
    ERROR = "error"


class GatewayLogEntry(BaseModel):
    """Entrada de log del gateway."""
    tenant_id: str
    api_key_id: Optional[str] = None
    request_model: str
    request_provider: str
    prompt_hash: Optional[str] = None
    prompt_encrypted: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost_usd: Optional[float] = None
    credits_charged: float = 0.0
    latency_ms: Optional[int] = None
    status: LogStatus = LogStatus.SUCCESS
    pii_detected: Optional[list[dict]] = None
    secrets_detected: Optional[list[dict]] = None
    injection_score: Optional[float] = None


class PiiIncident(BaseModel):
    """Incidente PII detectado."""
    log_id: str
    tenant_id: str
    entity_type: str
    action_taken: str  # redacted, blocked, logged
    confidence: Optional[float] = None
