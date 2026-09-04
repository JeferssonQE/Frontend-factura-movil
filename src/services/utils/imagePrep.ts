// services/utils/imagePrep.ts
// Normaliza la foto antes de mandarla a la IA. Resuelve tres problemas de una sola vez:
//  - una foto de movil pesa 3-8 MB y el proxy corta los bodies grandes (413)
//  - el HEIC del iPhone no lo entiende la API de IA; el canvas lo reescribe como JPEG
//  - subir 8 MB por datos moviles tarda mas que la extraccion misma
// Una factura escaneada no gana nada por encima de 1600px: el texto ya es legible.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export const PREPARED_IMAGE_MIME = 'image/jpeg';

export interface PreparedImage {
  dataUrl: string;
  mimeType: string;
}

const readAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(blob);
  });

const scaleToFit = (width: number, height: number): { width: number; height: number } => {
  const longestSide = Math.max(width, height);
  if (longestSide <= MAX_DIMENSION) return { width, height };

  const ratio = MAX_DIMENSION / longestSide;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

const toJpegDataUrl = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  const { width, height } = scaleToFit(bitmap.width, bitmap.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D no disponible');

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, PREPARED_IMAGE_MIME, JPEG_QUALITY),
  );
  if (!blob) throw new Error('No se pudo recomprimir la imagen');

  return readAsDataUrl(blob);
};

export const prepareImageForAI = async (file: File): Promise<PreparedImage> => {
  try {
    return { dataUrl: await toJpegDataUrl(file), mimeType: PREPARED_IMAGE_MIME };
  } catch {
    // Si el navegador no sabe decodificar el archivo, mandamos el original con su tipo
    // real declarado: es mejor que la IA lo rechace con un mensaje claro que fallar aqui.
    return { dataUrl: await readAsDataUrl(file), mimeType: file.type || PREPARED_IMAGE_MIME };
  }
};
