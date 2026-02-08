import logging
from fastapi import APIRouter, Request
from src.models.schemas import ProxyRequest
from src.middleware.auth import authenticate_request
from src.pipeline.orchestrator import process_request

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/v1/chat/completions")
async def chat_completions(request: Request, body: ProxyRequest):
    """
    Proxy principal OpenAI-compatible.
    Autentica, valida creditos, escanea y proxea al LLM.
    """
    # Autenticar
    auth = await authenticate_request(request)

    # Procesar via pipeline
    result = await process_request(auth, body)

    return result
