import * as Sentry from '@sentry/node';
import logger from '../../lib/logger.js';

const MODELS = [
  'gemini-2.5-flash-lite',          // Stable — primary
  'gemini-3.1-flash-lite-preview',  // Preview — fallback 1
  'gemini-2.5-flash',               // Stable — fallback 2
];

function vendorSlug(name) {
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

/**
 * Parse a localized amount string handling both Argentine (dot=thousands, comma=decimal)
 * and US (comma=thousands, dot=decimal) formats.
 *
 * Rules:
 * - Both "." and "," present → last separator is the decimal one
 * - Single separator with 3 digits after → thousands (except "0.xxx" → decimal)
 * - Single separator with 1-2 digits after → decimal
 * - Multiple dots or commas → all are thousands separators
 */
function parseLocalizedAmount(raw) {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return 0;

  const str = raw.replace(/[^0-9.,]/g, '');
  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.500,50 → Argentine
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
    // 1,500.50 → US
    return parseFloat(str.replace(/,/g, '')) || 0;
  }

  if (hasComma) {
    if ((str.match(/,/g) || []).length > 1) return parseFloat(str.replace(/,/g, '')) || 0;
    const afterComma = str.split(',').pop();
    if (afterComma.length === 3) return parseFloat(str.replace(/,/g, '')) || 0;
    return parseFloat(str.replace(',', '.')) || 0;
  }

  if (hasDot) {
    if ((str.match(/\./g) || []).length > 1) return parseFloat(str.replace(/\./g, '')) || 0;
    const parts = str.split('.');
    const beforeDot = parts[0];
    const afterDot = parts[1];
    if (afterDot.length === 3 && beforeDot !== '0') return parseFloat(str.replace(/\./g, '')) || 0;
    return parseFloat(str) || 0;
  }

  return parseFloat(str) || 0;
}

function normalizeAmounts(parsed) {
  if (Array.isArray(parsed.items)) {
    parsed.items = parsed.items.map(i => ({
      ...i,
      amount: parseLocalizedAmount(i.amount)
    }));
  }
  parsed.totalAmount = parseLocalizedAmount(parsed.totalAmount);
  return parsed;
}

class GeminiHandler {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.exhaustedModels = new Map(); // model -> 'YYYY-MM-DD'
  }

  _isExhausted(model) {
    const today = new Date().toISOString().slice(0, 10);
    return this.exhaustedModels.get(model) === today;
  }

  _markExhausted(model) {
    const today = new Date().toISOString().slice(0, 10);
    this.exhaustedModels.set(model, today);
  }

  async generateContent(prompt, options = {}) {
    for (const model of MODELS) {
      if (this._isExhausted(model)) continue;

      const result = await this._tryWithModel(model, prompt, options);

      if (result?.error === 'rate_limit') {
        this._markExhausted(model);
        Sentry.captureMessage('Gemini model exhausted, rotating', { level: 'warning', extra: { model } });
        logger.info('Model exhausted, rotating to next', { model });
        continue;
      }

      if (result?.error === 'unavailable_503') {
        logger.info('Model unavailable (503), rotating to next', { model });
        continue;
      }

      return result; // success, unavailable, or null
    }

    // All models exhausted
    Sentry.captureException(new Error('All Gemini models exhausted'));
    logger.error('All Gemini models exhausted');
    return { error: 'rate_limit' };
  }

  async _tryWithModel(model, prompt, { maxOutputTokens = 500, temperature = 0.7, parts = null, responseSchema = null } = {}) {
    const maxRetries = 2;
    const retryDelays = [2000, 5000];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const contents = parts
          ? [{ parts }]
          : [{ parts: [{ text: prompt }] }];

        const generationConfig = { maxOutputTokens, temperature };
        if (responseSchema) {
          generationConfig.responseMimeType = 'application/json';
          generationConfig.responseSchema = responseSchema;
        }

        const response = await fetch(
          `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig
            })
          }
        );

        if (!response.ok) {
          const responseText = await response.text();

          if (response.status === 429) {
            Sentry.captureMessage('Gemini API 429 - rate limited', { level: 'warning', extra: { model } });
            logger.warn('Gemini API rate limited', { model });
            return { error: 'rate_limit' };
          }

          if (response.status === 503) {
            if (attempt < maxRetries) {
              logger.warn('Gemini API 503, retrying', { model, attempt: attempt + 1, delay: retryDelays[attempt] });
              await new Promise(r => setTimeout(r, retryDelays[attempt]));
              continue;
            }
            // All retries exhausted for this model — signal to rotate
            logger.warn('Gemini API 503 persistent, rotating model', { model });
            return { error: 'unavailable_503' };
          }

          const error = new Error(`Gemini API error: ${response.status}`);
          Sentry.captureException(error, { extra: { response: responseText, status: response.status, model } });
          logger.error('Gemini API error', { status: response.status, model, response: responseText });
          return { error: 'unavailable' };
        }

        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
      } catch (error) {
        if (attempt < maxRetries) {
          logger.warn('Gemini request failed, retrying', { model, attempt: attempt + 1, error: error.message });
          await new Promise(r => setTimeout(r, retryDelays[attempt]));
          continue;
        }
        Sentry.captureException(error, { extra: { model } });
        logger.error('Error calling Gemini', { model, error });
        return { error: 'unavailable' };
      }
    }
    return { error: 'unavailable' };
  }

  async parseReceiptImage(imageBase64, mimeType = 'image/jpeg', { caption = '', activeProjects = [], categories = null, recipients = [], paymentMethods = [], vendors = [], managementFeePercent = 0 } = {}) {
    const projectList = activeProjects.length > 0
      ? `\nProyectos activos (usa el ID exacto si el usuario menciona uno en el texto):\n${activeProjects.map(p => `- ID: "${p.id}", Nombre: "${p.name}", Tag: "#${p.tag}"${p.clientName ? `, Cliente: "${p.clientName}"` : ''}`).join('\n')}`
      : '';

    const recipientList = recipients.length > 0
      ? `\nDestinatarios conocidos (usa el ID exacto si el usuario menciona uno en el texto):\n${recipients.map(r => `- ID: "${r.id}", Nombre: "${r.name}", Plataforma: "${r.platform || ''}"`).join('\n')}`
      : '';

    const methodList = paymentMethods.length > 0
      ? `\nMétodos de pago válidos: ${paymentMethods.join(', ')}`
      : '';

    const vendorList = vendors.length > 0
      ? `\nComercio/proveedores conocidos (usa el ID exacto si coincide):\n${vendors.map(v => `- ID: "${v.id}", Nombre: "${v.name}"`).join('\n')}`
      : '';

    const captionBlock = caption
      ? `\n\nEl usuario envió este texto junto con la imagen: "${caption}"`
      : '';

    const feeBlock = managementFeePercent > 0
      ? `\n- "applyManagementFee": true si el texto dice "con gestión", "con fee", "con comisión". false en caso contrario. Solo aplica a expenses.`
      : '';

    const prompt = `Analiza esta imagen. Puede ser un ticket/factura de compra, un comprobante de transferencia bancaria, o un comprobante de pago.
${captionBlock}

- "transactionType": detecta el tipo segun la imagen Y el texto del usuario:
  - "expense" para tickets de compra, facturas, recibos de comercio
  - "payment" para capturas de transferencia bancaria, comprobantes de pago, vouchers de deposito
  - "payment" también si el texto del usuario indica cobro: "me ingresó", "me pagaron", "cobro", "me transfirieron", "me depositaron", "me ingresaron"
  - "provider_expense" si el texto del usuario dice "gasto propio", "gasto mio", "puse de mi bolsillo", "pague yo", "puse yo"
- IMPORTANTE: Devolver "amount" y "totalAmount" como STRINGS con el formato EXACTO tal como aparece en el comprobante (ej: "49.350", "7.600", "1.500,50"). NO convertir a numero. Nosotros lo parseamos despues.
- Cada item debe tener "name" y "amount":
  - "name": descripción corta y legible. Si la cantidad es mayor a 1, incluir la cantidad al final con el formato " | x<cantidad> u". Ejemplos: "Bolsa Cemento 25kg Holcim | x10 u", "Arena Lavada x MT | x2 u". Si es 1 unidad, no agregar cantidad.
  - "amount": SIEMPRE usar el SUBTOTAL de la linea (cantidad x precio unitario), NUNCA el precio unitario solo. Si el comprobante muestra columnas de cantidad, precio unitario y subtotal, usar el valor de subtotal. Devolver como string.
- "totalAmount": Si el comprobante tiene un total impreso, usar ese valor exacto como string. Si NO hay total impreso, sumar los subtotales de todos los items y devolver como string.
- "paymentMethod" y "recipientId" se pueden extraer de la imagen o del texto del usuario
- Los campos installmentPercent y projectId se extraen SOLO del texto del usuario, NO de la imagen
- "installmentPercent": usa "100" SOLO si el TEXTO DEL USUARIO dice "pagado por el cliente", "el cliente pago", "ya esta pago". Caso contrario usa "0". IMPORTANTE: Si la imagen/ticket dice "PAGADO", "CANCELADO", "ABONADO" o similar, eso NO cuenta — es solo el estado del comprobante, no significa que el cliente haya pagado. Solo el texto del usuario determina este campo.
- "paymentMethod": debe ser EXACTAMENTE uno de los metodos validos, o null
- "recipientId": debe ser EXACTAMENTE uno de los IDs listados, o null
- "projectId": debe ser EXACTAMENTE uno de los IDs listados, o null
- "vendorId": debe ser EXACTAMENTE uno de los IDs de comercios listados, o null si no coincide con ninguno
- "vendorName": nombre del comercio/local si se detecta uno nuevo no listado, o null${feeBlock}
Si no podés extraer algún campo, usa null.
${projectList}
${recipientList}
${methodList}
${vendorList}`;

    const schemaProps = {
      transactionType: { type: 'string', enum: ['expense', 'payment', 'provider_expense'] },
      vendorId: { type: 'string', nullable: true },
      vendorName: { type: 'string', nullable: true },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            amount: { type: 'string' }
          },
          required: ['name', 'amount']
        }
      },
      totalAmount: { type: 'string' },
      date: { type: 'string', nullable: true },
      paymentMethod: { type: 'string', nullable: true },
      recipientId: { type: 'string', nullable: true },
      installmentPercent: { type: 'string', enum: ['0', '100'] },
      projectId: { type: 'string', nullable: true }
    };
    if (managementFeePercent > 0) {
      schemaProps.applyManagementFee = { type: 'boolean' };
    }

    const schema = {
      type: 'object',
      properties: schemaProps,
      required: ['transactionType', 'items', 'totalAmount', 'installmentPercent']
    };

    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: imageBase64
        }
      }
    ];

    const text = await this.generateContent(null, {
      maxOutputTokens: 1000,
      temperature: 0.3,
      parts,
      responseSchema: schema
    });

    if (typeof text !== 'string') return text || null;

    try {
      const parsed = JSON.parse(text);
      normalizeAmounts(parsed);
      parsed.installmentPercent = parseInt(parsed.installmentPercent, 10) || 0;
      // Resolve vendor: prefer matched vendorId, fall back to vendorName
      if (parsed.vendorId && vendors.length > 0) {
        const matched = vendors.find(v => v.id === parsed.vendorId);
        parsed.vendor = matched ? matched.name : (parsed.vendorName || null);
      } else {
        parsed.vendor = parsed.vendorName || null;
      }
      return parsed;
    } catch (error) {
      logger.error('Error parsing receipt JSON', { error });
      return null;
    }
  }

  async transcribeAudio(audioBase64, mimeType = 'audio/ogg', { activeProjects = [], categories = null, recipients = [], paymentMethods = [], vendors = [], managementFeePercent = 0 } = {}) {
    const projectList = activeProjects.length > 0
      ? `\nProyectos activos (usa el ID exacto si el usuario menciona uno):\n${activeProjects.map(p => `- ID: "${p.id}", Nombre: "${p.name}", Tag: "#${p.tag}"${p.clientName ? `, Cliente: "${p.clientName}"` : ''}`).join('\n')}`
      : '';

    const recipientList = recipients.length > 0
      ? `\nDestinatarios conocidos (usa el ID exacto si el usuario menciona uno):\n${recipients.map(r => `- ID: "${r.id}", Nombre: "${r.name}", Plataforma: "${r.platform || ''}"`).join('\n')}`
      : '';

    const categoryList = categories
      ? `\nCategorías válidas: ${categories.join(', ')}`
      : '\nCategorías válidas: materiales, herramientas, transporte, mano de obra, comida, otros';

    const methodList = paymentMethods.length > 0
      ? `\nMétodos de pago válidos: ${paymentMethods.join(', ')}`
      : '\nMétodos de pago válidos: transferencia, efectivo, tarjeta, mercadopago';

    const vendorList = vendors.length > 0
      ? `\nComercio/proveedores conocidos (usa el ID exacto si coincide):\n${vendors.map(v => `- ID: "${v.id}", Nombre: "${v.name}"`).join('\n')}`
      : '';

    const feeRule = managementFeePercent > 0
      ? `\n- "applyManagementFee": true si dice "con gestión", "con fee", "con comisión". false en caso contrario. Solo aplica a expenses.`
      : '';

    const prompt = `Transcribí este audio en español argentino. El audio describe un gasto de obra, un pago recibido, o un gasto propio del proveedor.
Extrae la información en formato JSON.
${projectList}
${recipientList}
${categoryList}
${methodList}
${vendorList}

Reglas importantes:
- "transactionType": detecta el tipo segun lo que dice la persona:
  - "payment" si dice "pago", "cobro", "me pagaron", "me transfirieron", "recibi plata", "me depositaron", "me ingresó", "me ingresaron", "ingresó plata"
  - "provider_expense" si dice "gasto propio", "gasto mio", "puse de mi bolsillo", "pague yo", "puse yo"
  - "expense" para compras y gastos normales de obra (materiales, herramientas, mano de obra, etc.)
  - Si no estas seguro, usa "expense"
  - Si menciona el nombre de un cliente conocido de un proyecto junto con un monto (ej: "me ingresó María 50000"), es "payment"
- "items" es un array con CADA item/gasto mencionado, cada uno con "name" y "amount"
- "totalAmount" es la suma de todos los amounts de los items
- Si se menciona un solo gasto, pone un solo item en el array
- Si se menciona un monto total pero no los items individuales, pone un solo item con ese monto
- "installmentPercent": usa 100 SOLO si dice "pagado por el cliente", "el cliente pago", "ya esta pago". Caso contrario usa 0
- "paymentMethod": debe ser EXACTAMENTE uno de los metodos validos, o null si no se menciona
- "recipientId": debe ser EXACTAMENTE uno de los IDs de destinatarios listados, o null si no se menciona
- "projectId": debe ser EXACTAMENTE uno de los IDs de proyectos listados si el usuario menciona un proyecto, o null
- "vendorId": debe ser EXACTAMENTE uno de los IDs de comercios listados, o null si no coincide con ninguno
- "vendorName": nombre del comercio/local si se detecta uno nuevo no listado, o null${feeRule}
Si no podés extraer algún campo, usa null.`;

    const audioSchemaProps = {
      transcription: { type: 'string' },
      transactionType: { type: 'string', enum: ['expense', 'payment', 'provider_expense'] },
      title: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            amount: { type: 'number' }
          },
          required: ['name', 'amount']
        }
      },
      totalAmount: { type: 'number' },
      description: { type: 'string', nullable: true },
      category: { type: 'string', nullable: true },
      paymentMethod: { type: 'string', nullable: true },
      recipientId: { type: 'string', nullable: true },
      installmentPercent: { type: 'string', enum: ['0', '100'] },
      projectId: { type: 'string', nullable: true },
      vendorId: { type: 'string', nullable: true },
      vendorName: { type: 'string', nullable: true }
    };
    if (managementFeePercent > 0) {
      audioSchemaProps.applyManagementFee = { type: 'boolean' };
    }

    const schema = {
      type: 'object',
      properties: audioSchemaProps,
      required: ['transcription', 'transactionType', 'title', 'items', 'totalAmount', 'installmentPercent']
    };

    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: audioBase64
        }
      }
    ];

    const text = await this.generateContent(null, {
      maxOutputTokens: 1000,
      temperature: 0.3,
      parts,
      responseSchema: schema
    });

    if (!text) return null;

    try {
      const parsed = JSON.parse(text);
      parsed.installmentPercent = parseInt(parsed.installmentPercent, 10) || 0;
      if (parsed.vendorId && vendors.length > 0) {
        const matched = vendors.find(v => v.id === parsed.vendorId);
        parsed.vendor = matched ? matched.name : (parsed.vendorName || null);
      } else {
        parsed.vendor = parsed.vendorName || null;
      }
      return parsed;
    } catch (error) {
      logger.error('Error parsing audio transcription JSON', { error });
      return null;
    }
  }

  async parseTextExpense(text, { activeProjects = [], categories = null, recipients = [], paymentMethods = [], vendors = [], managementFeePercent = 0 } = {}) {
    const projectList = activeProjects.length > 0
      ? `\nProyectos activos (usa el ID exacto si el usuario menciona uno):\n${activeProjects.map(p => `- ID: "${p.id}", Nombre: "${p.name}", Tag: "#${p.tag}"${p.clientName ? `, Cliente: "${p.clientName}"` : ''}`).join('\n')}`
      : '';

    const recipientList = recipients.length > 0
      ? `\nDestinatarios conocidos (usa el ID exacto si el usuario menciona uno):\n${recipients.map(r => `- ID: "${r.id}", Nombre: "${r.name}", Plataforma: "${r.platform || ''}"`).join('\n')}`
      : '';

    const categoryList = categories
      ? `\nCategorías válidas: ${categories.join(', ')}`
      : '\nCategorías válidas: materiales, herramientas, transporte, mano de obra, comida, otros';

    const methodList = paymentMethods.length > 0
      ? `\nMétodos de pago válidos: ${paymentMethods.join(', ')}`
      : '\nMétodos de pago válidos: transferencia, efectivo, tarjeta, mercadopago';

    const vendorList = vendors.length > 0
      ? `\nComercio/proveedores conocidos (usa el ID exacto si coincide):\n${vendors.map(v => `- ID: "${v.id}", Nombre: "${v.name}"`).join('\n')}`
      : '';

    const prompt = `Analiza este mensaje de un proveedor de obra que describe un gasto, pago, o gasto propio. Extrae la información en formato JSON:
{
  "transactionType": "expense|payment|provider_expense",
  "title": "titulo corto",
  "items": [{"name": "item", "amount": 123.45}],
  "totalAmount": 1234.56,
  "description": "descripción adicional",
  "category": "<de las categorias validas>",
  "paymentMethod": "<metodo de pago o null>",
  "recipientId": "<ID del destinatario o null>",
  "installmentPercent": 0,
  "projectId": "<ID del proyecto si se menciona, o null>",
  "vendorId": "<ID del comercio conocido, o null>",
  "vendorName": "<nombre del comercio nuevo, o null>"
}

Mensaje: "${text}"
${projectList}
${recipientList}
${categoryList}
${methodList}
${vendorList}

Reglas importantes:
- "transactionType": detecta el tipo segun lo que dice la persona:
  - "payment" si dice "pago", "cobro", "me pagaron", "me transfirieron", "recibi plata", "me depositaron", "me ingresó", "me ingresaron", "ingresó plata"
  - "provider_expense" si dice "gasto propio", "gasto mio", "puse de mi bolsillo", "pague yo", "puse yo"
  - "expense" para compras y gastos normales de obra (materiales, herramientas, mano de obra, etc.)
  - Si no estas seguro, usa "expense"
  - Si menciona el nombre de un cliente conocido de un proyecto junto con un monto (ej: "me ingresó María 50000"), es "payment"
- "items" es un array con CADA item/gasto mencionado, cada uno con "name" y "amount"
- "totalAmount" es la suma de todos los amounts de los items
- Si se menciona un solo gasto, pone un solo item en el array
- "installmentPercent": usa 100 SOLO si dice "pagado por el cliente", "el cliente pago", "ya esta pago". Caso contrario usa 0
- "paymentMethod": debe ser EXACTAMENTE uno de los metodos validos, o null si no se menciona
- "recipientId": debe ser EXACTAMENTE uno de los IDs de destinatarios listados, o null si no se menciona
- "projectId": debe ser EXACTAMENTE uno de los IDs de proyectos listados si el usuario menciona un proyecto, o null
- "vendorId": debe ser EXACTAMENTE uno de los IDs de comercios listados, o null si no coincide con ninguno
- "vendorName": nombre del comercio/local si se detecta uno nuevo no listado, o null${managementFeePercent > 0 ? '\n- "applyManagementFee": true si dice "con gestión", "con fee", "con comisión". false en caso contrario. Solo aplica a expenses.' : ''}
- "isSupportQuestion": true SOLO si el mensaje es claramente una pregunta general, saludo, consulta de soporte, o texto sin relacion a un gasto/pago. Ejemplos: "hola", "como funciona esto", "necesito ayuda", "es seguro registrar aca", "que tipos de transacciones hay". false para todo lo que pueda ser un gasto, pago, o gasto propio. En caso de duda, usa false.
Si no podés extraer algún campo, usa null.`;

    const textSchemaProps = {
      transactionType: { type: 'string', enum: ['expense', 'payment', 'provider_expense'] },
      title: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            amount: { type: 'number' }
          },
          required: ['name', 'amount']
        }
      },
      totalAmount: { type: 'number' },
      description: { type: 'string', nullable: true },
      category: { type: 'string', nullable: true },
      paymentMethod: { type: 'string', nullable: true },
      recipientId: { type: 'string', nullable: true },
      installmentPercent: { type: 'string', enum: ['0', '100'] },
      projectId: { type: 'string', nullable: true },
      vendorId: { type: 'string', nullable: true },
      vendorName: { type: 'string', nullable: true },
      isSupportQuestion: { type: 'boolean' }
    };
    if (managementFeePercent > 0) {
      textSchemaProps.applyManagementFee = { type: 'boolean' };
    }

    const schema = {
      type: 'object',
      properties: textSchemaProps,
      required: ['transactionType', 'title', 'items', 'totalAmount', 'installmentPercent', 'isSupportQuestion']
    };

    const responseText = await this.generateContent(prompt, {
      maxOutputTokens: 800,
      temperature: 0.3,
      responseSchema: schema
    });

    if (typeof responseText !== 'string') return responseText || null;

    try {
      const parsed = JSON.parse(responseText);
      parsed.installmentPercent = parseInt(parsed.installmentPercent, 10) || 0;
      if (parsed.vendorId && vendors.length > 0) {
        const matched = vendors.find(v => v.id === parsed.vendorId);
        parsed.vendor = matched ? matched.name : (parsed.vendorName || null);
      } else {
        parsed.vendor = parsed.vendorName || null;
      }
      return parsed;
    } catch (error) {
      logger.error('Error parsing text expense JSON', { error });
      return null;
    }
  }

  async parseDocument(pdfBase64, mimeType = 'application/pdf', { caption = '', activeProjects = [], categories = null, recipients = [], paymentMethods = [], vendors = [], managementFeePercent = 0 } = {}) {
    const projectList = activeProjects.length > 0
      ? `\nProyectos activos (usa el ID exacto si el usuario menciona uno en el texto):\n${activeProjects.map(p => `- ID: "${p.id}", Nombre: "${p.name}", Tag: "#${p.tag}"${p.clientName ? `, Cliente: "${p.clientName}"` : ''}`).join('\n')}`
      : '';

    const recipientList = recipients.length > 0
      ? `\nDestinatarios conocidos (usa el ID exacto si el usuario menciona uno en el texto):\n${recipients.map(r => `- ID: "${r.id}", Nombre: "${r.name}", Plataforma: "${r.platform || ''}"`).join('\n')}`
      : '';

    const methodList = paymentMethods.length > 0
      ? `\nMétodos de pago válidos: ${paymentMethods.join(', ')}`
      : '';

    const vendorList = vendors.length > 0
      ? `\nComercio/proveedores conocidos (usa el ID exacto si coincide):\n${vendors.map(v => `- ID: "${v.id}", Nombre: "${v.name}"`).join('\n')}`
      : '';

    const captionBlock = caption
      ? `\n\nEl usuario envió este texto junto con el documento: "${caption}"`
      : '';

    const prompt = `Analiza este documento PDF. Puede ser una factura, presupuesto, ticket de compra, o comprobante de pago.
${captionBlock}

- "transactionType": detecta el tipo segun el documento Y el texto del usuario:
  - "expense" para facturas de compra, presupuestos, recibos de comercio
  - "payment" para comprobantes de transferencia bancaria, recibos de pago, vouchers de deposito
  - "payment" también si el texto del usuario indica cobro: "me ingresó", "me pagaron", "cobro", "me transfirieron", "me depositaron", "me ingresaron"
  - "provider_expense" si el texto del usuario dice "gasto propio", "gasto mio", "puse de mi bolsillo", "pague yo", "puse yo"
- IMPORTANTE: Devolver "amount" y "totalAmount" como STRINGS con el formato EXACTO tal como aparece en el documento (ej: "49.350", "7.600", "1.500,50"). NO convertir a numero. Nosotros lo parseamos despues.
- Cada item debe tener "name" y "amount":
  - "name": descripción corta y legible. Si la cantidad es mayor a 1, incluir la cantidad al final con el formato " | x<cantidad> u". Ejemplos: "Bolsa Cemento 25kg Holcim | x10 u", "Arena Lavada x MT | x2 u". Si es 1 unidad, no agregar cantidad.
  - "amount": SIEMPRE usar el SUBTOTAL de la linea (cantidad x precio unitario), NUNCA el precio unitario solo. Si el comprobante muestra columnas de cantidad, precio unitario y subtotal, usar el valor de subtotal. Devolver como string.
- "totalAmount": Si el documento tiene un total impreso, usar ese valor exacto como string. Si NO hay total impreso, sumar los subtotales de todos los items y devolver como string.
- "paymentMethod" y "recipientId" se pueden extraer del documento o del texto del usuario
- Los campos installmentPercent y projectId se extraen SOLO del texto del usuario, NO del documento
- "installmentPercent": usa "100" SOLO si el TEXTO DEL USUARIO dice "pagado por el cliente", "el cliente pago", "ya esta pago". Caso contrario usa "0". IMPORTANTE: Si el documento dice "PAGADO", "CANCELADO", "ABONADO" o similar, eso NO cuenta — es solo el estado del comprobante, no significa que el cliente haya pagado. Solo el texto del usuario determina este campo.
- "paymentMethod": debe ser EXACTAMENTE uno de los metodos validos, o null
- "recipientId": debe ser EXACTAMENTE uno de los IDs listados, o null
- "projectId": debe ser EXACTAMENTE uno de los IDs listados, o null
- "vendorId": debe ser EXACTAMENTE uno de los IDs de comercios listados, o null si no coincide con ninguno
- "vendorName": nombre del comercio/local si se detecta uno nuevo no listado, o null${managementFeePercent > 0 ? '\n- "applyManagementFee": true si el texto dice "con gestión", "con fee", "con comisión". false en caso contrario. Solo aplica a expenses.' : ''}
Si no podés extraer algún campo, usa null.
${projectList}
${recipientList}
${methodList}
${vendorList}`;

    const docSchemaProps = {
      transactionType: { type: 'string', enum: ['expense', 'payment', 'provider_expense'] },
      vendorId: { type: 'string', nullable: true },
      vendorName: { type: 'string', nullable: true },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            amount: { type: 'string' }
          },
          required: ['name', 'amount']
        }
      },
      totalAmount: { type: 'string' },
      date: { type: 'string', nullable: true },
      paymentMethod: { type: 'string', nullable: true },
      recipientId: { type: 'string', nullable: true },
      installmentPercent: { type: 'string', enum: ['0', '100'] },
      projectId: { type: 'string', nullable: true }
    };
    if (managementFeePercent > 0) {
      docSchemaProps.applyManagementFee = { type: 'boolean' };
    }

    const schema = {
      type: 'object',
      properties: docSchemaProps,
      required: ['transactionType', 'items', 'totalAmount', 'installmentPercent']
    };

    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: pdfBase64
        }
      }
    ];

    const text = await this.generateContent(null, {
      maxOutputTokens: 1000,
      temperature: 0.3,
      parts,
      responseSchema: schema
    });

    if (typeof text !== 'string') return text || null;

    try {
      const parsed = JSON.parse(text);
      normalizeAmounts(parsed);
      parsed.installmentPercent = parseInt(parsed.installmentPercent, 10) || 0;
      if (parsed.vendorId && vendors.length > 0) {
        const matched = vendors.find(v => v.id === parsed.vendorId);
        parsed.vendor = matched ? matched.name : (parsed.vendorName || null);
      } else {
        parsed.vendor = parsed.vendorName || null;
      }
      return parsed;
    } catch (error) {
      logger.error('Error parsing document JSON', { error });
      return null;
    }
  }

  async categorizeExpense(title, description = '', categories = null) {
    const validCategories = categories || ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];
    const categoryList = validCategories.map(c => `- ${c}`).join('\n');

    const prompt = `Clasifica el siguiente gasto de obra/refacción de departamento en una de estas categorías:
${categoryList}

Gasto: "${title}"${description ? `\nDescripción: "${description}"` : ''}

Responde SOLO con el nombre de la categoría en minúsculas, sin texto adicional.`;

    const text = await this.generateContent(prompt, { maxOutputTokens: 50, temperature: 0.2 });

    if (typeof text !== 'string') return validCategories.includes('otros') ? 'otros' : validCategories[validCategories.length - 1];

    const normalized = text.trim().toLowerCase();

    return validCategories.find(c => normalized.includes(c)) || (validCategories.includes('otros') ? 'otros' : validCategories[validCategories.length - 1]);
  }
  async answerSupportQuestion(question, faqEntries, conversationHistory = []) {
    const faqContext = faqEntries
      .map(entry => `Tema: ${entry.topicLabel}\nPregunta: ${entry.question}\nRespuesta: ${entry.answer}`)
      .join('\n\n---\n\n');

    let historyBlock = '';
    if (conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-3);
      historyBlock = '\nConversación previa:\n' +
        recent.map(qa => `Usuario: ${qa.question}\nAsistente: ${qa.answer}`).join('\n\n') +
        '\n';
    }

    const prompt = `Sos un asistente de soporte de "Gasto Obra", una plataforma de gestión de gastos para obras y refacciones de departamentos en Argentina.

Contexto de la plataforma:
- Gasto Obra está pensada para que profesionales de obra (arquitectos, gestores, maestros mayores de obra) puedan registrar y gestionar los gastos de sus proyectos e informar a sus clientes de forma transparente. En la plataforma, a este rol lo llamamos "profesional" o "técnico".
- El usuario con el que estás hablando es un profesional/técnico. Es la única persona que puede registrar transacciones (gastos, pagos, gastos propios) en el proyecto. Lo hace enviando mensajes por WhatsApp (texto, fotos, audios o PDFs).
- El cliente (dueño del departamento) solo puede visualizar los gastos a través de un link que le comparte el profesional. No tiene cuenta ni puede registrar nada.
- Cada profesional puede tener múltiples proyectos activos. Usá el comando *PROYECTO* para elegir en cuál registrar.
- Por ahora, solo un profesional puede estar asignado a cada proyecto. Si necesitan que más de una persona registre gastos, deben contactar a soporte.
- Comandos disponibles por WhatsApp: *VINCULAR* (vincular cuenta), *DESVINCULAR*, *PROYECTO* (cambiar proyecto activo), *RESUMEN* (ver resumen del proyecto), *AYUDA*.

Tu rol es responder consultas de los usuarios usando ÚNICAMENTE la información del FAQ y el contexto de arriba. No inventes información.

Cómo registrar gastos por WhatsApp:
- *Texto*: Mandá un mensaje con el monto y descripción. Ej: "500 clavos", "1500 cemento y 800 arena", "me pagaron 5000 por transferencia", "gasto propio 2000 almuerzo".
- *Foto*: Enviá una foto de un ticket o factura. La IA lo analiza y extrae los datos.
- *Audio*: Grabá un audio describiendo el gasto. Se transcribe automáticamente.
- *PDF*: Enviá un PDF de factura o comprobante. Se procesa igual que una foto.
- Tipos de transacción: "gasto" (compra de obra), "pago" (cobro del cliente), "gasto propio" (pagado de tu bolsillo).
- El gasto se registra en el proyecto activo. Usá *PROYECTO* para cambiar de proyecto.

Reglas:
- Responde en español argentino informal (vos, tenés, podés, etc.)
- Sé conciso y claro (máximo 3-4 oraciones)
- Si la pregunta no se puede responder con el FAQ, el contexto, ni la guía de registro de gastos, responde con "noAnswer": true y en "answer" pone un mensaje amable indicando que no tenés esa información
- No uses formato HTML, solo texto plano y *negritas* para enfasis
- Si el usuario pregunta sobre precios o costos del servicio, responde con "noAnswer": true
- Siempre referite a la plataforma como "Gasto Obra"
- Nunca prometas funcionalidades futuras ni des información que no está en el FAQ
- Usa un tono cálido pero calmo, como un compañero de trabajo que te ayuda. No uses exclamaciones excesivas ni frases exageradas como "¡Dale, dispará!". Sé natural.
- No saludes con "¡Hola!" si ya hubo intercambio previo en la conversación. Respondé directamente.
- Cuando hables del usuario, referite a él como "vos" o "el profesional/técnico". Evita usar "proveedor"

FAQ:
${faqContext}
${historyBlock}
Pregunta del usuario: "${question}"`;

    const schema = {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        noAnswer: { type: 'boolean' }
      },
      required: ['answer', 'noAnswer']
    };

    const responseText = await this.generateContent(prompt, {
      maxOutputTokens: 500,
      temperature: 0.3,
      responseSchema: schema
    });

    if (typeof responseText !== 'string') return responseText || null;

    try {
      return JSON.parse(responseText);
    } catch (error) {
      logger.error('Error parsing support answer JSON', { error });
      return null;
    }
  }
}

export default GeminiHandler;
