# crypto.py - Encriptación AES-GCM para datos sensibles (credenciales SUNAT)
# Compatible con el frontend (services/crypto.ts)
import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# La misma clave que en el frontend (.env.local -> VITE_ENCRYPTION_KEY)
ENCRYPTION_KEY = os.environ.get('FACTUMOVIL_ENCRYPTION_KEY', 'factumovil-default-key-change-in-prod')
SALT = b'factumovil-salt-v1'


def _derive_key(password: str) -> bytes:
    """Deriva una clave AES-256 desde el password usando PBKDF2"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=SALT,
        iterations=100000,
    )
    return kdf.derive(password.encode())


def encrypt(plain_text: str) -> str:
    """Encripta texto plano → string Base64 (compatible con frontend)"""
    if not plain_text:
        return None
    
    try:
        # Derivar clave
        key = _derive_key(ENCRYPTION_KEY)
        
        # Generar IV aleatorio de 12 bytes
        iv = os.urandom(12)
        
        # Encriptar con AES-GCM
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(iv, plain_text.encode('utf-8'), None)
        
        # Concatenar IV + datos encriptados y convertir a Base64
        combined = iv + ciphertext
        return base64.b64encode(combined).decode('utf-8')
    
    except Exception as e:
        print(f"Error encriptando: {e}")
        return None


def decrypt(encrypted_base64: str) -> str:
    """Desencripta string Base64 → texto plano (compatible con frontend)"""
    if not encrypted_base64:
        return None
    
    try:
        # Derivar clave
        key = _derive_key(ENCRYPTION_KEY)
        
        # Decodificar Base64 y separar IV + datos
        combined = base64.b64decode(encrypted_base64)
        iv = combined[:12]  # Primeros 12 bytes son el IV
        ciphertext = combined[12:]  # Resto son los datos encriptados
        
        # Desencriptar con AES-GCM
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(iv, ciphertext, None)
        
        return plaintext.decode('utf-8')
    
    except Exception as e:
        print(f"Error desencriptando: {e}")
        return None


# Test
if __name__ == "__main__":
    print("=== Test de Encriptación AES-GCM ===")
    print(f"Clave: {ENCRYPTION_KEY[:20]}...")
    
    original = "MODDATOS123"
    print(f"Original: {original}")
    
    encrypted = encrypt(original)
    print(f"Encriptado: {encrypted}")
    
    decrypted = decrypt(encrypted)
    print(f"Desencriptado: {decrypted}")
    
    if original == decrypted:
        print("✅ Test exitoso: Encriptación/Desencriptación funciona correctamente")
    else:
        print("❌ Test fallido: Los datos no coinciden")
    
    print("✅ Credenciales listas para el servicio SUNAT")

