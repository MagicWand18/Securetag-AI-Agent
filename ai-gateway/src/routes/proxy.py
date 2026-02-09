import asyncio
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from src.models.schemas import ProxyRequest
from src.middleware.auth import authenticate_request
from src.pipeline.orchestrator import process_request, prepare_stream, generate_stream

logger = logging.getLogger(__name__)

router = APIRouter()

# Limite de conexiones SSE concurrentes (proteccion DoS)
MAX_CONCURRENT_STREAMS = 50
_stream_semaphore = asyncio.Semaphore(MAX_CONCURRENT_STREAMS)


async def _guarded_stream(ctx: dict) -> AsyncGenerator[str, None]:
    """Wrapper que libera el semaphore al terminar el stream."""
    try:
        async for chunk in generate_stream(ctx):
            yield chunk
    finally:
        _stream_semaphore.release()


@router.post("/v1/chat/completions")
async def chat_completions(request: Request, body: ProxyRequest):
    """
    Proxy principal OpenAI-compatible.
    Autentica, valida creditos, escanea y proxea al LLM.
    Soporta streaming SSE (stream: true) y non-streaming (stream: false).
    """
    # Autenticar
    auth = await authenticate_request(request)

    if body.stream:
        # Adquirir slot de streaming (proteccion DoS)
        try:
            await asyncio.wait_for(_stream_semaphore.acquire(), timeout=5.0)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=503,
                detail="Too many concurrent streaming connections",
            )

        try:
            # Pre-checks (auth, credits, guards, PII) — lanza HTTPException si falla
            ctx = await prepare_stream(auth, body)
        except Exception:
            _stream_semaphore.release()
            raise

        # Stream SSE — _guarded_stream libera el semaphore al terminar
        return StreamingResponse(
            _guarded_stream(ctx),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # Non-streaming: pipeline original
    result = await process_request(auth, body)
    return result
