class GeminiHandler {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'gemini-2.5-flash-lite';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async generateContent(prompt, { maxOutputTokens = 500, temperature = 0.7, parts = null } = {}) {
    try {
      const contents = parts
        ? [{ parts }]
        : [{ parts: [{ text: prompt }] }];

      const response = await fetch(
        `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens, temperature }
          })
        }
      );

      if (!response.ok) {
        console.error('Gemini API error:', await response.text());
        return null;
      }

      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      console.error('Error calling Gemini:', error);
      return null;
    }
  }

  async parseReceiptImage(imageBase64, mimeType = 'image/jpeg') {
    const prompt = `Analiza esta imagen de un ticket/factura de compra en Argentina.
Extrae la siguiente informacion en formato JSON:
{
  "storeName": "nombre del comercio",
  "items": [
    {"name": "nombre del item", "amount": 123.45},
    {"name": "otro item", "amount": 67.89}
  ],
  "totalAmount": 1234.56,
  "date": "DD/MM/YYYY"
}

Cada item debe tener "name" (descripcion corta) y "amount" (precio unitario o subtotal).
Si no podes extraer algun campo, usa null.
Solo responde con el JSON, sin texto adicional.`;

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
      parts
    });

    if (!text) return null;

    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Error parsing receipt JSON:', error);
      return null;
    }
  }

  async transcribeAudio(audioBase64, mimeType = 'audio/ogg', activeProjects = []) {
    const projectList = activeProjects.length > 0
      ? `\n\nProyectos activos del usuario (nombre - tag):\n${activeProjects.map(p => `- ${p.name} (#${p.tag})`).join('\n')}`
      : '';

    const prompt = `Transcribi este audio en español argentino. El audio describe un gasto de obra/refaccion.
Extrae la informacion en formato JSON:
{
  "transcription": "texto completo transcrito",
  "title": "titulo corto del gasto",
  "amount": 1234.56,
  "description": "descripcion adicional si hay",
  "category": "materiales|herramientas|transporte|mano de obra|comida|otros",
  "projectReference": "nombre o tag del proyecto si se menciona en el audio"
}${projectList}

Si el audio menciona un proyecto, obra, o lugar que coincida con alguno de los proyectos activos, incluilo en projectReference.
Si no podes extraer algun campo, usa null. Solo responde con el JSON.`;

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
      maxOutputTokens: 500,
      temperature: 0.3,
      parts
    });

    if (!text) return null;

    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Error parsing audio transcription JSON:', error);
      return null;
    }
  }

  async categorizeExpense(title, description = '') {
    const prompt = `Clasifica el siguiente gasto de obra/refaccion de departamento en una de estas categorias:
- materiales (clavos, tornillos, cemento, pintura, cables, canos, etc.)
- herramientas (taladro, sierra, amoladora, etc.)
- transporte (viaje, flete, envio, uber, etc.)
- mano de obra (oficial, ayudante, electricista, plomero, etc.)
- comida (almuerzo, merienda, agua, bebida para los obreros)
- otros (cualquier cosa que no entre en las anteriores)

Gasto: "${title}"${description ? `\nDescripcion: "${description}"` : ''}

Responde SOLO con el nombre de la categoria en minusculas, sin texto adicional.`;

    const text = await this.generateContent(prompt, { maxOutputTokens: 50, temperature: 0.2 });

    if (!text) return 'otros';

    const normalized = text.trim().toLowerCase();
    const validCategories = ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];

    return validCategories.find(c => normalized.includes(c)) || 'otros';
  }
}

export default GeminiHandler;
