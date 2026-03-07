import logger from '../../lib/logger.js';

class GeminiHandler {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'gemini-2.5-flash-lite';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async generateContent(prompt, { maxOutputTokens = 500, temperature = 0.7, parts = null, responseSchema = null } = {}) {
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
        `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
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
        logger.error('Gemini API error', { response: await response.text() });
        return null;
      }

      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      logger.error('Error calling Gemini', { error });
      return null;
    }
  }

  async parseReceiptImage(imageBase64, mimeType = 'image/jpeg', { caption = '', activeProjects = [], categories = null, recipients = [], paymentMethods = [] } = {}) {
    const projectList = activeProjects.length > 0
      ? `\nProyectos activos (usa el ID exacto si el usuario menciona uno en el texto):\n${activeProjects.map(p => `- ID: "${p.id}", Nombre: "${p.name}", Tag: "#${p.tag}"`).join('\n')}`
      : '';

    const recipientList = recipients.length > 0
      ? `\nDestinatarios conocidos (usa el ID exacto si el usuario menciona uno en el texto):\n${recipients.map(r => `- ID: "${r.id}", Nombre: "${r.name}", Plataforma: "${r.platform || ''}"`).join('\n')}`
      : '';

    const methodList = paymentMethods.length > 0
      ? `\nMetodos de pago validos: ${paymentMethods.join(', ')}`
      : '';

    const captionBlock = caption
      ? `\n\nEl usuario envio este texto junto con la imagen: "${caption}"`
      : '';

    const prompt = `Analiza esta imagen. Puede ser un ticket/factura de compra, un comprobante de transferencia bancaria, o un comprobante de pago.
${captionBlock}

- "transactionType": detecta el tipo de imagen:
  - "expense" para tickets de compra, facturas, recibos de comercio
  - "payment" para capturas de transferencia bancaria, comprobantes de pago, vouchers de deposito
- Cada item debe tener "name" (descripcion corta) y "amount" (precio unitario o subtotal)
- Los campos paymentMethod, recipientId, installmentPercent y projectId se extraen SOLO del texto del usuario, NO de la imagen
- "installmentPercent": usa "100" SOLO si el texto dice "pagado por el cliente", "el cliente pago", "ya esta pago". Caso contrario usa "0"
- "paymentMethod": debe ser EXACTAMENTE uno de los metodos validos, o null
- "recipientId": debe ser EXACTAMENTE uno de los IDs listados, o null
- "projectId": debe ser EXACTAMENTE uno de los IDs listados, o null
Si no podes extraer algun campo, usa null.
${projectList}
${recipientList}
${methodList}`;

    const schema = {
      type: 'object',
      properties: {
        transactionType: { type: 'string', enum: ['expense', 'payment'] },
        storeName: { type: 'string', nullable: true },
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
        date: { type: 'string', nullable: true },
        paymentMethod: { type: 'string', nullable: true },
        recipientId: { type: 'string', nullable: true },
        installmentPercent: { type: 'string', enum: ['0', '100'] },
        projectId: { type: 'string', nullable: true }
      },
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

    if (!text) return null;

    try {
      const parsed = JSON.parse(text);
      parsed.installmentPercent = parseInt(parsed.installmentPercent, 10) || 0;
      return parsed;
    } catch (error) {
      logger.error('Error parsing receipt JSON', { error });
      return null;
    }
  }

  async transcribeAudio(audioBase64, mimeType = 'audio/ogg', { activeProjects = [], categories = null, recipients = [], paymentMethods = [] } = {}) {
    const projectList = activeProjects.length > 0
      ? `\nProyectos activos (usa el ID exacto si el usuario menciona uno):\n${activeProjects.map(p => `- ID: "${p.id}", Nombre: "${p.name}", Tag: "#${p.tag}"`).join('\n')}`
      : '';

    const recipientList = recipients.length > 0
      ? `\nDestinatarios conocidos (usa el ID exacto si el usuario menciona uno):\n${recipients.map(r => `- ID: "${r.id}", Nombre: "${r.name}", Plataforma: "${r.platform || ''}"`).join('\n')}`
      : '';

    const categoryList = categories
      ? `\nCategorias validas: ${categories.join(', ')}`
      : '\nCategorias validas: materiales, herramientas, transporte, mano de obra, comida, otros';

    const methodList = paymentMethods.length > 0
      ? `\nMetodos de pago validos: ${paymentMethods.join(', ')}`
      : '\nMetodos de pago validos: transferencia, efectivo, tarjeta, mercadopago';

    const prompt = `Transcribi este audio en español argentino. El audio describe un gasto de obra, un pago recibido, o un gasto propio del proveedor.
Extrae la informacion en formato JSON.
${projectList}
${recipientList}
${categoryList}
${methodList}

Reglas importantes:
- "transactionType": detecta el tipo segun lo que dice la persona:
  - "payment" si dice "pago", "cobro", "me pagaron", "me transfirieron", "recibi plata", "me depositaron"
  - "provider_expense" si dice "gasto propio", "gasto mio", "puse de mi bolsillo", "pague yo", "puse yo"
  - "expense" para compras y gastos normales de obra (materiales, herramientas, mano de obra, etc.)
  - Si no estas seguro, usa "expense"
- "items" es un array con CADA item/gasto mencionado, cada uno con "name" y "amount"
- "totalAmount" es la suma de todos los amounts de los items
- Si se menciona un solo gasto, pone un solo item en el array
- Si se menciona un monto total pero no los items individuales, pone un solo item con ese monto
- "installmentPercent": usa 100 SOLO si dice "pagado por el cliente", "el cliente pago", "ya esta pago". Caso contrario usa 0
- "paymentMethod": debe ser EXACTAMENTE uno de los metodos validos, o null si no se menciona
- "recipientId": debe ser EXACTAMENTE uno de los IDs de destinatarios listados, o null si no se menciona
- "projectId": debe ser EXACTAMENTE uno de los IDs de proyectos listados si el usuario menciona un proyecto, o null
Si no podes extraer algun campo, usa null.`;

    const schema = {
      type: 'object',
      properties: {
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
        projectId: { type: 'string', nullable: true }
      },
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
      return parsed;
    } catch (error) {
      logger.error('Error parsing audio transcription JSON', { error });
      return null;
    }
  }

  async parseTextExpense(text, { activeProjects = [], categories = null, recipients = [], paymentMethods = [] } = {}) {
    const projectList = activeProjects.length > 0
      ? `\nProyectos activos (usa el ID exacto si el usuario menciona uno):\n${activeProjects.map(p => `- ID: "${p.id}", Nombre: "${p.name}", Tag: "#${p.tag}"`).join('\n')}`
      : '';

    const recipientList = recipients.length > 0
      ? `\nDestinatarios conocidos (usa el ID exacto si el usuario menciona uno):\n${recipients.map(r => `- ID: "${r.id}", Nombre: "${r.name}", Plataforma: "${r.platform || ''}"`).join('\n')}`
      : '';

    const categoryList = categories
      ? `\nCategorias validas: ${categories.join(', ')}`
      : '\nCategorias validas: materiales, herramientas, transporte, mano de obra, comida, otros';

    const methodList = paymentMethods.length > 0
      ? `\nMetodos de pago validos: ${paymentMethods.join(', ')}`
      : '\nMetodos de pago validos: transferencia, efectivo, tarjeta, mercadopago';

    const prompt = `Analiza este mensaje de un proveedor de obra que describe un gasto, pago, o gasto propio. Extrae la informacion en formato JSON:
{
  "transactionType": "expense|payment|provider_expense",
  "title": "titulo corto",
  "items": [{"name": "item", "amount": 123.45}],
  "totalAmount": 1234.56,
  "description": "descripcion adicional",
  "category": "<de las categorias validas>",
  "paymentMethod": "<metodo de pago o null>",
  "recipientId": "<ID del destinatario o null>",
  "installmentPercent": 0,
  "projectId": "<ID del proyecto si se menciona, o null>"
}

Mensaje: "${text}"
${projectList}
${recipientList}
${categoryList}
${methodList}

Reglas importantes:
- "transactionType": detecta el tipo segun lo que dice la persona:
  - "payment" si dice "pago", "cobro", "me pagaron", "me transfirieron", "recibi plata", "me depositaron"
  - "provider_expense" si dice "gasto propio", "gasto mio", "puse de mi bolsillo", "pague yo", "puse yo"
  - "expense" para compras y gastos normales de obra (materiales, herramientas, mano de obra, etc.)
  - Si no estas seguro, usa "expense"
- "items" es un array con CADA item/gasto mencionado, cada uno con "name" y "amount"
- "totalAmount" es la suma de todos los amounts de los items
- Si se menciona un solo gasto, pone un solo item en el array
- "installmentPercent": usa 100 SOLO si dice "pagado por el cliente", "el cliente pago", "ya esta pago". Caso contrario usa 0
- "paymentMethod": debe ser EXACTAMENTE uno de los metodos validos, o null si no se menciona
- "recipientId": debe ser EXACTAMENTE uno de los IDs de destinatarios listados, o null si no se menciona
- "projectId": debe ser EXACTAMENTE uno de los IDs de proyectos listados si el usuario menciona un proyecto, o null
Si no podes extraer algun campo, usa null.`;

    const schema = {
      type: 'object',
      properties: {
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
        projectId: { type: 'string', nullable: true }
      },
      required: ['transactionType', 'title', 'items', 'totalAmount', 'installmentPercent']
    };

    const responseText = await this.generateContent(prompt, {
      maxOutputTokens: 800,
      temperature: 0.3,
      responseSchema: schema
    });

    if (!responseText) return null;

    try {
      const parsed = JSON.parse(responseText);
      parsed.installmentPercent = parseInt(parsed.installmentPercent, 10) || 0;
      return parsed;
    } catch (error) {
      logger.error('Error parsing text expense JSON', { error });
      return null;
    }
  }

  async categorizeExpense(title, description = '', categories = null) {
    const validCategories = categories || ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];
    const categoryList = validCategories.map(c => `- ${c}`).join('\n');

    const prompt = `Clasifica el siguiente gasto de obra/refaccion de departamento en una de estas categorias:
${categoryList}

Gasto: "${title}"${description ? `\nDescripcion: "${description}"` : ''}

Responde SOLO con el nombre de la categoria en minusculas, sin texto adicional.`;

    const text = await this.generateContent(prompt, { maxOutputTokens: 50, temperature: 0.2 });

    if (!text) return validCategories.includes('otros') ? 'otros' : validCategories[validCategories.length - 1];

    const normalized = text.trim().toLowerCase();

    return validCategories.find(c => normalized.includes(c)) || (validCategories.includes('otros') ? 'otros' : validCategories[validCategories.length - 1]);
  }
}

export default GeminiHandler;
