// services/integrations/agentService.ts
// Base de conocimiento SUNAT local — sin llamadas externas.

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: Date;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Base de conocimiento SUNAT
// ---------------------------------------------------------------------------

interface KnowledgeEntry {
  keywords: string[];
  response: string;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ['igv', 'impuesto general ventas', 'impuesto a las ventas', '18%', 'credito fiscal', 'debito fiscal', 'base imponible', 'exonerado', 'inafecto', 'gravado'],
    response: `IGV — Impuesto General a las Ventas

Tasa vigente: 18% (16% IGV + 2% IPM — Impuesto de Promoción Municipal).

Conceptos clave:
• Base imponible: valor de venta sin IGV
• Débito fiscal: IGV cobrado en ventas
• Crédito fiscal: IGV pagado en compras (deducible si el gasto es causal y está sustentado con comprobante)

Operaciones gravadas: venta de bienes muebles, prestación de servicios, contratos de construcción, importaciones.

Operaciones exoneradas: listadas en el Apéndice I de la Ley del IGV (ej. algunos alimentos de primera necesidad).

Operaciones inafectas: no están dentro del ámbito de aplicación del IGV (ej. exportaciones, transferencias a título gratuito en ciertos casos).

Declaración: mensual, a través del PDT 621 o Formulario Virtual 621 en el portal SUNAT.`,
  },
  {
    keywords: ['ruc', 'registro unico contribuyentes', 'numero ruc', 'obtener ruc', 'inscripcion ruc', 'estado ruc', 'activo', 'suspendido', 'baja ruc', 'tipo contribuyente'],
    response: `RUC — Registro Único de Contribuyentes

El RUC es el número de identificación tributaria en Perú, compuesto por 11 dígitos.

Tipos de contribuyente:
• Persona Natural: empieza en 10
• Persona Jurídica (empresa): empieza en 20

Cómo obtenerlo:
1. Ingresa a sunat.gob.pe o preséntate en una oficina SUNAT
2. Ten a mano DNI (persona natural) o escritura de constitución (empresa)
3. El trámite es gratuito

Estados del RUC:
• Activo: habilitado para emitir comprobantes
• Suspendido temporal: no puede operar temporalmente
• Baja provisional / definitiva: dado de baja por SUNAT o por solicitud

Verificación: puedes consultar el RUC de cualquier contribuyente en sunat.gob.pe → Consultas en línea → Por RUC.`,
  },
  {
    keywords: ['factura', 'boleta', 'comprobante pago', 'ticket', 'emitir factura', 'emitir boleta', 'diferencia factura boleta', 'cuando emitir', 'requisitos comprobante'],
    response: `Comprobantes de Pago — Factura vs. Boleta

FACTURA
• Se emite a personas jurídicas (empresas) o personas naturales con RUC
• Sustenta gasto/costo para efectos del Impuesto a la Renta
• Permite usar el crédito fiscal del IGV
• Obligatoria cuando el comprador entrega su RUC
• Serie: F001, F002, etc.

BOLETA DE VENTA
• Se emite a consumidores finales (personas naturales sin RUC)
• El cliente puede dar su DNI o ser anónimo (hasta S/ 700 sin identificación)
• NO sustenta crédito fiscal del IGV
• Serie: B001, B002, etc.

Obligación de emitir: siempre que realices una operación de venta o prestación de servicio, incluso si el cliente no lo solicita.

Montos mínimos: no existe monto mínimo para emitir; sin embargo, boletas menores a S/ 5 pueden emitirse de forma consolidada al final del día.`,
  },
  {
    keywords: ['nota credito', 'nota de credito', 'anular factura', 'anular boleta', 'devolucion', 'descuento', 'corregir comprobante', 'cuando emitir nota'],
    response: `Nota de Crédito

La nota de crédito es el comprobante que permite modificar o anular una factura o boleta ya emitida.

¿Cuándo emitirla?
• Devolución total o parcial de bienes
• Descuentos o bonificaciones posteriores a la emisión
• Errores en los datos del comprobante (monto, descripción, datos del cliente)
• Anulación de la operación

Plazo: no existe un plazo legal fijo, pero se recomienda emitirla en el mismo período para efectos del IGV. SUNAT puede cuestionar notas de crédito muy tardías.

Relación obligatoria: debe referenciar el número y serie del comprobante original.

Serie: NC-F001 para facturas, NC-B001 para boletas.

Efecto tributario:
• Reduce el débito fiscal del IGV del período
• En facturas, el cliente debe reducir su crédito fiscal`,
  },
  {
    keywords: ['portal sol', 'clave sol', 'sunat online', 'sunat virtual', 'declaracion online', 'tramites online', 'e-menu', 'sunat operaciones'],
    response: `Portal SOL — SUNAT Operaciones en Línea

El Portal SOL (sunat.gob.pe) es la plataforma virtual de SUNAT para realizar trámites y declaraciones.

Acceso: con RUC + Clave SOL (usuario y contraseña).

¿Cómo obtener la Clave SOL?
1. Ve a sunat.gob.pe → Trámites y Consultas → Obtener Clave SOL
2. También puedes solicitarla en cualquier Centro de Servicios al Contribuyente

Operaciones disponibles:
• Declarar y pagar impuestos (PDT 621, 601, etc.)
• Emitir comprobantes electrónicos desde el SEE-SOL
• Consultar deudas y fraccionamientos
• Descargar constancias de inscripción RUC
• Gestionar libros electrónicos (PLE/SIRE)
• Solicitar devoluciones

Clave SOL secundaria: puedes crear usuarios secundarios para que tu contador acceda sin compartir la clave principal.`,
  },
  {
    keywords: ['detracciones', 'spot', 'sistema pago obligaciones tributarias', 'detraccion', 'cuenta detracciones', 'bienes sujetos detracciones', 'porcentaje detraccion'],
    response: `Detracciones — SPOT

El Sistema de Pago de Obligaciones Tributarias (SPOT) obliga al comprador a depositar un porcentaje del precio de compra en una cuenta especial del Banco de la Nación a nombre del proveedor.

¿Por qué existe? Para garantizar que el proveedor cuente con fondos para pagar sus obligaciones tributarias.

Tasas más comunes:
• Bienes agrarios y recursos naturales: 4%
• Servicios de transporte de bienes: 4%
• Servicios en general (contratos de construcción, etc.): 12%
• Arrendamiento de bienes muebles: 10%
• Intermediación laboral: 12%

Umbral: aplica cuando el monto de la operación supera S/ 700.

Cuenta de detracciones: los fondos solo pueden usarse para pagar tributos, multas e intereses a SUNAT. El remanente puede liberarse semestralmente.

El incumplimiento genera multas del 50% al 100% del monto no depositado.`,
  },
  {
    keywords: ['regimen tributario', 'rus', 'nrus', 'nuevo rus', 'rer', 'regimen especial', 'rmt', 'regimen mype', 'regimen general', 'que regimen elegir', 'cambiar regimen'],
    response: `Regímenes Tributarios

NRUS — Nuevo Régimen Único Simplificado
• Para negocios pequeños con ventas hasta S/ 8,000/mes
• Pago fijo mensual (S/ 20 o S/ 50 según categoría)
• Solo emite boletas, NO facturas
• No declara IGV ni Renta por separado

RER — Régimen Especial de Renta
• Ventas anuales hasta S/ 525,000
• Impuesto a la Renta: 1.5% mensual sobre ingresos netos
• Sí emite facturas y boletas
• Declara IGV mensualmente

RMT — Régimen MYPE Tributario
• Sin límite de ingresos (orientado a MYPE)
• Renta: escala progresiva (10% hasta 15 UIT de utilidad, 29.5% sobre el exceso)
• Emite todos los tipos de comprobante
• Obligación de llevar contabilidad según nivel de ingresos

Régimen General
• Sin restricciones de ingresos
• Renta: 29.5% sobre la utilidad neta
• Todos los comprobantes
• Contabilidad completa obligatoria`,
  },
  {
    keywords: ['uit', 'unidad impositiva tributaria', 'uit 2025', 'valor uit', 'uit vigente'],
    response: `UIT — Unidad Impositiva Tributaria

Valor vigente 2025: S/ 5,350

La UIT es la unidad de referencia que usa SUNAT para calcular multas, sanciones, tramos exonerados de impuestos y otros valores tributarios.

Usos frecuentes:
• Tramo exonerado de Renta de 4ta categoría: hasta 7 UIT anuales (S/ 37,450 en 2025)
• Renta de 5ta categoría: deducción de 7 UIT del ingreso anual
• Multas e infracciones tributarias: expresadas en porcentajes de la UIT
• ITAN: exonerados contribuyentes con activos netos hasta 1,000,000 UIT... (en realidad el umbral es S/ 1,000,000)
• Contabilidad simplificada: empresas con ingresos hasta 300 UIT/año

Historial reciente:
• 2024: S/ 5,150
• 2023: S/ 4,950
• 2022: S/ 4,600`,
  },
  {
    keywords: ['libros electronicos', 'ple', 'sire', 'libro diario', 'libro mayor', 'registro compras', 'registro ventas', 'obligacion libros', 'quien lleva libros'],
    response: `Libros Electrónicos

PLE — Programa de Libros Electrónicos (en proceso de sustitución por SIRE)
• Generados por el contribuyente y validados con el PLE de SUNAT
• Principales: Registro de Ventas, Registro de Compras, Libro Diario, Libro Mayor

SIRE — Sistema Integrado de Registros Electrónicos (vigente desde 2023)
• Sustituye al PLE para Registro de Ventas e Ingresos, y Registro de Compras
• SUNAT propone una versión prellenada que el contribuyente revisa y confirma
• Obligatorio en fases según ingresos del contribuyente

¿Quién está obligado a llevar libros?
• NRUS: no lleva libros contables
• RER: Registro de Ventas y Registro de Compras
• RMT hasta 300 UIT: Libro Diario Simplificado + Registros de Ventas y Compras
• RMT más de 300 UIT y Régimen General: contabilidad completa

Plazos de cierre: los libros electrónicos se cierran el día hábil siguiente al vencimiento de la declaración mensual del período.`,
  },
  {
    keywords: ['comprobante electronico', 'factura electronica', 'boleta electronica', 'ose', 'see', 'xml', 'cdr', 'sunat online exchange', 'facturacion electronica', 'obligatorio electronico'],
    response: `Comprobantes Electrónicos

La facturación electrónica es obligatoria para la mayoría de contribuyentes en Perú.

Sistemas de emisión:
• SEE-SOL: sistema gratuito de SUNAT, emite directamente desde el portal. Recomendado para bajos volúmenes.
• SEE-Contribuyente: sistema propio del contribuyente (ERP, software de facturación) enviado vía API a SUNAT u OSE.
• OSE — Operador de Servicios Electrónicos: empresa certificada por SUNAT que valida y envía los comprobantes.

Flujo de emisión electrónica:
1. Generación del XML (formato UBL 2.1)
2. Firma digital con certificado
3. Envío a SUNAT o a OSE
4. Recepción del CDR (Constancia de Recepción) — si es "0" es aceptado
5. Envío del PDF + XML al cliente

Representación impresa: el PDF con código QR es la representación impresa válida.

Obligatoriedad: prácticamente todas las empresas están obligadas. La fecha de entrada varía según el tipo de contribuyente (principales contribuyentes desde 2014, MYPE desde 2022–2024).`,
  },
  {
    keywords: ['itan', 'impuesto temporal activos netos', 'activos netos', 'itan 2025', 'pago itan', 'acreditacion itan'],
    response: `ITAN — Impuesto Temporal a los Activos Netos

Tasa: 0.4% sobre el valor de los activos netos al 31 de diciembre del año anterior que superen S/ 1,000,000.

¿Quién paga?
• Contribuyentes del Régimen General y RMT con activos netos superiores a S/ 1,000,000.
• Excluidos: empresas en etapa preoperativa, entidades inafectas al IR.

Declaración y pago: a través del PDT 648. El pago puede ser al contado o en 9 cuotas mensuales (de abril a diciembre).

Acreditación: el ITAN pagado puede acreditarse (descontarse) contra los pagos a cuenta del Impuesto a la Renta del mismo ejercicio o solicitar devolución.

Si no se acredita totalmente en el año, el saldo NO puede arrastrarse al año siguiente, pero sí puede pedirse devolución.

Plazo de declaración: según cronograma SUNAT (generalmente en marzo/abril del año siguiente al ejercicio gravado).`,
  },
  {
    keywords: ['multa', 'sancion', 'infraccion', 'regimen gradualidad', 'rebaja multa', 'no emitir comprobante', 'no declarar', 'declarar fuera plazo'],
    response: `Infracciones y Multas SUNAT

Infracciones más comunes:

No emitir comprobante de pago:
• Multa: 1 UIT (S/ 5,350 en 2025) o cierre del local (2–10 días)

Declarar fuera de plazo:
• Multa: 1 UIT con rebaja del 90% si se subsana voluntariamente antes de notificación

No presentar declaración:
• Multa: 1 UIT para principales contribuyentes; 50% de la UIT para otros

Régimen de Gradualidad — rebajas por subsanación:
• Antes de cualquier notificación SUNAT: hasta 95% de rebaja
• Después de notificación pero antes de inicio de cobranza: 70% de rebaja
• Durante la cobranza: 40% de rebaja

Importante: pagar la multa con rebaja máxima + intereses moratorios (TIM: tasa de interés moratorio) es siempre más conveniente que esperar.

Consulta tus deudas en el Portal SOL → Mis declaraciones y pagos → Mis deudas.`,
  },
  {
    keywords: ['cronograma', 'vencimiento', 'plazo declaracion', 'fecha pago', 'cuando declarar', 'ultimo digito ruc', 'calendario tributario'],
    response: `Cronograma de Obligaciones Mensuales

SUNAT establece fechas de vencimiento para declarar y pagar IGV + Renta mensual (PDT 621 / Formulario Virtual 621) según el último dígito del RUC:

Último dígito → Día hábil aproximado del mes siguiente:
• 0: día 10
• 1: día 11
• 2: día 12
• 3: día 13
• 4: día 14
• 5: día 15
• 6: día 16
• 7: día 17
• 8: día 18
• 9: día 19
• Buenos contribuyentes: días 20–22 (un día adicional)

Las fechas exactas varían cada año. Consulta el cronograma oficial actualizado en: sunat.gob.pe → Orientación Tributaria → Cronograma de Obligaciones.

Si el día de vencimiento cae en feriado o fin de semana, el plazo se extiende al siguiente día hábil.`,
  },
  {
    keywords: ['renta cuarta categoria', 'cuarta categoria', 'honorarios', 'recibo por honorarios', 'suspension retenciones', 'profesional independiente'],
    response: `Renta de 4ta Categoría — Trabajadores Independientes

Aplica a: profesionales independientes, directores de empresa, regidores, etc. que emiten recibos por honorarios.

Tasa de retención: 8% sobre el monto del honorario (cuando el pagador es empresa o persona con negocio).

Exoneración de retención: si tus ingresos proyectados en el año no superan las 7 UIT (S/ 37,450 en 2025), puedes solicitar suspensión de retenciones en el Portal SOL.

Pago a cuenta mensual: si en el mes recibes honorarios sin retención superiores a S/ 3,063, debes hacer un pago a cuenta del 8%.

Declaración anual: en la Declaración Jurada Anual (marzo–abril del año siguiente) se regulariza el impuesto. Se aplica escala progresiva:
• Hasta 5 UIT: 8%
• De 5 a 20 UIT: 14%
• De 20 a 35 UIT: 17%
• De 35 a 45 UIT: 20%
• Más de 45 UIT: 30%`,
  },
  {
    keywords: ['fraccionamiento', 'aplazamiento', 'deuda tributaria', 'refinanciamiento', 'pagar deuda sunat', 'cuotas deuda'],
    response: `Fraccionamiento y Aplazamiento de Deuda Tributaria

Si tienes deuda con SUNAT puedes solicitar un fraccionamiento o aplazamiento bajo el Artículo 36° del Código Tributario.

Requisitos:
• Deuda en etapa de cobranza ordinaria o cobranza coactiva
• No tener resoluciones de pérdida de fraccionamiento no pagadas
• Presentar solicitud en el Portal SOL

Plazo máximo: hasta 72 meses para fraccionamiento.

Tasa de interés: 80% de la TIM (Tasa de Interés Moratorio) vigente.

La TIM actual es de 1.0% mensual para deudas en soles, por lo que el fraccionamiento tiene una tasa de 0.8% mensual.

Garantías: pueden exigirse garantías (carta fianza, hipoteca) para deudas grandes.

También existe el RAF (Régimen de Aplazamiento y Fraccionamiento COVID-19) para deudas del período 2020, con condiciones especiales.`,
  },
];

// ---------------------------------------------------------------------------
// Keyword matching — retorna la mejor entrada de la base de conocimiento
// ---------------------------------------------------------------------------

function findBestMatch(query: string): KnowledgeEntry | null {
  const normalized = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let bestEntry: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normalizedKeyword)) {
        score += normalizedKeyword.split(' ').length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestScore > 0 ? bestEntry : null;
}

const NO_MATCH_RESPONSE = `No encontré información específica sobre ese tema en mi base de conocimiento actual.

Puedes consultarme sobre:
• IGV y crédito fiscal
• RUC (obtención, estados, verificación)
• Facturas y boletas de venta
• Notas de crédito
• Portal SOL y Clave SOL
• Detracciones (SPOT)
• Regímenes tributarios (NRUS, RER, RMT, General)
• UIT 2025
• Libros electrónicos (PLE / SIRE)
• Comprobantes electrónicos y facturación electrónica
• ITAN
• Multas e infracciones
• Cronograma de declaraciones
• Renta de 4ta categoría
• Fraccionamiento de deuda

También puedes visitar sunat.gob.pe para consultas oficiales.`;

// ---------------------------------------------------------------------------
// Exported function — sin requests externos
// ---------------------------------------------------------------------------

export async function queryLocalKnowledge(text: string): Promise<{ message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const match = findBestMatch(text);
  return { message: match ? match.response : NO_MATCH_RESPONSE };
}
