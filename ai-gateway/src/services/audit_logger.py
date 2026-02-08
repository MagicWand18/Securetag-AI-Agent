import asyncio
import logging
import json
from src.services.db import get_pool
from src.models.schemas import GatewayLogEntry, PiiIncident

logger = logging.getLogger(__name__)


async def log_request(entry: GatewayLogEntry) -> str | None:
    """
    Inserta un registro de log de forma asincrona (fire-and-forget).
    Retorna el ID del log creado o None si falla.
    """
    try:
        pool = await get_pool()
        row = await pool.fetchrow(
            """INSERT INTO securetag.ai_gateway_log
               (tenant_id, api_key_id, request_model, request_provider,
                prompt_hash, prompt_encrypted, prompt_tokens, completion_tokens,
                total_tokens, cost_usd, credits_charged, latency_ms, status,
                pii_detected, secrets_detected, injection_score)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
               RETURNING id""",
            entry.tenant_id,
            entry.api_key_id,
            entry.request_model,
            entry.request_provider,
            entry.prompt_hash,
            entry.prompt_encrypted,
            entry.prompt_tokens,
            entry.completion_tokens,
            entry.total_tokens,
            entry.cost_usd,
            entry.credits_charged,
            entry.latency_ms,
            entry.status.value,
            json.dumps(entry.pii_detected) if entry.pii_detected else None,
            json.dumps(entry.secrets_detected) if entry.secrets_detected else None,
            entry.injection_score,
        )
        log_id = str(row["id"])
        logger.debug(f"Log registrado: {log_id} status={entry.status.value}")
        return log_id
    except Exception as e:
        logger.error(f"Error al registrar log: {e}")
        return None


async def log_pii_incidents(incidents: list[PiiIncident]) -> None:
    """Inserta incidentes PII en batch."""
    if not incidents:
        return

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.executemany(
                """INSERT INTO securetag.ai_gateway_pii_incident
                   (log_id, tenant_id, entity_type, action_taken, confidence)
                   VALUES ($1::uuid, $2, $3, $4, $5)""",
                [
                    (i.log_id, i.tenant_id, i.entity_type,
                     i.action_taken, i.confidence)
                    for i in incidents
                ],
            )
        logger.debug(f"Registrados {len(incidents)} incidentes PII")
    except Exception as e:
        logger.error(f"Error al registrar incidentes PII: {e}")


def fire_and_forget_log(entry: GatewayLogEntry) -> None:
    """Lanza el log de forma asincrona sin esperar resultado."""
    asyncio.create_task(_safe_log(entry))


def fire_and_forget_log_with_pii(
    entry: GatewayLogEntry, pii_incidents: list[PiiIncident]
) -> None:
    """
    Lanza log + PII incidents de forma asincrona.
    Encadena: log_request() → obtiene log_id → log_pii_incidents() con log_id real.
    """
    asyncio.create_task(_safe_log_with_pii(entry, pii_incidents))


async def _safe_log(entry: GatewayLogEntry) -> None:
    """Wrapper seguro para logging asincrono."""
    try:
        await log_request(entry)
    except Exception as e:
        logger.error(f"Error en fire-and-forget log: {e}")


async def _safe_log_with_pii(
    entry: GatewayLogEntry, pii_incidents: list[PiiIncident]
) -> None:
    """Wrapper seguro para logging asincrono con PII incidents."""
    try:
        log_id = await log_request(entry)
        if log_id and pii_incidents:
            # Asignar el log_id real a cada incidente
            for incident in pii_incidents:
                incident.log_id = log_id
            await log_pii_incidents(pii_incidents)
    except Exception as e:
        logger.error(f"Error en fire-and-forget log con PII: {e}")
