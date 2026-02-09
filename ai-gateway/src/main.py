import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

from src.config.settings import get_settings
from src.services.db import get_pool, close_pool
from src.services.redis_client import close_redis
from src.routes import proxy, health, models

# Configurar logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai-gateway")

# Solo exponer Swagger docs si log_level es DEBUG (desarrollo)
_is_debug = settings.log_level.upper() == "DEBUG"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup y shutdown del gateway."""
    logger.info("Iniciando AI Gateway...")

    # Inicializar pool de DB
    await get_pool()
    logger.info("Pool de DB listo")

    yield

    # Cleanup
    logger.info("Cerrando AI Gateway...")
    await close_pool()
    await close_redis()
    logger.info("AI Gateway cerrado")


app = FastAPI(
    title="SecureTag AI Shield",
    description="AI Security Gateway - Proxy seguro para LLMs",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if _is_debug else None,
    redoc_url=None,
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Agrega security headers a todas las respuestas."""

    async def dispatch(self, request: StarletteRequest, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        return response


# Security headers (antes de CORS para que aplique a todas las responses)
app.add_middleware(SecurityHeadersMiddleware)

# CORS para Chat UI y clientes externos
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["X-API-Key", "Content-Type", "Authorization"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error no manejado: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


# Registrar routers
app.include_router(proxy.router, tags=["Proxy"])
app.include_router(health.router, tags=["Health"])
app.include_router(models.router, tags=["Models"])
