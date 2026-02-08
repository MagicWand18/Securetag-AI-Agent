import hashlib
import logging
from fastapi import Request, HTTPException
from src.services.db import fetch_one
from src.models.schemas import AuthContext

logger = logging.getLogger(__name__)


def hash_api_key(key: str) -> str:
    """Hash SHA-256 identico al de auth.ts de Node.js."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


async def authenticate_request(request: Request) -> AuthContext:
    """
    Autentica el request via X-API-Key.
    Replica la logica de src/middleware/auth.ts del core-api.
    """
    api_key = request.headers.get("x-api-key")
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")

    key_hash = hash_api_key(api_key)

    # Query identica a auth.ts: buscar key + tenant + user + permisos AI
    row = await fetch_one(
        """SELECT ak.id as api_key_id, ak.tenant_id, ak.user_id,
                  ak.expires_at, ak.is_active,
                  ak.ai_gateway_enabled as key_ai_enabled,
                  t.name as tenant_name,
                  t.ai_gateway_enabled as tenant_ai_enabled
           FROM securetag.api_key ak
           JOIN securetag.tenant t ON ak.tenant_id = t.id
           WHERE ak.key_hash = $1""",
        key_hash
    )

    if row is None:
        logger.warning(f"API Key invalida: hash={key_hash[:12]}...")
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Verificar key activa
    if not row["is_active"]:
        raise HTTPException(
            status_code=403, detail="API Key has been revoked"
        )

    # Verificar expiracion
    if row["expires_at"] is not None:
        from datetime import datetime, timezone
        if row["expires_at"] < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="API key expired")

    # Verificar permisos de AI Gateway
    if not row["tenant_ai_enabled"]:
        raise HTTPException(
            status_code=403,
            detail="AI Shield is not enabled for this tenant"
        )

    if not row["key_ai_enabled"]:
        raise HTTPException(
            status_code=403,
            detail="AI Shield is not enabled for this API key"
        )

    # Verificar bans via security_ban (check simplificado)
    ban_row = await fetch_one(
        """SELECT value FROM securetag.security_ban
           WHERE is_banned = true
             AND ((type = 'tenant' AND value = $1)
                  OR (type = 'api_key' AND value = $2))
             AND (banned_until IS NULL OR banned_until > now())
           LIMIT 1""",
        row["tenant_id"], key_hash
    )
    if ban_row is not None:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Banned due to security violations."
        )

    return AuthContext(
        tenant_id=row["tenant_id"],
        api_key_id=str(row["api_key_id"]),
        user_id=str(row["user_id"]) if row["user_id"] else None,
        key_hash=key_hash,
        ai_gateway_enabled=True,
        is_banned=False,
    )
