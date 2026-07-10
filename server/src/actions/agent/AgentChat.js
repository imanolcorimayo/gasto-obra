import { PDFParse } from 'pdf-parse';
import { bucket } from '../../config/firebase.js';
import { runAgentTurn, startFreshSession } from '../../agent/core.js';
import { getActiveProjects } from '../../helpers/projects.js';
import { getProviderCategories } from '../../helpers/categories.js';
import { compressImage } from '../../helpers/compression.js';
import StorageHandler from '../../handlers/StorageHandler.js';
import logger from '../../../lib/logger.js';

// In-app adapter for the transport-agnostic agent core — the web sibling of
// runAgentForWhatsApp. Same brain, different edges: identity comes from the
// Firebase bearer token (requireAuth), the active obra comes from the page the
// chat lives in (per turn, nothing persisted), and the reply goes back as JSON
// for the chat UI to render instead of WhatsApp bubbles/buttons.

const storageHandler = new StorageHandler(bucket);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_PDF_SIZE = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 5;
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Tools whose successful run changes domain data — the web refreshes its expense
// list after any of these. needs_confirmation results don't count (nothing wrote).
const WRITE_TOOLS = new Set([
  'record_expense', 'edit_expense', 'delete_expense',
  'create_project', 'update_project', 'close_project',
]);

/**
 * Validate + store the attachment, returning what the agent turn needs:
 * inline base64 for the model and the storage URL the expense links to.
 * Throws { status, message } on invalid input.
 */
async function prepareAttachment(attachment) {
  const { mimeType, base64, filename } = attachment;
  if (!base64 || !mimeType) throw { status: 400, message: 'Adjunto incompleto.' };
  const bytes = Buffer.byteLength(base64, 'base64');

  if (VALID_IMAGE_TYPES.includes(mimeType)) {
    if (bytes > MAX_IMAGE_SIZE) throw { status: 400, message: 'La imagen supera los 10MB.' };
    let imageUrl = null;
    try {
      const compressed = await compressImage(base64, mimeType);
      if (compressed) {
        const storagePath = storageHandler.generatePath('expenses', 'receipt.jpg');
        imageUrl = await storageHandler.uploadFile(compressed.buffer, storagePath, compressed.mimeType);
      }
    } catch (error) {
      logger.error('AgentChat: error uploading receipt image', { error: error.message });
    }
    return {
      attachments: [{ mimeType, data: base64 }],
      mediaUrls: { imageUrl, audioUrl: null, audioTranscription: null, fileUrl: null },
      fallbackText: 'Te mandé una foto de un comprobante.',
      label: '[Imagen]',
    };
  }

  if (mimeType === 'application/pdf') {
    if (bytes > MAX_PDF_SIZE) throw { status: 400, message: 'El PDF supera los 5MB.' };
    const pdfBuffer = Buffer.from(base64, 'base64');
    let pdfParser;
    try {
      pdfParser = new PDFParse({ data: pdfBuffer });
      const doc = await pdfParser.load();
      if (doc.numPages > MAX_PDF_PAGES) {
        throw { status: 400, message: `El PDF tiene ${doc.numPages} páginas; el máximo es ${MAX_PDF_PAGES}.` };
      }
    } catch (err) {
      if (err.status) throw err;
      throw { status: 400, message: 'No se pudo leer el PDF. Asegurate de que sea un archivo válido.' };
    } finally {
      if (pdfParser) await pdfParser.destroy().catch(() => {});
    }
    let fileUrl = null;
    try {
      const storagePath = storageHandler.generatePath('expenses', filename || 'document.pdf');
      fileUrl = await storageHandler.uploadFile(pdfBuffer, storagePath, 'application/pdf');
    } catch (error) {
      logger.error('AgentChat: error uploading PDF', { error: error.message });
    }
    return {
      attachments: [{ mimeType: 'application/pdf', data: base64 }],
      mediaUrls: { imageUrl: null, audioUrl: null, audioTranscription: null, fileUrl },
      fallbackText: `Te mandé un PDF${filename ? ` (${filename})` : ''}.`,
      label: '[Documento]',
    };
  }

  throw { status: 400, message: 'Tipo de archivo no soportado. Mandá una imagen (JPEG/PNG/WebP) o un PDF.' };
}

/** POST /api/agent/chat — one agent turn on the 'app' channel. */
export async function AgentChat(req, res) {
  try {
    const { text, projectId, attachment, newSession } = req.body || {};
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed && !attachment) {
      return res.status(400).json({ error: 'Mandá un mensaje o un adjunto.' });
    }

    let media = null;
    if (attachment) {
      try {
        media = await prepareAttachment(attachment);
      } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        throw err;
      }
    }

    const userId = req.uid;
    const projects = await getActiveProjects(userId);
    const activeProjects = projects.map((p) => ({ id: p.id, name: p.name, tag: p.tag }));
    // The page the chat lives in defines the active obra for this turn. An id that
    // isn't the user's own is simply ignored (agent sees "ninguna" and asks).
    const activeProject = activeProjects.find((p) => p.id === projectId) || null;
    const categories = await getProviderCategories(userId, activeProject?.id || null);

    const userText = trimmed || media.fallbackText;
    const context = {
      userId,
      source: 'app',
      originalMessage: media ? `${media.label} ${trimmed}`.trim() : userText,
      today: new Date().toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }),
      activeProjects,
      activeProject,
      categories,
      mediaUrls: media?.mediaUrls || null,
      // Web has no persistent active-obra state — the page is the context. The
      // switch applies within this turn only (ctx mutation), nothing is stored.
      setActiveProject: async () => {},
    };

    if (newSession) await startFreshSession({ userId, channel: 'app' });

    const result = await runAgentTurn({
      userId,
      channel: 'app',
      userText,
      context,
      attachments: media?.attachments || [],
    });

    let reply = result.reply;
    const timeline = result.timeline || [];

    // Share payloads (__deliver) get the same isolated treatment as WhatsApp:
    // scrubbed out of the model's text and returned separately so the UI renders
    // them as their own copyable/tappable block.
    const deliverables = [];
    for (const t of timeline) {
      const d = t.result?.__deliver;
      if (!d || !t.result?.ok) continue;
      deliverables.push({
        tool: t.tool,
        value: d,
        viewUrl: t.result.viewUrl || null,
        hasClientPhone: Boolean(t.result.hasClientPhone),
      });
      reply = reply
        .split('\n')
        .filter((line) => !line.includes(d))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    const wrote = timeline.some(
      (t) => WRITE_TOOLS.has(t.tool) && t.result?.ok && !t.result?.needs_confirmation
    );
    const confirm = timeline.some((t) => t.tool === 'delete_expense' && t.result?.needs_confirmation)
      ? 'delete'
      : timeline.some((t) => t.tool === 'close_project' && t.result?.needs_confirmation)
        ? 'close'
        : null;

    res.json({
      reply,
      sessionId: result.sessionId,
      rolledOver: Boolean(result.rolledOver),
      wrote,
      confirm,
      deliverables,
    });
  } catch (error) {
    logger.error('Error in AgentChat', { error: error.message });
    res.status(500).json({ error: 'No pude procesar el mensaje. Intentá de nuevo.' });
  }
}
