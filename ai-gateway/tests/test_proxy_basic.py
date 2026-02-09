"""Tests basicos para el proxy del AI Gateway."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from src.main import app
from src.models.schemas import AuthContext


@pytest.fixture
def client():
    return TestClient(app)


class TestProxyEndpoint:
    """Tests para POST /v1/chat/completions."""

    def test_missing_api_key_returns_401(self, client):
        """Request sin X-API-Key retorna 401."""
        response = client.post(
            "/v1/chat/completions",
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "hello"}],
            },
        )
        assert response.status_code == 401

    @patch("src.routes.proxy.process_request")
    @patch("src.routes.proxy.authenticate_request")
    def test_valid_request_proxies(self, mock_auth, mock_process, client):
        """Request valido se proxea y retorna respuesta OpenAI-compatible."""
        mock_auth.return_value = AuthContext(
            tenant_id="tenant-a",
            api_key_id="key-123",
            key_hash="abc",
            ai_gateway_enabled=True,
        )
        mock_process.return_value = {
            "id": "chatcmpl-123",
            "object": "chat.completion",
            "model": "gpt-4o-mini",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "Hello!"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 5,
                "completion_tokens": 3,
                "total_tokens": 8,
            },
        }

        response = client.post(
            "/v1/chat/completions",
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "hello"}],
            },
            headers={"X-API-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["object"] == "chat.completion"
        assert data["choices"][0]["message"]["content"] == "Hello!"
        assert data["usage"]["total_tokens"] == 8

    @patch("src.pipeline.orchestrator.scan_input")
    @patch("src.pipeline.orchestrator.scan_messages")
    @patch("src.pipeline.orchestrator.call_llm_stream")
    @patch("src.pipeline.orchestrator.check_and_reserve_credits")
    @patch("src.pipeline.orchestrator.check_rate_limit")
    @patch("src.pipeline.orchestrator.get_key_config")
    @patch("src.pipeline.orchestrator.get_tenant_config")
    @patch("src.routes.proxy.authenticate_request")
    def test_stream_returns_event_stream(
        self, mock_auth, mock_config, mock_key_config, mock_rate,
        mock_credits, mock_llm_stream, mock_scan_msg, mock_scan_input, client
    ):
        """Request con stream=true retorna StreamingResponse con content-type text/event-stream."""
        mock_auth.return_value = AuthContext(
            tenant_id="t", api_key_id="k", key_hash="h",
            ai_gateway_enabled=True,
        )
        from src.models.schemas import TenantGatewayConfig
        mock_config.return_value = TenantGatewayConfig(tenant_id="t")
        mock_key_config.return_value = None
        mock_rate.return_value = None
        mock_credits.return_value = True

        from src.pipeline.llm_guard_scan import InputScanResult
        mock_scan_input.return_value = InputScanResult()
        from src.pipeline.presidio_scan import PiiScanResult
        mock_scan_msg.return_value = PiiScanResult(
            sanitized_messages=[{"role": "user", "content": "hi"}],
            pii_found=False, incidents=[],
        )

        # Simular stream con un chunk
        chunk = MagicMock()
        chunk.model_dump.return_value = {
            "id": "chatcmpl-test",
            "object": "chat.completion.chunk",
            "model": "gpt-4o",
            "choices": [{"index": 0, "delta": {"content": "Hi"}, "finish_reason": None}],
        }

        async def async_iter():
            yield chunk

        mock_llm_stream.return_value = async_iter()

        response = client.post(
            "/v1/chat/completions",
            json={
                "model": "gpt-4o",
                "messages": [{"role": "user", "content": "hi"}],
                "stream": True,
            },
            headers={"X-API-Key": "key"},
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")


class TestHealthEndpoint:
    """Tests para GET /healthz."""

    @patch("src.routes.health.get_pool")
    @patch("src.routes.health.get_redis")
    def test_healthz_ok(self, mock_redis, mock_pool, client):
        """Health check retorna ok cuando DB y Redis estan arriba."""
        # Mock pool
        pool = AsyncMock()
        pool.fetchval = AsyncMock(return_value=1)
        mock_pool.return_value = pool

        # Mock redis
        redis = AsyncMock()
        redis.ping = AsyncMock(return_value=True)
        mock_redis.return_value = redis

        response = client.get("/healthz")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "ai-gateway"


class TestModelsEndpoint:
    """Tests para GET /v1/models."""

    @patch("src.routes.models.get_tenant_config")
    @patch("src.routes.models.authenticate_request")
    def test_list_models_default(self, mock_auth, mock_config, client):
        """Sin restricciones, retorna todos los modelos."""
        mock_auth.return_value = AuthContext(
            tenant_id="t", api_key_id="k", key_hash="h",
            ai_gateway_enabled=True,
        )
        from src.models.schemas import TenantGatewayConfig
        mock_config.return_value = TenantGatewayConfig(tenant_id="t")

        response = client.get(
            "/v1/models",
            headers={"X-API-Key": "test"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["object"] == "list"
        assert len(data["data"]) > 0

    @patch("src.routes.models.get_tenant_config")
    @patch("src.routes.models.authenticate_request")
    def test_list_models_filtered(self, mock_auth, mock_config, client):
        """Con blocked_models, excluye modelos bloqueados."""
        mock_auth.return_value = AuthContext(
            tenant_id="t", api_key_id="k", key_hash="h",
            ai_gateway_enabled=True,
        )
        from src.models.schemas import TenantGatewayConfig
        mock_config.return_value = TenantGatewayConfig(
            tenant_id="t",
            blocked_models=["gpt-4o"],
        )

        response = client.get(
            "/v1/models",
            headers={"X-API-Key": "test"},
        )
        data = response.json()
        model_ids = [m["id"] for m in data["data"]]
        assert "gpt-4o" not in model_ids
