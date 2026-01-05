// services/crypto.ts - Encriptación AES-GCM para datos sensibles
// Usa Web Crypto API (disponible en navegadores modernos)

// @ts-ignore
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'factumovil-default-key-change-in-prod';

// Deriva una clave criptográfica desde un string
async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('factumovil-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Convierte ArrayBuffer a Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convierte Base64 a ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encripta texto plano → string Base64
 */
export async function encrypt(plainText: string): Promise<string> {
  if (!plainText) return '';
  
  const key = await getKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // IV de 12 bytes para AES-GCM
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );

  // Concatenar IV + datos encriptados y convertir a Base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return bufferToBase64(combined.buffer);
}

/**
 * Desencripta string Base64 → texto plano
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64) return '';
  
  try {
    const key = await getKey();
    const combined = new Uint8Array(base64ToBuffer(encryptedBase64));
    
    // Extraer IV (primeros 12 bytes) y datos encriptados
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Error desencriptando:', error);
    return '';
  }
}
