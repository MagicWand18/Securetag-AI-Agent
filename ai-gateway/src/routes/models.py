import logging
from fastapi import APIRouter, Request
from src.middleware.auth import authenticate_request
from src.middleware.tenant_context import get_tenant_config

logger = logging.getLogger(__name__)

router = APIRouter()

# Modelos soportados por LiteLLM (subset mas comun)
AVAILABLE_MODELS = [
    {"id": "gpt-4o", "provider": "openai"},
    {"id": "gpt-4o-mini", "provider": "openai"},
    {"id": "gpt-4-turbo", "provider": "openai"},
    {"id": "claude-sonnet-4-5-20250929", "provider": "anthropic"},
    {"id": "claude-haiku-4-5-20251001", "provider": "anthropic"},
    {"id": "gemini-2.0-flash", "provider": "google"},
    {"id": "gemini-1.5-pro", "provider": "google"},
]


@router.get("/v1/models")
async def list_models(request: Request):
    """Lista modelos permitidos para el tenant autenticado."""
    auth = await authenticate_request(request)
    config = await get_tenant_config(auth.tenant_id)

    # Filtrar segun config del tenant
    models = []
    for m in AVAILABLE_MODELS:
        model_id = m["id"]
        # Excluir bloqueados
        if model_id in config.blocked_models:
            continue
        # Si allowed_models no es wildcard, filtrar
        if "*" not in config.allowed_models and model_id not in config.allowed_models:
            continue
        models.append(m)

    return {
        "object": "list",
        "data": [
            {
                "id": m["id"],
                "object": "model",
                "owned_by": m["provider"],
            }
            for m in models
        ],
    }
