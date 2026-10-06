// hooks/useInvoicePreview.ts
import { useEffect, useRef, useState } from 'react';
import { getUserMessage } from '../services/core/apiClient';
import {
  type InvoiceItemPayload,
  type InvoicePreview,
  type InvoicePreviewLine,
  invoiceService,
} from '../services/business/invoiceService';
import type { InvoiceItem, InvoiceType } from '../types';

/** Lo que se espera a que el cajero deje de escribir antes de preguntar el total. */
const DEBOUNCE_MS = 400;

type Params = {
  senderId?: number;
  invoiceType: InvoiceType;
  invoiceDate: string;
  clientName: string;
  clientDocument: string;
  items: InvoiceItem[];
};

export type InvoicePreviewState = {
  /** Los montos declarados. `null` mientras no hay nada que calcular, o si fallo. */
  preview: InvoicePreview | null;
  /** La linea declarada de un item, por su posicion en la lista. */
  lineOf: (index: number) => InvoicePreviewLine | null;
  isCalculating: boolean;
  failed: boolean;
  /**
   * Por que fallo, en palabras para el usuario. Muchos fallos del calculo son reglas que
   * el cajero puede corregir -una boleta de mas de S/ 700 sin DNI, por ejemplo-, y decirle
   * "revisa tu conexion" lo manda a buscar el problema donde no esta. apiClient ya deja el
   * `detail` de los 4xx en userMessage.
   */
  errorMessage: string | null;
};

/** Un item sirve para calcular cuando ya tiene las tres cosas que mueven el monto. */
const isReady = (item: InvoiceItem): boolean =>
  item.description.trim().length > 0 && item.sale_price > 0 && item.quantity > 0;

const toPayload = (item: InvoiceItem): InvoiceItemPayload => ({
  product_id: item.product_id,
  description: item.description.trim().toUpperCase(),
  quantity: item.quantity,
  unit: item.unit,
  sale_price: item.sale_price,
  igv_type: item.igv_type,
});

/**
 * Le pregunta a Factu API, por el backend, cuanto se declararia con los items de ahora.
 *
 * El frontend no calcula el IGV ni los totales: los pide. Eso cuesta una llamada por pausa
 * de tecleo, y por eso espera DEBOUNCE_MS. Mientras no hay respuesta, la pantalla dice que
 * esta calculando en vez de mostrar un numero propio, que es justo lo que llevaba a que la
 * caja y el comprobante dijeran cosas distintas.
 *
 * El nombre del cliente no entra en la firma que dispara el calculo: no mueve ningun monto,
 * y si entrara se pediria un total nuevo por cada letra del nombre. Se manda el valor que
 * haya al momento de salir, por eso viaja en una ref.
 */
export const useInvoicePreview = ({
  senderId,
  invoiceType,
  invoiceDate,
  clientName,
  clientDocument,
  items,
}: Params): InvoicePreviewState => {
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Las respuestas pueden volver desordenadas: solo la de la ultima peticion vale.
  const lastRequest = useRef(0);
  const client = useRef({ clientName, clientDocument });
  client.current = { clientName, clientDocument };

  const ready = items.map((item, index) => ({ item, index })).filter(({ item }) => isReady(item));
  // Todo lo que cambia el resultado, y nada mas. Es la unica dependencia del efecto: lo que
  // se manda se reconstruye de aqui, asi que no hay forma de pedir un calculo con datos
  // viejos ni de saltarse uno nuevo.
  const signature = ready.length
    ? JSON.stringify({
        invoice_type: invoiceType,
        invoice_date: invoiceDate,
        items: ready.map(({ item }) => toPayload(item)),
      })
    : '';

  useEffect(() => {
    if (!signature) {
      setPreview(null);
      setIsCalculating(false);
      setFailed(false);
      setErrorMessage(null);
      return;
    }

    const request = ++lastRequest.current;
    setIsCalculating(true);
    setFailed(false);
    setErrorMessage(null);

    const timer = setTimeout(async () => {
      const body = JSON.parse(signature) as {
        invoice_type: InvoiceType;
        invoice_date: string;
        items: InvoiceItemPayload[];
      };
      const { clientName: name, clientDocument: document } = client.current;

      try {
        const result = await invoiceService.previewInvoice(
          {
            client_name: name.trim().toUpperCase() || 'CLIENTE',
            client_document: document.trim() || undefined,
            invoice_type: body.invoice_type,
            invoice_date: body.invoice_date,
            items: body.items,
          },
          senderId,
        );
        if (request !== lastRequest.current) return;
        setPreview(result);
      } catch (error: unknown) {
        if (request !== lastRequest.current) return;
        setPreview(null);
        setFailed(true);
        setErrorMessage(getUserMessage(error, 'No se pudo calcular el total.'));
      } finally {
        if (request === lastRequest.current) setIsCalculating(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [signature, senderId]);

  const lineOf = (index: number): InvoicePreviewLine | null => {
    if (!preview) return null;
    const position = ready.findIndex((entry) => entry.index === index);
    return position === -1 ? null : (preview.items[position] ?? null);
  };

  return { preview, lineOf, isCalculating, failed, errorMessage };
};
