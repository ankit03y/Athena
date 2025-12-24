"""
Athena Agent - Credential Encryption
AES-256 encryption for storing SSH credentials securely
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from dotenv import load_dotenv

load_dotenv()

# Get master key from environment
MASTER_KEY = os.environ.get("ATHENA_MASTER_KEY")

if not MASTER_KEY:
    raise ValueError("ATHENA_MASTER_KEY environment variable is required")


def _get_fernet() -> Fernet:
    """Get Fernet instance from master key"""
    # Derive a proper Fernet key from the master key
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"athena-agent-salt",  # Static salt for deterministic key derivation
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(MASTER_KEY.encode()))
    return Fernet(key)


def encrypt_credential(plain_text: str) -> str:
    """
    Encrypt a credential (password or private key)
    
    Args:
        plain_text: The plain text credential
        
    Returns:
        Base64 encoded encrypted string
    """
    fernet = _get_fernet()
    encrypted = fernet.encrypt(plain_text.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_credential(encrypted_text: str) -> str:
    """
    Decrypt a credential
    
    Args:
        encrypted_text: Base64 encoded encrypted string
        
    Returns:
        Decrypted plain text credential
    """
    fernet = _get_fernet()
    encrypted = base64.urlsafe_b64decode(encrypted_text.encode())
    decrypted = fernet.decrypt(encrypted)
    return decrypted.decode()


# Convenience functions for testing
if __name__ == "__main__":
    test_password = "my-secret-password"
    print(f"Original: {test_password}")
    
    encrypted = encrypt_credential(test_password)
    print(f"Encrypted: {encrypted}")
    
    decrypted = decrypt_credential(encrypted)
    print(f"Decrypted: {decrypted}")
    
    assert test_password == decrypted, "Encryption/decryption failed!"
    print("✅ Encryption test passed!")
