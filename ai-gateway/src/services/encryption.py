import os
import base64
import hashlib
import logging
from functools import lru_cache
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from src.config.settings import get_settings

logger = logging.getLogger(__name__)

# Contexto HKDF para derivar key especifica del AI Gateway
_HKDF_INFO = b"securetag-ai-gateway-byok-encryption"


@lru_cache(maxsize=1)
def _derive_key(system_secret: str) -> bytes:
    """Deriva una clave AES-256 del SECURETAG_SYSTEM_SECRET usando HKDF."""
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits
        salt=None,
        info=_HKDF_INFO,
    )
    return hkdf.derive(system_secret.encode("utf-8"))


def encrypt_value(plaintext: str) -> str:
    """
    Cifra un valor con AES-256-GCM.
    Retorna: base64(nonce + ciphertext + tag)
    """
    key = _derive_key(get_settings().securetag_system_secret)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96 bits
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_value(encrypted: str) -> str:
    """
    Descifra un valor cifrado con AES-256-GCM.
    Espera: base64(nonce + ciphertext + tag)
    """
    key = _derive_key(get_settings().securetag_system_secret)
    aesgcm = AESGCM(key)
    raw = base64.b64decode(encrypted)
    nonce = raw[:12]
    ciphertext = raw[12:]
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")


def hash_prompt(prompt_text: str) -> str:
    """Genera SHA-256 hash de un prompt para logging seguro."""
    return hashlib.sha256(prompt_text.encode("utf-8")).hexdigest()
