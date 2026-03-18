// services/geminiService.ts

import { GoogleGenAI, Type } from "@google/genai";
import { IAExtractionResult, Product } from "../../types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tipo_documento: {
      type: Type.STRING,
      description: "BOLETA o FACTURA según el cliente",
      enum: ["BOLETA", "FACTURA"]
    },
    cliente: {
      type: Type.OBJECT,
      properties: {
        fecha: { type: Type.STRING },
        cliente: { type: Type.STRING },
        dni: { type: Type.STRING },
        ruc: { type: Type.STRING },
        telefono: { type: Type.STRING }
      },
      required: ["cliente"]
    },
    productos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          productId: { type: Type.STRING, description: "ID exacto del producto del catálogo si hay match, vacío si no hay match" },
          cantidad: { type: Type.NUMBER, description: "Cantidad vendida, mínimo 1" },
          unidad_medida: { type: Type.STRING, description: "UNIDAD, KILOGRAMO, CAJA, BOLSA, LITRO o DOCENA" },
          descripcion: { type: Type.STRING, description: "Nombre del producto en MAYÚSCULAS" },
          precio_base: { type: Type.NUMBER, description: "Precio unitario sin IGV" },
          igv: { type: Type.NUMBER, description: "0.18 si el producto tiene IGV incluido, 0 si está exonerado de IGV" },
          precio_total: { type: Type.NUMBER, description: "precio_base * cantidad (sin IGV si igv=0.18, precio final si igv=0)" }
        },
        required: ["descripcion", "precio_total", "cantidad"]
      }
    },
    total: { type: Type.NUMBER }
  },
  required: ["tipo_documento", "cliente", "productos", "total"]
};

const getSystemPrompt = (catalog: Product[]) => {
  const catalogList = catalog.length > 0 
    ? catalog.map(p => `• ID="${p.id}" → "${p.description}" (S/${p.base_price}, ${p.unit}, IGV:${p.has_igv ? 'SÍ' : 'NO'})`).join('\n')
    : '(Catálogo vacío)';
  
  return `Eres un asistente de facturación peruana. Extrae datos de ventas desde imágenes o audio.

═══════════════════════════════════════
🎯 DETECCIÓN AUTOMÁTICA DE TIPO DE DOCUMENTO
═══════════════════════════════════════
- Si el cliente tiene RUC (11 dígitos) → tipo_documento: "FACTURA"
- Si el cliente tiene DNI (8 dígitos) o solo nombre → tipo_documento: "BOLETA"
- Si no está claro, usar "BOLETA" por defecto

═══════════════════════════════════════
📦 CATÁLOGO DE PRODUCTOS (USAR PARA MATCHING)
═══════════════════════════════════════
${catalogList}

═══════════════════════════════════════
🎯 REGLAS DE MATCHING INTELIGENTE
═══════════════════════════════════════
1. SIEMPRE intenta hacer match con el catálogo usando similitud semántica:
   - "papa" → match con "PAPA BLANCA", "PAPA AMARILLA", etc.
   - "arroz" → match con "ARROZ COSTEÑO", "ARROZ EXTRA", etc.
   - "aceite" → match con "ACEITE PRIMOR", "ACEITE VEGETAL", etc.

2. Si hay MATCH con el catálogo:
   - USA el "productId" exacto del catálogo
   - USA la "descripcion" exacta del catálogo
   - USA el "precio_base" del catálogo (a menos que el usuario diga otro precio)

3. Si NO hay match:
   - Deja "productId" vacío o null
   - Usa la descripción que dijo el usuario

4. NORMALIZA unidades: KILOGRAMO, UNIDAD, CAJA, BOLSA, LITRO, DOCENA

5. Todo en MAYÚSCULAS

6. Si el usuario dice "3 kilos de papa a 5 soles":
   - cantidad: 3
   - unidad_medida: KILOGRAMO
   - precio_base: 5 (precio por kilo)
   - igv: 0.18 si el producto normalmente lleva IGV, 0 si no
   - precio_total: 15 (3 x 5, sin IGV)

7. Extrae cliente (nombre, DNI/RUC, teléfono) y fecha si se mencionan.

8. EJEMPLOS DE DETECCIÓN:
   - "Venta a Juan Pérez DNI 12345678" → BOLETA
   - "Factura para Empresa ABC RUC 20123456789" → FACTURA
   - "Cliente: María" → BOLETA (por defecto)

9. ⚠️ CRÍTICO PARA AUDIO: Aunque no escuches productos claramente, intenta extraer CUALQUIER mención de:
   - Nombres de productos o servicios
   - Precios o montos
   - Cantidades o unidades
   - Si el audio menciona algo vendido, inclúyelo en productos aunque sea con datos parciales.
   - Si el catálogo tiene productos similares a lo mencionado, haz el match.

10. El campo "productos" NUNCA debe estar vacío si se menciona alguna venta. Si no se entiende bien, usa descripcion: "PRODUCTO/SERVICIO" con el precio mencionado.
`;
};

export const processInvoiceImage = async (base64Image: string, catalog: Product[]): Promise<IAExtractionResult | null> => {
  if (!GEMINI_API_KEY) {
    console.error('❌ VITE_GEMINI_API_KEY no configurada');
    return null;
  }
  
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    console.log('🖼️ Procesando imagen con', catalog.length, 'productos en catálogo');
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { text: getSystemPrompt(catalog) },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA
      }
    });
    const result = response.text ? JSON.parse(response.text) : null;
    console.log('✅ Resultado IA:', result);
    return result;
  } catch (error) {
    console.error("❌ Error procesando imagen:", error);
    return null;
  }
};

export const processInvoiceAudio = async (base64Audio: string, mimeType: string, catalog: Product[]): Promise<IAExtractionResult | null> => {
  if (!GEMINI_API_KEY) {
    console.error('❌ VITE_GEMINI_API_KEY no configurada');
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    console.log('🎤 Procesando audio con', catalog.length, 'productos en catálogo');
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { text: getSystemPrompt(catalog) + "\n\n🎤 AUDIO DE VENTA DICTADA - EXTRAE TODOS LOS PRODUCTOS MENCIONADOS y haz matching con el catálogo. Si mencionan precio o cantidad aunque sea vagamente, inclúyelo en productos:" },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA
      }
    });
    const result = response.text ? JSON.parse(response.text) : null;
    console.log('✅ Resultado IA:', result);
    return result;
  } catch (error) {
    console.error("❌ Error procesando audio:", error);
    return null;
  }
};
