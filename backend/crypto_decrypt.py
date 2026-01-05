# crypto_decrypt.py - Desencriptación AES-GCM para Backend API SUNAT
# Este script debe estar en tu servidor Backend API SUNAT
# La clave ENCRYPTION_KEY debe ser la misma que usa el frontend

import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# La misma clave que en el frontend (.env.local -> VITE_ENCRYPTION_KEY)
ENCRYPTION_KEY = os.environ.get('FACTUMOVIL_ENCRYPTION_KEY', 'fM-2026-sUnAt-CrEdS-k3y-Ch4ng3-1n-Pr0d')
SALT = b'factumovil-salt-v1'


def _derive_key(password: str) -> bytes:
    """Deriva una clave AES-256 desde el password usando PBKDF2"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits
        salt=SALT,
        iterations=100000,
    )
    return kdf.derive(password.encode())


def decrypt(encrypted_base64: str) -> str:
    """
    Desencripta un string Base64 encriptado por el frontend.
    
    El formato es: IV (12 bytes) + datos encriptados (AES-GCM)
    """
    if not encrypted_base64:
        return ''
    
    try:
        # Decodificar Base64
        combined = base64.b64decode(encrypted_base64)
        
        # Extraer IV (primeros 12 bytes) y datos encriptados
        iv = combined[:12]
        ciphertext = combined[12:]
        
        # Derivar clave
        key = _derive_key(ENCRYPTION_KEY)
        
        # Desencriptar con AES-GCM
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(iv, ciphertext, None)
        
        return plaintext.decode('utf-8')
    
    except Exception as e:
        print(f"Error desencriptando: {e}")
        return ''


def get_sunat_credentials(sender_data: dict) -> tuple:
    """
    Obtiene las credenciales SUNAT desencriptadas de un sender.
    
    Args:
        sender_data: Dict con sunat_user_encrypted y sunat_pass_encrypted
    
    Returns:
        Tuple (usuario_sol, clave_sol)
    """
    user = decrypt(sender_data.get('sunat_user_encrypted', ''))
    password = decrypt(sender_data.get('sunat_pass_encrypted', ''))
    return user, password


# Test
if __name__ == "__main__":
    # Ejemplo de uso
    print("=== Test de Desencriptación ===")
    print(f"Clave: {ENCRYPTION_KEY[:10]}...")
    
    # Simular datos encriptados (reemplazar con datos reales de Supabase)
    test_encrypted = input("Pega el valor encriptado de sunat_user_encrypted: ").strip()
    
    if test_encrypted:
        decrypted = decrypt(test_encrypted)
        print(f"Desencriptado: {decrypted}")
    else:
        print("No se proporcionó valor para desencriptar")
