"""
Symmetric encryption for storing broker/AI API keys in SQLite.
Uses Fernet (AES-128-CBC + HMAC-SHA256) derived from SECRET_KEY.
"""
import base64
import hashlib
from cryptography.fernet import Fernet


def _get_fernet(secret_key: str) -> Fernet:
    # Derive a 32-byte key from SECRET_KEY using SHA-256, then base64url-encode it
    key_bytes = hashlib.sha256(secret_key.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt(value: str, secret_key: str) -> str:
    """Encrypt a plaintext string; returns a base64-encoded ciphertext string."""
    f = _get_fernet(secret_key)
    return f.encrypt(value.encode()).decode()


def decrypt(token: str, secret_key: str) -> str:
    """Decrypt a ciphertext string produced by encrypt()."""
    f = _get_fernet(secret_key)
    return f.decrypt(token.encode()).decode()


def mask(value: str, visible: int = 4) -> str:
    """Return a masked version for display (e.g. '****abcd')."""
    if len(value) <= visible:
        return "*" * len(value)
    return "*" * (len(value) - visible) + value[-visible:]
