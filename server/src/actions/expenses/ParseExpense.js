import { db, bucket, COLLECTIONS } from '../../config/firebase.js';
import GeminiHandler from '../../handlers/GeminiHandler.js';
import StorageHandler from '../../handlers/StorageHandler.js';
import { compressImage } from '../../helpers/compression.js';
import { PDFParse } from 'pdf-parse';
import * as respond from '../../responders/JsonResponder.js';
import logger from '../../../lib/logger.js';

const geminiHandler = new GeminiHandler(process.env.GEMINI_API_KEY);
const storageHandler = new StorageHandler(bucket);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PDF_SIZE = 5 * 1024 * 1024;    // 5MB
const MAX_PDF_PAGES = 5;
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VALID_PAYMENT_METHODS = ['transferencia', 'efectivo', 'tarjeta', 'mercadopago'];
const DEFAULT_CATEGORIES = ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];

async function buildAIContext(userId, projectId) {
  const [projectsSnap, categoriesSnap, recipientsSnap, vendorsSnap, providerDoc] = await Promise.all([
    db.collection(COLLECTIONS.PROJECTS).where('providerId', '==', userId).where('status', '==', 'active').get(),
    projectId
      ? Promise.all([
          db.collection('categories').where('userId', '==', userId).where('projectId', '==', projectId).get(),
          db.collection('categories').where('userId', '==', userId).where('projectId', '==', null).get()
        ])
      : db.collection('categories').where('userId', '==', userId).where('projectId', '==', null).get().then(s => [null, s]),
    db.collection(COLLECTIONS.RECIPIENTS).where('userId', '==', userId).get(),
    db.collection(COLLECTIONS.VENDORS).where('userId', '==', userId).get(),
    db.collection(COLLECTIONS.PROVIDERS).doc(userId).get()
  ]);

  const activeProjects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Merge project + global categories
  const [projectCatsSnap, globalCatsSnap] = categoriesSnap;
  const projectCats = projectCatsSnap ? projectCatsSnap.docs.map(d => d.data()) : [];
  const globalCats = globalCatsSnap.docs.map(d => d.data());
  let categories = DEFAULT_CATEGORIES;
  if (globalCats.length > 0 || projectCats.length > 0) {
    const merged = [...globalCats];
    for (const pc of projectCats) {
      const idx = merged.findIndex(c => c.value === pc.value);
      if (idx !== -1) merged[idx] = pc;
      else merged.push(pc);
    }
    if (merged.length > 0) categories = merged.map(c => c.value);
  }

  const recipients = recipientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const vendors = vendorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const providerData = providerDoc.exists ? providerDoc.data() : {};

  return {
    activeProjects: activeProjects.map(p => ({ id: p.id, name: p.name, tag: p.tag, clientName: p.clientName || null })),
    categories,
    recipients: recipients.map(r => ({ id: r.id, name: r.name, platform: r.platform })),
    paymentMethods: VALID_PAYMENT_METHODS,
    vendors,
    managementFeePercent: providerData.managementFeePercent || 0
  };
}

export async function ParseExpense(req, res) {
  const { type, base64, mimeType, text, projectId, caption } = req.body;

  if (!type || !['text', 'image', 'pdf'].includes(type)) {
    return respond.error(res, 'Tipo inválido. Usar: text, image, pdf');
  }

  if (type === 'text' && (!text || typeof text !== 'string' || !text.trim())) {
    return respond.error(res, 'Texto requerido');
  }

  if ((type === 'image' || type === 'pdf') && (!base64 || !mimeType)) {
    return respond.error(res, 'Archivo requerido (base64 y mimeType)');
  }

  // Validate file type and size
  if (type === 'image') {
    if (!VALID_IMAGE_TYPES.includes(mimeType)) {
      return respond.error(res, 'Formato de imagen no soportado. Usar: JPEG, PNG o WebP');
    }
    const sizeBytes = Buffer.byteLength(base64, 'base64');
    if (sizeBytes > MAX_IMAGE_SIZE) {
      return respond.error(res, 'La imagen supera el límite de 10MB');
    }
  }

  if (type === 'pdf') {
    if (mimeType !== 'application/pdf') {
      return respond.error(res, 'El archivo debe ser un PDF');
    }
    const sizeBytes = Buffer.byteLength(base64, 'base64');
    if (sizeBytes > MAX_PDF_SIZE) {
      return respond.error(res, 'El PDF supera el límite de 5MB');
    }
  }

  try {
    const aiContext = await buildAIContext(req.uid, projectId || null);
    let aiResult = null;
    let fileUrl = null;
    let imageUrl = null;

    if (type === 'text') {
      aiResult = await geminiHandler.parseTextExpense(text, aiContext);
    }

    if (type === 'image') {
      aiResult = await geminiHandler.parseReceiptImage(base64, mimeType, { ...aiContext, caption: caption || '' });

      // Compress and upload
      const compressed = await compressImage(base64, mimeType);
      if (compressed) {
        const storagePath = storageHandler.generatePath('expenses', 'receipt.jpg');
        imageUrl = await storageHandler.uploadFile(compressed.buffer, storagePath, compressed.mimeType);
      }
    }

    if (type === 'pdf') {
      // Validate page count
      const pdfBuffer = Buffer.from(base64, 'base64');
      let parser;
      try {
        parser = new PDFParse({ data: pdfBuffer });
        const pdfDoc = await parser.load();
        await parser.destroy();
        if (pdfDoc.numPages > MAX_PDF_PAGES) {
          return respond.error(res, `El PDF tiene ${pdfDoc.numPages} páginas (máximo ${MAX_PDF_PAGES})`);
        }
      } catch (pdfError) {
        if (parser) await parser.destroy().catch(() => {});
        throw pdfError;
      }

      aiResult = await geminiHandler.parseDocument(base64, 'application/pdf', { ...aiContext, caption: caption || '' });

      // Upload PDF
      const storagePath = storageHandler.generatePath('expenses', 'document.pdf');
      fileUrl = await storageHandler.uploadFile(pdfBuffer, storagePath, 'application/pdf');
    }

    if (!aiResult || (!aiResult.totalAmount && (!aiResult.items || aiResult.items.length === 0))) {
      return respond.error(res, 'No se pudo extraer información. Intentá con una imagen más clara o un texto más descriptivo.', 422);
    }

    return respond.success(res, {
      parsed: aiResult,
      imageUrl,
      fileUrl
    });
  } catch (error) {
    logger.error('Error in ParseExpense', { error: error.message, type });
    return respond.error(res, 'Error procesando el mensaje', 500);
  }
}
