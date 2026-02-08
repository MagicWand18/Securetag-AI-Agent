import asyncpg
import logging
from src.config.settings import get_settings

logger = logging.getLogger(__name__)

# Pool global de conexiones
_pool: asyncpg.Pool | None = None


def _build_dsn() -> str:
    """Convierte DATABASE_URL de formato pg:// a postgresql:// para asyncpg."""
    dsn = get_settings().database_url
    if dsn.startswith("postgres://"):
        dsn = dsn.replace("postgres://", "postgresql://", 1)
    return dsn


async def get_pool() -> asyncpg.Pool:
    """Obtiene o crea el pool de conexiones."""
    global _pool
    if _pool is None:
        dsn = _build_dsn()
        _pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=2,
            max_size=10,
            command_timeout=30,
        )
        logger.info("Pool de conexiones PostgreSQL creado")
    return _pool


async def close_pool():
    """Cierra el pool de conexiones."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Pool de conexiones PostgreSQL cerrado")


async def fetch_one(query: str, *args) -> asyncpg.Record | None:
    """Ejecuta query y retorna un registro o None."""
    pool = await get_pool()
    return await pool.fetchrow(query, *args)


async def fetch_all(query: str, *args) -> list[asyncpg.Record]:
    """Ejecuta query y retorna lista de registros."""
    pool = await get_pool()
    return await pool.fetch(query, *args)


async def execute(query: str, *args) -> str:
    """Ejecuta query sin retornar registros."""
    pool = await get_pool()
    return await pool.execute(query, *args)
