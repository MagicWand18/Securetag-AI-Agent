import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

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
    docs_url="/docs",
    redoc_url=None,
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error no manejado: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# Registrar routers
app.include_router(proxy.router, tags=["Proxy"])
app.include_router(health.router, tags=["Health"])
app.include_router(models.router, tags=["Models"])
