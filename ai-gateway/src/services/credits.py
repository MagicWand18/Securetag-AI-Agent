import logging
from src.services.db import fetch_one, execute

logger = logging.getLogger(__name__)


async def check_and_reserve_credits(tenant_id: str, amount: float) -> bool:
    """
    Verifica saldo y reserva creditos de forma atomica.
    Retorna True si se reservaron exitosamente.
    """
    result = await fetch_one(
        """UPDATE securetag.tenant
           SET credits_balance = credits_balance - $2
           WHERE id = $1 AND credits_balance >= $2
           RETURNING credits_balance""",
        tenant_id, amount
    )
    if result is None:
        logger.warning(
            f"Creditos insuficientes para tenant {tenant_id}: requerido {amount}"
        )
        return False

    logger.info(
        f"Reservados {amount} creditos de tenant {tenant_id}. "
        f"Nuevo saldo: {result['credits_balance']}"
    )
    return True


async def refund_credits(tenant_id: str, amount: float, reason: str) -> bool:
    """Reembolsa creditos al tenant."""
    result = await fetch_one(
        """UPDATE securetag.tenant
           SET credits_balance = credits_balance + $2
           WHERE id = $1
           RETURNING credits_balance""",
        tenant_id, amount
    )
    if result is None:
        logger.warning(f"No se pudo reembolsar {amount} a tenant {tenant_id}")
        return False

    logger.info(
        f"Reembolsados {amount} creditos a tenant {tenant_id} ({reason}). "
        f"Nuevo saldo: {result['credits_balance']}"
    )
    return True


async def charge_inspection_fee(
    tenant_id: str, proxy_cost: float, inspection_fee: float
) -> None:
    """
    Reembolsa el costo del proxy y cobra solo el fee de inspeccion.
    Se usa cuando el request es bloqueado por guards.
    """
    refund_amount = proxy_cost - inspection_fee
    if refund_amount > 0:
        await refund_credits(
            tenant_id, refund_amount, "Reembolso parcial por request bloqueado"
        )


async def get_balance(tenant_id: str) -> float:
    """Obtiene el saldo de creditos del tenant."""
    result = await fetch_one(
        "SELECT credits_balance FROM securetag.tenant WHERE id = $1",
        tenant_id
    )
    if result is None:
        return 0.0
    return float(result["credits_balance"] or 0)
