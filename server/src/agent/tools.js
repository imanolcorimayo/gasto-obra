// Tool declarations (sent to Gemini) + the dispatcher that executes them.
// Tools act through the per-turn `ctx` (data + capability callbacks the channel
// adapter provides), so the agent core stays transport- and storage-agnostic.
//
// Starting small: list_projects (read) + switch_project (write via capability).
// record_expense / get_summary land in Phase 0.4.

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

      default:
        return { ok: false, error: `Tool desconocida: ${name}` };
    }
  };
}
