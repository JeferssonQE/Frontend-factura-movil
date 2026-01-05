# crypto.py - Encriptación AES-256 para datos sensibles (credenciales SUNAT)
import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# La clave maestra debe estar en variable de entorno
# Genera una con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY = os.environ.get('FACTUMOVIL_ENCRYPTION_KEY', 'CAMBIAR_EN_PRODUCCION')


def _get_fernet():
    """Deriva una clave Fernet desde la clave maestra"""
    if ENCRYPTION_KEY == 'CAMBIAR_EN_PRODUCCION':
        print("⚠️  ADVERTENCIA: Usando clave de encriptación por defecto. Configura FACTUMOVIL_ENCRYPTION_KEY")
    
    # Derivar clave usando PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'factumovil_salt_v1',  # Salt fijo para poder desencriptar
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(ENCRYPTION_KEY.encode()))
    return Fernet(key)


def encrypt(plain_text: str) -> str:
    """Encripta texto plano → string base64"""
    if not plain_text:
        return None
    f = _get_fernet()
    encrypted = f.encrypt(plain_text.encode())
    return encrypted.decode()


def decrypt(encrypted_text: str) -> str:
    """Desencripta string base64 → texto plano"""
    if not encrypted_text:
        return None
    f = _get_fernet()
    decrypted = f.decrypt(encrypted_text.encode())
    return decrypted.decode()


# Test
if __name__ == "__main__":
    original = "MODDATOS123"
    print(f"Original: {original}")
    
    encrypted = encrypt(original)
    print(f"Encriptado: {encrypted}")
    
    decrypted = decrypt(encrypted)
    print(f"Desencriptado: {decrypted}")
    
    assert original == decrypted
    print("✅ Encriptación funcionando correctamente")
