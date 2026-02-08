"""Tests para el middleware de autenticacion del AI Gateway."""
import hashlib
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException

from src.middleware.auth import hash_api_key, authenticate_request


class TestHashApiKey:
    """Verificar que el hash SHA-256 es identico al de Node.js auth.ts."""

    def test_hash_known_value(self):
        """Hash de un valor conocido debe coincidir con SHA-256 estandar."""
        key = "test-api-key-12345"
        expected = hashlib.sha256(key.encode("utf-8")).hexdigest()
        assert hash_api_key(key) == expected

    def test_hash_consistency(self):
        """Mismo input siempre produce mismo output."""
        key = "sk-securetag-abc123"
        assert hash_api_key(key) == hash_api_key(key)

    def test_hash_different_keys(self):
        """Keys diferentes producen hashes diferentes."""
        assert hash_api_key("key-a") != hash_api_key("key-b")

    def test_hash_matches_nodejs_crypto(self):
        """
        Verifica compatibilidad con Node.js:
        crypto.createHash('sha256').update('hello').digest('hex')
        """
        result = hash_api_key("hello")
        # Hash SHA-256 conocido de "hello"
        assert result == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"


class TestAuthenticateRequest:
    """Tests para authenticate_request."""

    @pytest.mark.asyncio
    async def test_missing_api_key_returns_401(self):
        """Request sin X-API-Key debe retornar 401."""
        request = MagicMock()
        request.headers = {}

        with pytest.raises(HTTPException) as exc_info:
            await authenticate_request(request)
        assert exc_info.value.status_code == 401
        assert "Missing X-API-Key" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    @patch("src.middleware.auth.fetch_one")
    async def test_invalid_key_returns_401(self, mock_fetch):
        """Key que no existe en DB debe retornar 401."""
        mock_fetch.return_value = None
        request = MagicMock()
        request.headers = {"x-api-key": "invalid-key"}

        with pytest.raises(HTTPException) as exc_info:
            await authenticate_request(request)
        assert exc_info.value.status_code == 401
        assert "Invalid API key" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    @patch("src.middleware.auth.fetch_one")
    async def test_revoked_key_returns_403(self, mock_fetch):
        """Key revocada debe retornar 403."""
        mock_fetch.return_value = {
            "api_key_id": "uuid-1",
            "tenant_id": "tenant-a",
            "user_id": "user-1",
            "expires_at": None,
            "is_active": False,
            "key_ai_enabled": True,
            "tenant_ai_enabled": True,
            "tenant_name": "Test Tenant",
        }
        request = MagicMock()
        request.headers = {"x-api-key": "test-key"}

        with pytest.raises(HTTPException) as exc_info:
            await authenticate_request(request)
        assert exc_info.value.status_code == 403
        assert "revoked" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    @patch("src.middleware.auth.fetch_one")
    async def test_tenant_ai_disabled_returns_403(self, mock_fetch):
        """Tenant sin AI Gateway habilitado debe retornar 403."""
        mock_fetch.return_value = {
            "api_key_id": "uuid-1",
            "tenant_id": "tenant-a",
            "user_id": "user-1",
            "expires_at": None,
            "is_active": True,
            "key_ai_enabled": True,
            "tenant_ai_enabled": False,
            "tenant_name": "Test Tenant",
        }
        request = MagicMock()
        request.headers = {"x-api-key": "test-key"}

        with pytest.raises(HTTPException) as exc_info:
            await authenticate_request(request)
        assert exc_info.value.status_code == 403
        assert "not enabled" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    @patch("src.middleware.auth.fetch_one")
    async def test_valid_key_returns_auth_context(self, mock_fetch):
        """Key valida con AI Gateway habilitado retorna AuthContext."""
        # Primera llamada: lookup de api_key
        # Segunda llamada: check de bans (retorna None = no banned)
        mock_fetch.side_effect = [
            {
                "api_key_id": "uuid-123",
                "tenant_id": "tenant-a",
                "user_id": "user-1",
                "expires_at": None,
                "is_active": True,
                "key_ai_enabled": True,
                "tenant_ai_enabled": True,
                "tenant_name": "Test Tenant",
            },
            None,  # No bans
        ]
        request = MagicMock()
        request.headers = {"x-api-key": "valid-key"}

        auth = await authenticate_request(request)
        assert auth.tenant_id == "tenant-a"
        assert auth.api_key_id == "uuid-123"
        assert auth.ai_gateway_enabled is True
        assert auth.is_banned is False
