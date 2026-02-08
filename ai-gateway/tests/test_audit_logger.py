"""Tests para el audit logger del AI Gateway."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from src.services.audit_logger import log_request, log_pii_incidents
from src.models.schemas import GatewayLogEntry, LogStatus, PiiIncident


class TestLogRequest:
    """Tests para el registro de logs."""

    @pytest.mark.asyncio
    @patch("src.services.audit_logger.get_pool")
    async def test_log_success_entry(self, mock_get_pool):
        """Log de request exitoso se inserta correctamente."""
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value={"id": "log-uuid-123"})
        mock_get_pool.return_value = mock_pool

        entry = GatewayLogEntry(
            tenant_id="tenant-a",
            api_key_id="key-uuid",
            request_model="gpt-4o-mini",
            request_provider="openai",
            prompt_hash="abc123",
            prompt_tokens=10,
            completion_tokens=20,
            total_tokens=30,
            cost_usd=0.001,
            credits_charged=0.1,
            latency_ms=250,
            status=LogStatus.SUCCESS,
        )

        log_id = await log_request(entry)
        assert log_id == "log-uuid-123"
        mock_pool.fetchrow.assert_called_once()
        # Verificar que el INSERT incluye todos los campos
        call_sql = mock_pool.fetchrow.call_args[0][0]
        assert "ai_gateway_log" in call_sql
        assert "RETURNING id" in call_sql

    @pytest.mark.asyncio
    @patch("src.services.audit_logger.get_pool")
    async def test_log_blocked_entry(self, mock_get_pool):
        """Log de request bloqueado registra status correcto."""
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(return_value={"id": "log-blocked"})
        mock_get_pool.return_value = mock_pool

        entry = GatewayLogEntry(
            tenant_id="tenant-a",
            api_key_id="key-uuid",
            request_model="gpt-4o",
            request_provider="openai",
            credits_charged=0.01,
            latency_ms=15,
            status=LogStatus.BLOCKED_CREDITS,
        )

        log_id = await log_request(entry)
        assert log_id == "log-blocked"
        # Verificar que el status se pasa como string
        call_args = mock_pool.fetchrow.call_args[0]
        assert "blocked_credits" in call_args

    @pytest.mark.asyncio
    @patch("src.services.audit_logger.get_pool")
    async def test_log_error_returns_none(self, mock_get_pool):
        """Si DB falla, retorna None sin crashear."""
        mock_pool = AsyncMock()
        mock_pool.fetchrow = AsyncMock(side_effect=Exception("DB connection lost"))
        mock_get_pool.return_value = mock_pool

        entry = GatewayLogEntry(
            tenant_id="tenant-a",
            request_model="gpt-4o",
            request_provider="openai",
            credits_charged=0.1,
            status=LogStatus.SUCCESS,
        )

        log_id = await log_request(entry)
        assert log_id is None


class TestLogPiiIncidents:
    """Tests para el registro de incidentes PII."""

    @pytest.mark.asyncio
    @patch("src.services.audit_logger.get_pool")
    async def test_batch_insert_incidents(self, mock_get_pool):
        """Multiples incidentes PII se insertan en batch."""
        mock_conn = AsyncMock()

        # Simular async context manager para pool.acquire()
        class FakeAcquire:
            async def __aenter__(self):
                return mock_conn
            async def __aexit__(self, *args):
                return False

        mock_pool = MagicMock()
        mock_pool.acquire.return_value = FakeAcquire()
        mock_get_pool.return_value = mock_pool

        incidents = [
            PiiIncident(
                log_id="log-123",
                tenant_id="tenant-a",
                entity_type="PERSON",
                action_taken="redacted",
                confidence=0.95,
            ),
            PiiIncident(
                log_id="log-123",
                tenant_id="tenant-a",
                entity_type="CREDIT_CARD",
                action_taken="redacted",
                confidence=0.99,
            ),
        ]

        await log_pii_incidents(incidents)
        mock_conn.executemany.assert_called_once()
        # Verificar que se pasaron 2 registros
        call_args = mock_conn.executemany.call_args[0]
        assert len(call_args[1]) == 2

    @pytest.mark.asyncio
    @patch("src.services.audit_logger.get_pool")
    async def test_empty_incidents_no_op(self, mock_get_pool):
        """Lista vacia de incidentes no hace query."""
        await log_pii_incidents([])
        mock_get_pool.assert_not_called()
