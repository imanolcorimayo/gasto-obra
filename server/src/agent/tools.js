import { createExpense } from '../helpers/expenseWrite.js';
import { getProjectSummary } from '../helpers/expenseSummary.js';

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
            installmentPercent: {
              type: 'number',
              description: '100 solo si el cliente YA pagó este gasto; si no, 0',
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

      case 'record_expense': {
        const projectId = args.projectId || ctx.activeProject?.id;
        if (!projectId) {
          return { ok: false, error: 'No hay obra activa. Pedile al profesional que elija una.' };
        }
        // Authorization: only ever act on a project the authenticated user owns.
        // `projects` is the user's own active-project list; never trust a raw id.
        const project = projects.find((p) => p.id === projectId);
        if (!project) return { ok: false, error: 'No encontré esa obra entre las tuyas.' };

        const amount = Number(args.amount);
        if (!amount || amount <= 0) return { ok: false, error: 'Falta el monto o es inválido.' };

        const { expenseId } = await createExpense(ctx.userId, {
          projectId: project.id,
          type: args.type || 'expense',
          title: args.title || args.items?.[0]?.name || 'Gasto',
          amount,
          category: args.category || 'otros',
          description: args.description || '',
          items: args.items || null,
          paymentMethod: args.paymentMethod || null,
          installmentPercent: args.installmentPercent ?? 0,
          source: ctx.source || 'app',
          originalMessage: ctx.originalMessage || '',
        });
        return {
          ok: true,
          expenseId,
          registered: {
            type: args.type || 'expense',
            title: args.title || 'Gasto',
            amount,
            category: args.category || 'otros',
            project: project.name,
          },
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

      default:
        return { ok: false, error: `Tool desconocida: ${name}` };
    }
  };
}
