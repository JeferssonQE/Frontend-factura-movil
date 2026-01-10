// crypto.ts - Encriptación AES-GCM para datos sensibles (credenciales SUNAT)
// Compatible con el backend (backend/crypto.py)

// La misma clave que en el backend
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'factumovil-default-key-change-in-prod';
const SALT = new TextEncoder().encode('factumovil-salt-v1');

/**
 * Deriva una clave AES-256 desde el password usando PBKDF2
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encripta texto plano → string Base64 (compatible con backend)
 */
export async function encrypt(plainText: string): Promise<string | null> {
  if (!plainText) return null;

  try {
    // Derivar clave
    const key = await deriveKey(ENCRYPTION_KEY);
    
    // Generar IV aleatorio de 12 bytes
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encriptar con AES-GCM
    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plainText)
    );
    
    // Concatenar IV + datos encriptados y convertir a Base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Error encriptando:', error);
    return null;
  }
}

/**
 * Desencripta string Base64 → texto plano (compatible con backend)
 */
export async function decrypt(encryptedBase64: string): Promise<string | null> {
  if (!encryptedBase64) return null;

  try {
    // Derivar clave
    const key = await deriveKey(ENCRYPTION_KEY);
    
    // Decodificar Base64 y separar IV + datos
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12); // Primeros 12 bytes son el IV
    const ciphertext = combined.slice(12); // Resto son los datos encriptados
    
    // Desencriptar con AES-GCM
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    // Silenciar errores de desencriptación en desarrollo
    // console.error('Error desencriptando:', error);
    return null;
  }
}

// Test function (solo para desarrollo)
export async function testCrypto(): Promise<void> {
  console.log('=== Test de Encriptación AES-GCM ===');
  console.log(`Clave: ${ENCRYPTION_KEY.substring(0, 20)}...`);
  
  const original = 'MODDATOS123';
  console.log(`Original: ${original}`);
  
  const encrypted = await encrypt(original);
  console.log(`Encriptado: ${encrypted}`);
  
  const decrypted = await decrypt(encrypted!);
  console.log(`Desencriptado: ${decrypted}`);
  
  if (original === decrypted) {
    console.log('✅ Test exitoso: Encriptación/Desencriptación funciona correctamente');
  } else {
    console.log('❌ Test fallido: Los datos no coinciden');
  }
  
  console.log('✅ Credenciales listas para el servicio SUNAT');
}