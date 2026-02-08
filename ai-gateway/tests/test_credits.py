"""Tests para el servicio de creditos del AI Gateway."""
import pytest
from unittest.mock import patch, AsyncMock

from src.services.credits import (
    check_and_reserve_credits,
    refund_credits,
    charge_inspection_fee,
    get_balance,
)


class TestCheckAndReserveCredits:
    """Tests para la reserva upfront de creditos."""

    @pytest.mark.asyncio
    @patch("src.services.credits.fetch_one")
    async def test_sufficient_credits_reserves(self, mock_fetch):
        """Con saldo suficiente, reserva y retorna True."""
        mock_fetch.return_value = {"credits_balance": 9.9}
        result = await check_and_reserve_credits("tenant-a", 0.1)
        assert result is True
        # Verificar que el query usa atomic update
        call_args = mock_fetch.call_args
        assert "credits_balance - $2" in call_args[0][0]
        assert "credits_balance >= $2" in call_args[0][0]

    @pytest.mark.asyncio
    @patch("src.services.credits.fetch_one")
    async def test_insufficient_credits_returns_false(self, mock_fetch):
        """Con saldo insuficiente, retorna False."""
        mock_fetch.return_value = None  # UPDATE no matcheo (saldo < amount)
        result = await check_and_reserve_credits("tenant-a", 0.1)
        assert result is False

    @pytest.mark.asyncio
    @patch("src.services.credits.fetch_one")
    async def test_zero_balance_returns_false(self, mock_fetch):
        """Con saldo 0, retorna False."""
        mock_fetch.return_value = None
        result = await check_and_reserve_credits("tenant-a", 0.1)
        assert result is False


class TestRefundCredits:
    """Tests para reembolso de creditos."""

    @pytest.mark.asyncio
    @patch("src.services.credits.fetch_one")
    async def test_refund_success(self, mock_fetch):
        """Reembolso exitoso retorna True."""
        mock_fetch.return_value = {"credits_balance": 10.1}
        result = await refund_credits("tenant-a", 0.1, "LLM error")
        assert result is True

    @pytest.mark.asyncio
    @patch("src.services.credits.fetch_one")
    async def test_refund_nonexistent_tenant(self, mock_fetch):
        """Reembolso a tenant inexistente retorna False."""
        mock_fetch.return_value = None
        result = await refund_credits("nonexistent", 0.1, "test")
        assert result is False


class TestChargeInspectionFee:
    """Tests para el cobro de fee de inspeccion en requests bloqueados."""

    @pytest.mark.asyncio
    @patch("src.services.credits.refund_credits")
    async def test_partial_refund_on_block(self, mock_refund):
        """Al bloquear, reembolsa proxy_cost - inspection_fee."""
        mock_refund.return_value = True
        await charge_inspection_fee("tenant-a", 0.1, 0.01)
        # Debe reembolsar 0.09 (0.1 - 0.01)
        mock_refund.assert_called_once()
        args = mock_refund.call_args[0]
        assert args[0] == "tenant-a"
        assert abs(args[1] - 0.09) < 0.001


class TestGetBalance:
    """Tests para consulta de saldo."""

    @pytest.mark.asyncio
    @patch("src.services.credits.fetch_one")
    async def test_get_balance_existing_tenant(self, mock_fetch):
        """Retorna saldo del tenant."""
        mock_fetch.return_value = {"credits_balance": 42.5}
        balance = await get_balance("tenant-a")
        assert balance == 42.5

    @pytest.mark.asyncio
    @patch("src.services.credits.fetch_one")
    async def test_get_balance_nonexistent_tenant(self, mock_fetch):
        """Tenant inexistente retorna 0."""
        mock_fetch.return_value = None
        balance = await get_balance("nonexistent")
        assert balance == 0.0
