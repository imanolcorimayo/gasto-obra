import 'dotenv/config';
import readline from 'node:readline';
import { runAgentTurn } from '../agent/core.js';
import { getActiveProjects } from '../helpers/projects.js';
import { pool } from '../config/mysql.js';

// Interactive CLI for the agent — your terminal is the "channel". Runs the real
// runAgentTurn core (MySQL sessions + live Gemini + Firestore tools), so what you
// see here is what WhatsApp/in-app will do once their adapters exist.
//
//   npm run agent:repl                 → stub projects (safe, no Firestore writes target real data)
//   npm run agent:repl -- <firebaseUid> → loads YOUR real obras; record_expense writes real data
//
// Commands: /obras (list)  /obra (active)  /salir

const DEFAULT_CATEGORIES = ['materiales', 'herramientas', 'transporte', 'mano de obra', 'comida', 'otros'];
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const uid = process.argv[2] || '__cli_test__';
const isStub = uid === '__cli_test__';

let projects;
if (isStub) {
  projects = [
    { id: 'p_cocina', name: 'Cocina Belgrano', tag: 'cocina' },
    { id: 'p_bano', name: 'Baño Palermo', tag: 'bano' },
  ];
} else {
  projects = (await getActiveProjects(uid)).map((p) => ({ id: p.id, name: p.name, tag: p.tag }));
}

let activeProjectId = projects[0]?.id || null;

function context() {
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return {
    userId: uid,
    source: 'cli',
    today,
    activeProjects: projects,
    activeProject: projects.find((p) => p.id === activeProjectId) || null,
    categories: DEFAULT_CATEGORIES,
    setActiveProject: async (id) => { activeProjectId = id; },
  };
}

console.log(bold('\n  Gasto Obra — agente (CLI)'));
console.log(dim(`  user: ${uid}${isStub ? '  (stub projects — no real data)' : '  (REAL — record_expense escribe en Firestore)'}`));
console.log(dim(`  obras: ${projects.map((p) => p.name).join(', ') || '(ninguna)'}`));
console.log(dim('  comandos: /obras  /obra  /salir\n'));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: bold('vos> ') });

// Serialize turns through a queue so input (typed or piped) never races the
// async handler or an EOF close.
const queue = [];
let processing = false;
let closing = false;

rl.on('line', (line) => { queue.push(line); pump(); });
rl.on('close', () => { closing = true; pump(); });

async function pump() {
  if (processing) return;
  processing = true;
  while (queue.length) {
    await handle(queue.shift().trim());
  }
  processing = false;

  if (closing) {
    await pool.end();
    console.log(dim('\n  chau 👋\n'));
    process.exit(0);
  } else {
    rl.prompt();
  }
}

async function handle(text) {
  if (!text) return;
  if (text === '/salir' || text === '/exit') { closing = true; queue.length = 0; return; }
  if (text === '/obras') {
    projects.forEach((p) => console.log(dim(`  - ${p.name} (#${p.tag}) [${p.id}]`)));
    return;
  }
  if (text === '/obra') {
    console.log(dim(`  obra activa: ${context().activeProject?.name || '(ninguna)'}`));
    return;
  }

  try {
    const res = await runAgentTurn({ userId: uid, channel: 'cli', userText: text, context: context() });
    for (const t of res.timeline || []) {
      console.log(dim(`  · ${t.tool}(${JSON.stringify(t.args)}) → ${t.status} ${t.durationMs}ms`));
    }
    console.log(`\n${res.reply}\n`);
  } catch (e) {
    console.error(dim(`  [error] ${e.message}`));
  }
}

rl.prompt();
