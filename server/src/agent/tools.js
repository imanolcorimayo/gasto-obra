import { createExpense, updateExpense, deleteExpense, getExpense, getExpenseMedia } from '../helpers/expenseWrite.js';
import { getProjectSummary, searchProjectExpenses } from '../helpers/expenseSummary.js';
import { formatMovementConfirmation } from '../helpers/movementConfirmation.js';
import { createProject, updateProject, closeProject, getShareLink } from '../helpers/projects.js';
import { listItems, createItem, updateItem, addMaterial } from '../helpers/projectItems.js';
import { logToolCall } from './auditLog.js';

// Parse an agent-supplied date ("YYYY-MM-DD") to a Date at local noon, avoiding
// timezone day-shift. Returns null for anything unparseable.
function parseDate(s) {
  if (!s || typeof s !== 'string') return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const round2 = (n) => Math.round(n * 100) / 100;
const fmtArs = (n) => n.toLocaleString('es-AR');

/**
 * The total is computed programmatically from items when present — never trust the
 * model's stated total over the line items. If a stated total disagrees with the
 * items sum, register the sum and surface a warning for the user to reconcile.
 * @returns {{ amount: number|null, warning: string|null }}
 */
function resolveAmount(args) {
  const items = Array.isArray(args.items) && args.items.length ? args.items : null;
  let amount = args.amount != null ? Number(args.amount) : null;
  let warning = null;

  if (items) {
    const sum = round2(items.reduce((s, i) => s + (Number(i.amount) || 0), 0));
    if (sum > 0) {
      if (amount != null && Math.abs(round2(amount) - sum) > 0.01) {
        warning = `El total que se mencionó ($${fmtArs(round2(amount))}) no coincide con la suma de los ítems ($${fmtArs(sum)}). Registré $${fmtArs(sum)} — avisale al profesional por si falta o sobra algún ítem.`;
      }
      amount = sum;
    }
  }
  return { amount, warning };
}

/**
 * TOOL REGISTRY — the single source of truth for the agent's tools.
 *
 * Each entry: { name, description, parameters, handler, channels? }.
 *   - `parameters`  JSON Schema; the SAME object both Gemini and MCP consume.
 *   - `handler(args, ctx)`  the domain logic; returns a `{ ok, ... }` result.
 *   - `channels`  OPTIONAL whitelist of channels this tool is exposed on, e.g.
 *                 ['gemini'] or ['mcp']. Omit to expose on ALL channels (default).
 *                 Registry membership ≠ exposure: a tool can live here for one
 *                 channel without bloating another's context (e.g. extra MCP tools
 *                 that should never enter the Gemini prompt, and vice versa).
 *
 * Consumers derive their own view from this one list — no second place to edit:
 *   - Gemini agent loop → TOOL_DECLARATIONS  (function-calling format, channel 'gemini')
 *   - MCP server        → toMcpTools()        (inputSchema format, channel 'mcp')
 * Adding/changing a tool means touching ONLY its entry here; every channel it's
 * exposed on (WhatsApp Gemini loop, in-app, MCP for Claude/ChatGPT) picks it up.
 *
 * ── THE CONTEXT CONTRACT (`ctx`) ──────────────────────────────────────────────
 * `ctx` is assembled by each channel adapter and passed to makeDispatcher; a tool
 * NEVER inspects the channel, only `ctx`. That single rule is what keeps the
 * registry sharable across stateful (WhatsApp session) and stateless (MCP) callers.
 *   ctx.userId          Firebase UID. REQUIRED — every ownership check keys off it.
 *   ctx.activeProjects  The user's own obras [{id,name,tag}] — the authz whitelist.
 *                       (normalized to [] by makeDispatcher; create_project pushes here.)
 *   ctx.activeProject   Current obra {id,name,tag} or null (stateful channels).
 *   ctx.setActiveProject  async (id)=>void — OPTIONAL capability. Stateless channels
 *                       (MCP) omit it; tools that need it degrade gracefully and ask
 *                       the caller to pass an explicit projectId instead.
 *   ctx.source / ctx.originalMessage / ctx.mediaUrls  expense provenance (optional).
 */
export const TOOLS = [
  {
    name: 'list_projects',
    description: 'Lista las obras activas del profesional, con su id, nombre y tag.',
    parameters: { type: 'object', properties: {}, required: [] },
    handler: async (args, ctx) => ({
      ok: true,
      projects: ctx.activeProjects.map((p) => ({ id: p.id, name: p.name, tag: p.tag })),
    }),
  },

  {
    name: 'switch_project',
    // Gemini-only: MCP is stateless (no active obra), so this tool has no meaning there.
    channels: ['gemini'],
    description:
      'Cambia la obra activa donde se registran los gastos. Pasá el id exacto de una obra existente del profesional.',
    parameters: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'id exacto de la obra' } },
      required: ['projectId'],
    },
    handler: async (args, ctx) => {
      const target = ctx.activeProjects.find((p) => p.id === args.projectId);
      if (!target) return { ok: false, error: 'No existe una obra con ese id.' };
      if (typeof ctx.setActiveProject !== 'function') {
        return { ok: false, error: 'Este canal no permite cambiar la obra activa.' };
      }
      await ctx.setActiveProject(target.id);
      return { ok: true, activeProject: { id: target.id, name: target.name } };
    },
  },

  {
    name: 'create_project',
    description:
      'Crea una obra nueva para el profesional. Lo único obligatorio es el nombre; el tag se genera solo. ' +
      'Usala cuando el profesional quiera registrar en una obra que NO está en su lista y pida crearla. ' +
      'Por defecto la deja como obra activa. Cliente y dirección son opcionales: sumalos solo si el profesional los da, no lo frenes pidiéndolos.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'nombre de la obra (obligatorio)' },
        clientName: { type: 'string', description: 'nombre del cliente/dueño (opcional)' },
        clientPhone: { type: 'string', description: 'teléfono del cliente (opcional)' },
        address: { type: 'string', description: 'dirección de la obra (opcional)' },
        setActive: { type: 'boolean', description: 'dejar esta obra como activa; por defecto true' },
      },
      required: ['name'],
    },
    handler: async (args, ctx) => {
      const created = await createProject(ctx.userId, {
        name: args.name,
        clientName: args.clientName,
        clientPhone: args.clientPhone,
        address: args.address,
      });
      if (!created.ok) return created;

      // Make the new obra usable for the rest of THIS turn (e.g. an immediate
      // record_expense or a move of the pending expense via edit_expense): it
      // isn't in ctx.activeProjects, which was snapshotted before this call.
      ctx.activeProjects.push(created.project);

      // Default to making it active so the next expense lands there.
      const setActive = args.setActive !== false;
      if (setActive && typeof ctx.setActiveProject === 'function') {
        await ctx.setActiveProject(created.project.id);
        ctx.activeProject = { id: created.project.id, name: created.project.name, tag: created.project.tag };
      }

      return {
        ok: true,
        project: { id: created.project.id, name: created.project.name, tag: created.project.tag },
        active: setActive,
      };
    },
  },

  {
    name: 'update_project',
    description:
      'Completa o corrige datos de una obra existente: cliente (nombre/teléfono), dirección, descripción o presupuesto. ' +
      'Usala cuando el profesional te pasa esos datos — típicamente justo después de crear la obra, cuando le ofreciste completarlos. ' +
      'Por defecto actúa sobre la obra activa; pasá projectId para otra.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'id de la obra; omitilo para la activa' },
        clientName: { type: 'string', description: 'nombre del cliente/dueño' },
        clientPhone: { type: 'string', description: 'teléfono del cliente' },
        address: { type: 'string', description: 'dirección de la obra' },
        description: { type: 'string', description: 'descripción/notas de la obra' },
        budget: { type: 'number', description: 'presupuesto total estimado en ARS (para obras chicas; en obras grandes usá ítems/sub-presupuestos con manage_item)' },
        startDate: { type: 'string', description: 'fecha de inicio de la obra, YYYY-MM-DD' },
        estimatedEndDate: { type: 'string', description: 'fecha estimada de fin, YYYY-MM-DD' },
      },
      required: [],
    },
    handler: async (args, ctx) => {
      const projectId = args.projectId || ctx.activeProject?.id;
      if (!projectId) return { ok: false, error: 'No hay obra activa. Pedile al profesional que elija una.' };
      // Authorize against the user's own obras — never trust a raw id.
      if (!ctx.activeProjects.find((p) => p.id === projectId)) {
        return { ok: false, error: 'No encontré esa obra entre las tuyas.' };
      }
      const res = await updateProject(ctx.userId, projectId, {
        clientName: args.clientName, clientPhone: args.clientPhone,
        address: args.address, description: args.description, budget: args.budget,
        startDate: args.startDate !== undefined ? parseDate(args.startDate) : undefined,
        estimatedEndDate: args.estimatedEndDate !== undefined ? parseDate(args.estimatedEndDate) : undefined,
      });
      if (!res.ok) return res;
      // Keep the turn's in-memory copy in sync (name isn't editable here, so the
      // active-project label stays correct without further work).
      return {
        ok: true,
        project: {
          id: projectId, name: res.project.name,
          clientName: res.project.clientName || null, address: res.project.address || null,
        },
      };
    },
  },

  {
    name: 'record_expense',
    description:
      'Registra una transacción en la obra activa. Extraé los datos del mensaje del profesional. ' +
      'Tipos: "expense" (gasto/compra para la obra, lo debe el cliente), "payment" (cobro: plata que pagó el cliente), ' +
      '"provider_expense" (gasto propio: lo pagó el profesional de su bolsillo). ' +
      'Si falta el monto o no se entiende qué es, NO llames esta tool: preguntá primero. ' +
      'Si el resultado trae receiptUploadLink, ofrecéselo como opción para adjuntar la foto del comprobante (opcional, sin insistir).',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['expense', 'payment', 'provider_expense'] },
        title: { type: 'string', description: 'título corto y legible' },
        amount: { type: 'number', description: 'monto total en ARS' },
        category: { type: 'string', description: 'una de las categorías válidas del contexto' },
        description: { type: 'string' },
        items: {
          type: 'array',
          description: 'desglose opcional cuando hay varios ítems',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, amount: { type: 'number' } },
            required: ['name', 'amount'],
          },
        },
        paymentMethod: { type: 'string', description: 'transferencia, efectivo, tarjeta, mercadopago' },
        vendor: { type: 'string', description: 'comercio/proveedor donde se compró (ej: Easy, Sodimac, Maderera López)' },
        recipient: { type: 'string', description: 'a quién se le pagó / de quién es el cobro (nombre)' },
        recipientPlatform: { type: 'string', description: 'plataforma del destinatario (ej: Mercado Pago, banco)' },
        recipientCuit: { type: 'string', description: 'CUIT/CUIL del destinatario si se menciona' },
        installmentPercent: {
          type: 'number',
          description: '100 solo si el cliente YA pagó este gasto; si no, 0',
        },
        scopeType: {
          type: 'string',
          enum: ['original', 'addition'],
          description: '"addition" si es un trabajo adicional/imprevisto que NO estaba en el presupuesto original (el cliente lo ve aparte); "original" o vacío si estaba previsto.',
        },
        itemId: {
          type: 'string',
          description: 'id de un ítem/sub-presupuesto de la obra al que imputar el gasto (de list_items); omitilo si no aplica.',
        },
        date: {
          type: 'string',
          description: 'fecha del gasto en formato YYYY-MM-DD. Omitilo para hoy; usalo para registrar gastos de días pasados.',
        },
        projectId: { type: 'string', description: 'id de la obra; omitilo para usar la activa' },
      },
      required: ['type', 'title', 'amount'],
    },
    handler: async (args, ctx) => {
      const projectId = args.projectId || ctx.activeProject?.id;
      if (!projectId) {
        return { ok: false, error: 'No hay obra activa. Pedile al profesional que elija una.' };
      }
      // Authorization: only ever act on a project the authenticated user owns.
      // `ctx.activeProjects` is the user's own list; never trust a raw id.
      const project = ctx.activeProjects.find((p) => p.id === projectId);
      if (!project) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };

      const { amount, warning } = resolveAmount(args);
      if (!amount || amount <= 0) return { ok: false, error: 'Falta el monto o es inválido.' };

      const type = args.type || 'expense';
      const title = args.title || args.items?.[0]?.name || 'Gasto';
      const category = args.category || 'otros';

      const { expenseId } = await createExpense(ctx.userId, {
        projectId: project.id,
        type,
        title,
        amount,
        category,
        description: args.description || '',
        items: args.items || null,
        scopeType: args.scopeType === 'addition' ? 'addition' : 'original',
        itemId: args.itemId || null,
        paymentMethod: args.paymentMethod || null,
        vendor: args.vendor || null,
        recipientName: args.recipient || null,
        recipientPlatform: args.recipientPlatform || null,
        recipientCuit: args.recipientCuit || null,
        installmentPercent: args.installmentPercent ?? 0,
        date: parseDate(args.date) || undefined,
        source: ctx.source || 'app',
        originalMessage: ctx.originalMessage || '',
        // Receipt media (when the turn came from a photo/PDF/audio) — attached so
        // the expense links to its comprobante in the web dashboard.
        imageUrl: ctx.mediaUrls?.imageUrl || null,
        audioUrl: ctx.mediaUrls?.audioUrl || null,
        audioTranscription: ctx.mediaUrls?.audioTranscription || null,
        fileUrl: ctx.mediaUrls?.fileUrl || null,
      });

      const confirmation = formatMovementConfirmation({
        action: 'registrado', type, project: project.name, title, amount, category,
        vendor: args.vendor || null, recipient: args.recipient || null, date: args.date || null,
      });

      // If no comprobante rode in with this turn (e.g. text/MCP, not a WhatsApp photo),
      // offer a one-tap page to attach it. OPTIONAL — surface it as a suggestion, never
      // a requirement. WhatsApp expenses that already carry the photo skip this.
      const hasReceipt = Boolean(ctx.mediaUrls?.imageUrl || ctx.mediaUrls?.fileUrl);
      const appUrl = process.env.APP_URL || 'https://gastoobra.com';
      const receiptUploadLink = hasReceipt
        ? undefined
        : `${appUrl}/gasto/${expenseId}/comprobante?t=${encodeURIComponent(title)}&a=${amount}`;

      return {
        ok: true,
        expenseId,
        confirmation,
        warning: warning || undefined,
        receiptUploadLink,
        registered: { type, title, amount, category, vendor: args.vendor || null, recipient: args.recipient || null, project: project.name },
      };
    },
  },

  {
    name: 'get_summary',
    description:
      'Devuelve el resumen de la obra: cantidad de gastos, total de gastos, pagos recibidos, saldo, gastos propios y desglose por categoría.',
    parameters: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'id de la obra; omitilo para usar la activa' } },
      required: [],
    },
    handler: async (args, ctx) => {
      const projectId = args.projectId || ctx.activeProject?.id;
      if (!projectId) return { ok: false, error: 'No hay obra activa.' };
      // Authorization: only summarize a project the authenticated user owns.
      const project = ctx.activeProjects.find((p) => p.id === projectId);
      if (!project) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };

      const summary = await getProjectSummary(project.id);
      return { ok: true, project: project.name, summary };
    },
  },

  {
    name: 'look_up_expenses',
    description:
      'Busca registros de la obra (id, tipo, título, monto, categoría, fecha, comercio, destinatario, medio de pago, descripción, ítems, origen y si tiene comprobante). ' +
      'Sin filtros trae los más recientes. Usalo para responder consultas ("¿cuánto gasté en cemento la semana pasada?"), ' +
      'detectar duplicados (comparando comercio/descripción/origen) o encontrar el id de un registro a editar/borrar.',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'fecha desde, YYYY-MM-DD (inclusive)' },
        to: { type: 'string', description: 'fecha hasta, YYYY-MM-DD (inclusive)' },
        query: { type: 'string', description: 'palabra clave a buscar en título, comercio, descripción o ítems' },
        type: { type: 'string', enum: ['expense', 'payment', 'provider_expense'] },
        category: { type: 'string' },
        limit: { type: 'number', description: 'cuántos traer (máx 25, por defecto 10)' },
        projectId: { type: 'string', description: 'id de la obra; omitilo para usar la activa' },
      },
      required: [],
    },
    handler: async (args, ctx) => {
      const projectId = args.projectId || ctx.activeProject?.id;
      // Authorization: only search a project the authenticated user owns.
      const project = ctx.activeProjects.find((p) => p.id === projectId);
      if (!project) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };
      const expenses = await searchProjectExpenses(project.id, {
        from: parseDate(args.from),
        to: parseDate(args.to),
        query: args.query,
        type: args.type,
        category: args.category,
        limit: Math.min(args.limit || 10, 25),
      });
      return { ok: true, project: project.name, expenses };
    },
  },

  {
    name: 'edit_expense',
    description:
      'Corrige o MUEVE un registro YA existente. Pasá su expenseId (lo tenés de tus acciones previas o de look_up_expenses) y solo los campos a cambiar. ' +
      'Usá esto para corregir montos, títulos, categorías o tipo, o para mover el registro a otra obra (projectId) — NUNCA crees un gasto de "ajuste" ni lo borres y rehagas para corregir.',
    parameters: {
      type: 'object',
      properties: {
        expenseId: { type: 'string' },
        projectId: { type: 'string', description: 'mover el registro a otra obra: id exacto de una obra del profesional' },
        title: { type: 'string' },
        amount: { type: 'number' },
        category: { type: 'string' },
        type: { type: 'string', enum: ['expense', 'payment', 'provider_expense'] },
        scopeType: { type: 'string', enum: ['original', 'addition'], description: 'marcar como adicional/imprevisto ("addition") o original' },
        itemId: { type: 'string', description: 'imputar a un ítem/sub-presupuesto de la obra (de list_items)' },
        description: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, amount: { type: 'number' } },
            required: ['name', 'amount'],
          },
        },
        paymentMethod: { type: 'string' },
        vendor: { type: 'string' },
        recipient: { type: 'string' },
        recipientPlatform: { type: 'string' },
        recipientCuit: { type: 'string' },
        installmentPercent: { type: 'number' },
        date: { type: 'string', description: 'corregir la fecha, YYYY-MM-DD' },
      },
      required: ['expenseId'],
    },
    handler: async (args, ctx) => {
      // Ownership of the EXPENSE enforced inside updateExpense (providerId === userId).
      const patch = {};
      for (const k of ['title', 'category', 'type', 'scopeType', 'itemId', 'description', 'paymentMethod', 'vendor', 'recipientPlatform', 'recipientCuit', 'items']) {
        if (args[k] !== undefined) patch[k] = args[k];
      }
      if (args.recipient !== undefined) patch.recipientName = args.recipient;
      const d = parseDate(args.date);
      if (d) patch.date = d;

      // Move to another obra: authorize the TARGET (must be one of the user's own
      // obras) and update the denormalized name/tag so the dashboard stays correct.
      if (args.projectId !== undefined) {
        const target = ctx.activeProjects.find((p) => p.id === args.projectId);
        if (!target) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };
        patch.projectId = target.id;
        patch.projectName = target.name;
        patch.projectTag = target.tag || null;
      }

      // Amount: recompute from items if those were edited; else take the given amount.
      let warning;
      if (Array.isArray(args.items) && args.items.length) {
        const r = resolveAmount(args);
        patch.amount = r.amount;
        warning = r.warning;
      } else if (args.amount !== undefined) {
        patch.amount = Number(args.amount);
      }

      const res = await updateExpense(ctx.userId, args.expenseId, patch);
      if (!res.ok) return res;

      // Build the confirmation from the expense's full post-edit state.
      const full = await getExpense(ctx.userId, args.expenseId);
      const projName = ctx.activeProjects.find((p) => p.id === full?.projectId)?.name || patch.projectName || null;
      const confirmation = full
        ? formatMovementConfirmation({
            action: 'actualizado', type: full.type, project: projName,
            title: full.title, amount: full.amount, category: full.category,
            vendor: full.vendor, recipient: full.recipientName, date: args.date || null,
          })
        : undefined;
      return { ok: true, expenseId: args.expenseId, confirmation, warning: warning || undefined };
    },
  },

  {
    name: 'get_receipt_image',
    // Exposed on all channels. On MCP the client model (Claude) is multimodal and sees
    // the image natively; on WhatsApp the loop feeds the returned image back into the
    // Gemini turn (see loop.js) so Gemini can re-read a comprobante to clear up doubts.
    // Spends vision tokens on WhatsApp — use it to resolve confusion, not routinely.
    description:
      'Devuelve la imagen del comprobante de un gasto para leerla/compararla (ej: aclarar una duda del profesional, o confirmar si dos gastos son el mismo). ' +
      'Pasá el expenseId (lo obtenés de look_up_expenses). Solo imágenes; si el comprobante es un PDF, devuelve el link.',
    parameters: {
      type: 'object',
      properties: { expenseId: { type: 'string' } },
      required: ['expenseId'],
    },
    handler: async (args, ctx) => {
      const media = await getExpenseMedia(ctx.userId, args.expenseId);
      if (!media) return { ok: false, error: 'No existe ese registro o no es tuyo.' };
      if (!media.imageUrl) {
        return media.fileUrl
          ? { ok: false, error: 'El comprobante es un PDF, no una imagen.', fileUrl: media.fileUrl }
          : { ok: false, error: 'Ese gasto no tiene comprobante adjunto.' };
      }
      const resp = await fetch(media.imageUrl);
      if (!resp.ok) return { ok: false, error: 'No pude descargar el comprobante.' };
      const mimeType = resp.headers.get('content-type') || 'image/jpeg';
      const data = Buffer.from(await resp.arrayBuffer()).toString('base64');
      // `image` is rendered as MCP image content by the MCP server (see src/mcp/server.js).
      return { ok: true, title: media.title, image: { data, mimeType } };
    },
  },

  {
    name: 'delete_expense',
    description:
      'Borra un registro existente. Borrar SIEMPRE requiere confirmación: llamala primero SIN confirm para ver qué se borraría, ' +
      'mostrale eso al profesional, y recién cuando confirme, llamala de nuevo con confirm=true.',
    parameters: {
      type: 'object',
      properties: {
        expenseId: { type: 'string' },
        confirm: { type: 'boolean', description: 'true solo después de que el profesional confirmó' },
      },
      required: ['expenseId'],
    },
    handler: async (args, ctx) => {
      // Confirm gate: first call (no confirm) returns what would be deleted.
      if (!args.confirm) {
        const e = await getExpense(ctx.userId, args.expenseId);
        if (!e) return { ok: false, error: 'No existe ese registro o no es tuyo.' };
        return { ok: false, needs_confirmation: true, summary: { title: e.title, amount: e.amount, type: e.type } };
      }
      return await deleteExpense(ctx.userId, args.expenseId);
    },
  },

  {
    name: 'close_project',
    description:
      'Cierra/archiva una obra terminada: deja de aparecer en la lista de obras activas pero NO se borra nada (los gastos y el resumen quedan). ' +
      'Requiere confirmación: llamala primero SIN confirm para mostrar qué se va a cerrar, y con confirm=true recién cuando el profesional confirme.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'id de la obra a cerrar' },
        confirm: { type: 'boolean', description: 'true solo después de que el profesional confirmó' },
      },
      required: ['projectId'],
    },
    handler: async (args, ctx) => {
      const target = ctx.activeProjects.find((p) => p.id === args.projectId);
      if (!target) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };
      if (!args.confirm) return { ok: false, needs_confirmation: true, summary: { name: target.name } };
      return await closeProject(ctx.userId, args.projectId);
    },
  },

  {
    name: 'get_share_link',
    description:
      'Genera el código/enlace de invitación para que el dueño (cliente) siga la obra en vivo. ' +
      'Devolvé al profesional el texto "invite" tal cual, para que se lo reenvíe al cliente. ' +
      'Por defecto la obra activa; pasá projectId para otra. Si "alreadyJoined" es true, el cliente ya está conectado.',
    parameters: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'id de la obra; omitilo para la activa' } },
      required: [],
    },
    handler: async (args, ctx) => {
      const projectId = args.projectId || ctx.activeProject?.id;
      if (!projectId) return { ok: false, error: 'No hay obra activa.' };
      if (!ctx.activeProjects.find((p) => p.id === projectId)) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };
      const res = await getShareLink(ctx.userId, projectId);
      if (!res.ok) return res;
      // The CODE rides under `__deliver`: WhatsApp sends it as its own crystal-clean,
      // isolated bubble (one long-press to copy/forward), and the loop hides it from
      // the model so it never recites the code. The model only gets `clientUrl` +
      // `delivered:true`, so it can give a short instruction but cannot leak the code.
      // MCP (no adapter) reads __deliver and presents it itself.
      return {
        ok: true,
        project: res.project,
        alreadyJoined: res.alreadyJoined,
        delivered: true,
        clientUrl: res.clientUrl,
        __deliver: res.shareToken,
      };
    },
  },

  {
    name: 'list_items',
    description:
      'Lista los ítems (sub-presupuestos) de una obra — ej "Baño", "Cocina" — con su presupuesto de mano de obra, rango de materiales, ' +
      'presupuesto total estimado y lo gastado hasta ahora. Útil en obras grandes que se presupuestan por sección. Por defecto la obra activa.',
    parameters: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'id de la obra; omitilo para la activa' } },
      required: [],
    },
    handler: async (args, ctx) => {
      const projectId = args.projectId || ctx.activeProject?.id;
      if (!projectId) return { ok: false, error: 'No hay obra activa.' };
      if (!ctx.activeProjects.find((p) => p.id === projectId)) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };
      return await listItems(ctx.userId, projectId);
    },
  },

  {
    name: 'manage_item',
    description:
      'Crea o actualiza un ítem/sub-presupuesto de la obra (ej "Baño": mano de obra $X, materiales entre $min y $max). ' +
      'SIN itemId crea uno nuevo (solo el nombre es obligatorio); CON itemId actualiza ese. ' +
      'Sirve para presupuestar obras grandes por sección sin adivinar un total único. Por defecto la obra activa.',
    parameters: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'id del ítem a actualizar; omitilo para crear uno nuevo' },
        projectId: { type: 'string', description: 'id de la obra (al crear); omitilo para la activa' },
        name: { type: 'string', description: 'nombre del ítem (ej "Baño", "Cocina")' },
        laborBudget: { type: 'number', description: 'presupuesto de mano de obra en ARS' },
        materialsBudgetMin: { type: 'number', description: 'mínimo estimado de materiales en ARS' },
        materialsBudgetMax: { type: 'number', description: 'máximo estimado de materiales en ARS' },
        plannedStartDate: { type: 'string', description: 'inicio planificado, YYYY-MM-DD' },
        plannedEndDate: { type: 'string', description: 'fin planificado, YYYY-MM-DD' },
      },
      required: [],
    },
    handler: async (args, ctx) => {
      const dates = {
        plannedStartDate: args.plannedStartDate !== undefined ? parseDate(args.plannedStartDate) : undefined,
        plannedEndDate: args.plannedEndDate !== undefined ? parseDate(args.plannedEndDate) : undefined,
      };
      // Update path: ownership of the item is enforced inside updateItem.
      if (args.itemId) {
        return await updateItem(ctx.userId, args.itemId, {
          name: args.name, laborBudget: args.laborBudget,
          materialsBudgetMin: args.materialsBudgetMin, materialsBudgetMax: args.materialsBudgetMax,
          ...dates,
        });
      }
      // Create path: authorize the target obra (must be one of the user's own).
      const projectId = args.projectId || ctx.activeProject?.id;
      if (!projectId) return { ok: false, error: 'No hay obra activa.' };
      if (!ctx.activeProjects.find((p) => p.id === projectId)) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };
      return await createItem(ctx.userId, {
        projectId, name: args.name, laborBudget: args.laborBudget,
        materialsBudgetMin: args.materialsBudgetMin, materialsBudgetMax: args.materialsBudgetMax,
        ...dates,
      });
    },
  },

  {
    name: 'manage_material',
    description:
      'Agrega un material a un ítem de la obra, opcionalmente con una cotización (comercio + monto). ' +
      'Ej: "para el baño, azulejos cotizados por Cerámica Norte a 200000". Pasá el itemId (de list_items). ' +
      'Para reorganizar materiales o cotizaciones en detalle, el profesional lo hace desde la web.',
    parameters: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'id del ítem al que pertenece el material (de list_items)' },
        name: { type: 'string', description: 'nombre del material (ej "Azulejos", "Cemento")' },
        vendor: { type: 'string', description: 'comercio que lo cotizó (opcional)' },
        amount: { type: 'number', description: 'monto cotizado en ARS (opcional)' },
        notes: { type: 'string', description: 'notas (opcional)' },
      },
      required: ['itemId', 'name'],
    },
    handler: async (args, ctx) => {
      // Ownership enforced inside addMaterial (the item's providerId === userId).
      return await addMaterial(ctx.userId, {
        itemId: args.itemId, name: args.name,
        vendor: args.vendor, amount: args.amount, notes: args.notes,
      });
    },
  },
];

// ── Channel-specific views, all derived from the one TOOLS registry ───────────

/** A tool is exposed on a channel when it has no `channels` whitelist, or lists it. */
const exposedOn = (tool, channel) => !tool.channels || tool.channels.includes(channel);

/** Gemini function-calling format: a single tool block of function declarations. */
export const TOOL_DECLARATIONS = [
  {
    functionDeclarations: TOOLS
      .filter((t) => exposedOn(t, 'gemini'))
      .map(({ name, description, parameters }) => ({ name, description, parameters })),
  },
];

/** MCP `tools/list` format: [{ name, description, inputSchema }]. */
export function toMcpTools() {
  return TOOLS
    .filter((t) => exposedOn(t, 'mcp'))
    .map(({ name, description, parameters }) => ({ name, description, inputSchema: parameters }));
}

const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

/**
 * Build the dispatcher bound to this turn's context. Returns async (name, args)
 * => result. Tools return `{ ok, ... }`. The same dispatcher serves every channel
 * — only `ctx` differs (see the context contract above).
 */
export function makeDispatcher(ctx) {
  // Normalize once so handlers can read/mutate ctx.activeProjects freely
  // (create_project pushes the new obra here for the rest of the turn).
  ctx.activeProjects = ctx.activeProjects || [];

  return async (name, args = {}) => {
    const tool = TOOLS_BY_NAME.get(name);
    if (!tool) return { ok: false, error: `Tool desconocida: ${name}` };

    // Session channels (WhatsApp/app) log tool calls against their assistant message
    // (repo.appendAssistantMessage). Channels with no session — MCP — set
    // ctx.auditToolCalls so the call lands in tool_call_log instead. Avoids double-logging.
    if (!ctx.auditToolCalls) return tool.handler(args, ctx);

    const startedAt = Date.now();
    let result;
    let thrown;
    try {
      result = await tool.handler(args, ctx);
      return result;
    } catch (err) {
      thrown = err;
      throw err;
    } finally {
      // Best-effort, fire-and-forget: never let the audit write delay or break the call.
      logToolCall({
        userId: ctx.userId,
        channel: ctx.source || 'unknown',
        tool: name,
        args,
        result: thrown ? null : result,
        status: thrown || result?.ok === false ? 'error' : 'ok',
        errorText: thrown ? thrown.message : result?.ok === false ? result.error : null,
        durationMs: Date.now() - startedAt,
      });
    }
  };
}
