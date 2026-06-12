import { createExpense, updateExpense, deleteExpense, getExpense } from '../helpers/expenseWrite.js';
import { getProjectSummary, searchProjectExpenses } from '../helpers/expenseSummary.js';
import { formatMovementConfirmation } from '../helpers/movementConfirmation.js';
import { createProject } from '../helpers/projects.js';

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

// Tool declarations (sent to Gemini) + the dispatcher that executes them.
// The agent core stays transport/storage-agnostic; TOOLS are the domain bridge —
// they read contextual data + channel capabilities from the per-turn `ctx`, and
// may touch Firestore directly (that's the "domain behind tools" design).

export const TOOL_DECLARATIONS = [
  {
    functionDeclarations: [
      {
        name: 'list_projects',
        description: 'Lista las obras activas del profesional, con su id, nombre y tag.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'switch_project',
        description:
          'Cambia la obra activa donde se registran los gastos. Pasá el id exacto de una obra existente del profesional.',
        parameters: {
          type: 'object',
          properties: { projectId: { type: 'string', description: 'id exacto de la obra' } },
          required: ['projectId'],
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
      },
      {
        name: 'record_expense',
        description:
          'Registra una transacción en la obra activa. Extraé los datos del mensaje del profesional. ' +
          'Tipos: "expense" (gasto/compra para la obra, lo debe el cliente), "payment" (cobro: plata que pagó el cliente), ' +
          '"provider_expense" (gasto propio: lo pagó el profesional de su bolsillo). ' +
          'Si falta el monto o no se entiende qué es, NO llames esta tool: preguntá primero.',
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
            date: {
              type: 'string',
              description: 'fecha del gasto en formato YYYY-MM-DD. Omitilo para hoy; usalo para registrar gastos de días pasados.',
            },
            projectId: { type: 'string', description: 'id de la obra; omitilo para usar la activa' },
          },
          required: ['type', 'title', 'amount'],
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
      },
      {
        name: 'look_up_expenses',
        description:
          'Busca registros de la obra activa (id, tipo, título, monto, categoría, fecha). Sin filtros trae los más recientes. ' +
          'Usalo para responder consultas ("¿cuánto gasté en cemento la semana pasada?") o para encontrar el id de un registro a editar/borrar.',
        parameters: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'fecha desde, YYYY-MM-DD (inclusive)' },
            to: { type: 'string', description: 'fecha hasta, YYYY-MM-DD (inclusive)' },
            query: { type: 'string', description: 'palabra clave a buscar en título, comercio, descripción o ítems' },
            type: { type: 'string', enum: ['expense', 'payment', 'provider_expense'] },
            category: { type: 'string' },
            limit: { type: 'number', description: 'cuántos traer (máx 25, por defecto 10)' },
          },
          required: [],
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
      },
    ],
  },
];

/** Build the dispatcher bound to this turn's context. Tools return { ok, ... }. */
export function makeDispatcher(ctx) {
  const projects = ctx.activeProjects || [];

  return async (name, args = {}) => {
    switch (name) {
      case 'list_projects':
        return { ok: true, projects: projects.map((p) => ({ id: p.id, name: p.name, tag: p.tag })) };

      case 'switch_project': {
        const target = projects.find((p) => p.id === args.projectId);
        if (!target) return { ok: false, error: 'No existe una obra con ese id.' };
        if (typeof ctx.setActiveProject !== 'function') {
          return { ok: false, error: 'Este canal no permite cambiar la obra activa.' };
        }
        await ctx.setActiveProject(target.id);
        return { ok: true, activeProject: { id: target.id, name: target.name } };
      }

      case 'create_project': {
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
        projects.push(created.project);

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
      }

      case 'record_expense': {
        const projectId = args.projectId || ctx.activeProject?.id;
        if (!projectId) {
          return { ok: false, error: 'No hay obra activa. Pedile al profesional que elija una.' };
        }
        // Authorization: only ever act on a project the authenticated user owns.
        // `projects` is the user's own active-project list; never trust a raw id.
        const project = projects.find((p) => p.id === projectId);
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
        return {
          ok: true,
          expenseId,
          confirmation,
          warning: warning || undefined,
          registered: { type, title, amount, category, vendor: args.vendor || null, recipient: args.recipient || null, project: project.name },
        };
      }

      case 'get_summary': {
        const projectId = args.projectId || ctx.activeProject?.id;
        if (!projectId) return { ok: false, error: 'No hay obra activa.' };
        // Authorization: only summarize a project the authenticated user owns.
        const project = projects.find((p) => p.id === projectId);
        if (!project) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };

        const summary = await getProjectSummary(project.id);
        return { ok: true, project: project.name, summary };
      }

      case 'look_up_expenses': {
        const project = projects.find((p) => p.id === ctx.activeProject?.id);
        if (!project) return { ok: false, error: 'No hay obra activa.' };
        const expenses = await searchProjectExpenses(project.id, {
          from: parseDate(args.from),
          to: parseDate(args.to),
          query: args.query,
          type: args.type,
          category: args.category,
          limit: Math.min(args.limit || 10, 25),
        });
        return { ok: true, project: project.name, expenses };
      }

      case 'edit_expense': {
        // Ownership of the EXPENSE enforced inside updateExpense (providerId === userId).
        const patch = {};
        for (const k of ['title', 'category', 'type', 'description', 'paymentMethod', 'vendor', 'recipientPlatform', 'recipientCuit', 'items']) {
          if (args[k] !== undefined) patch[k] = args[k];
        }
        if (args.recipient !== undefined) patch.recipientName = args.recipient;
        const d = parseDate(args.date);
        if (d) patch.date = d;

        // Move to another obra: authorize the TARGET (must be one of the user's own
        // obras) and update the denormalized name/tag so the dashboard stays correct.
        if (args.projectId !== undefined) {
          const target = projects.find((p) => p.id === args.projectId);
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
        const projName = projects.find((p) => p.id === full?.projectId)?.name || patch.projectName || null;
        const confirmation = full
          ? formatMovementConfirmation({
              action: 'actualizado', type: full.type, project: projName,
              title: full.title, amount: full.amount, category: full.category,
              vendor: full.vendor, recipient: full.recipientName, date: args.date || null,
            })
          : undefined;
        return { ok: true, expenseId: args.expenseId, confirmation, warning: warning || undefined };
      }

      case 'delete_expense': {
        // Confirm gate: first call (no confirm) returns what would be deleted.
        if (!args.confirm) {
          const e = await getExpense(ctx.userId, args.expenseId);
          if (!e) return { ok: false, error: 'No existe ese registro o no es tuyo.' };
          return { ok: false, needs_confirmation: true, summary: { title: e.title, amount: e.amount, type: e.type } };
        }
        return await deleteExpense(ctx.userId, args.expenseId);
      }

      default:
        return { ok: false, error: `Tool desconocida: ${name}` };
    }
  };
}
