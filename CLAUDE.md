# Gasto Obra

Expense reporting system for apartment renovation projects. Service providers report daily expenses via WhatsApp, apartment owners view them through a web dashboard. Monorepo with two packages:

## Purpose (directional, not strict)

What Gasto Obra IS — every feature should serve one of these:

- **Zero-friction capture from the field**: a WhatsApp photo/message from the ferretería IS the registration. Protect this above all.
- **Simple expense/income registering**: own business expenses or on behalf of a client; materiales/insumos or mano de obra.
- **Financial clarity**: makes it obvious how the provider's business is doing.
- **Client communication & trust**: the receipt trail (respaldo) and transparency are the product; the dashboard is just the view.
- **Collaboration**: work with more technicians/businesses (attributing money to people).
- **AI-first**: most of the work is handled by AI assistants (WhatsApp agent, MCP), not forms.

What Gasto Obra is NOT:

- Not a job/obra organization tool (no tasks, progress %, work planning).
- Not a calendar.
- Not a quoting/presupuesto builder — budget is one number to compare spend against, not itemized estimates.
- Not accounting/tax software — no ARCA/AFIP compliance, IVA, invoicing.
- Not an inventory/materials manager (no material lists, deliveries, proposals).
- Not payroll — colaboradores attributes money, it doesn't manage people.

Evidence basis (July 2026): real usage is WhatsApp receipt photos + payments + client share. The items/installments/deliveries/mgmt-fee cluster saw zero sustained real adoption and added friction.

- **`/web`** - Nuxt 3 (Vue 3) frontend with Firebase, Pinia, Tailwind CSS
- **`/server`** - Node.js backend: WhatsApp chatbot (Express) + daily summary cron script

Both packages share the same Firebase project and Firestore database. See each package's `CLAUDE.md` for domain-specific context.

## Deployment

Auto-deploys on push to `main` via GitHub Actions:
- `server/**` changes → `.github/workflows/deploy-server.yml` SSHes into the DO droplet, pulls, `npm install`, and `pm2 restart gasto-obra-webhook gasto-obra-api`.
- `docs/**` changes → `.github/workflows/deploy-docs.yml`.
- `web/**` deploys via Firebase Hosting (Nuxt build).

Do NOT instruct the user to manually `git pull` / `pm2 restart` after a push — pushing to `main` is enough. Only suggest manual steps for hotfixes done directly on the droplet.

## Key Concepts

- **Provider (Proveedor)**: The service provider doing the renovation work. Has Firebase Auth account, sends expenses via WhatsApp.
- **Client (Cliente/Dueño)**: The apartment owner. Gets a read-only web link + daily WhatsApp summary. No auth needed.
- **Project (Proyecto/Obra)**: A renovation project. Selected via the PROYECTO command in WhatsApp before sending expenses.
- **Expense (Gasto)**: A single expense entry. Can come from WhatsApp (text, image, audio) or web.

## Language

All user-facing text is in **Spanish (Argentine)**. Currency: ARS with `es-AR` locale.

## AI Image/PDF Analysis

`/docs/conflictive-reports/` contains real receipt images that caused parsing issues, with `notes.md` documenting each problem and its fix/status. Use this folder as reference when working on AI prompting improvements.

## UX Philosophy

Keep code simple, but never at the expense of user experience. Every user-facing flow should feel intentional and complete — proper redirects, clear feedback, no dead ends. "Simple" means minimal code complexity, not minimal polish. Do it once, do it right.

**Challenge before building**: Before implementing any user-facing change, evaluate whether it actually improves the experience. If a requested feature contradicts existing UX principles (message economy, register flow brevity, etc.), flag it with a clear reason before writing code — even if the task was already approved. Building the wrong thing is always more expensive than a 30-second pushback.

## Dependencies Policy

Avoid adding libraries for things that can be done with plain JS. Input validation, rate limiting, and similar utilities should use simple guard clauses and native code — no zod, joi, express-rate-limit, etc.

## Casquito (Mascot)

Hardhat from the logo with two dots for eyes. No mouth, no limbs. Emotion via eye shape, head tilt, and contextual symbols. All components are pure SVG, accept a `size` prop (default 100), and live in `web/components/`. Full design spec: `docs/casquito-demo.html`.

| Component | State | Use for |
|---|---|---|
| `CasquitoNeutral` | Calm, symmetric eyes, float | Default/idle states |
| `CasquitoHappy` | Arc eyes, sparkles, bounce | Success, completion |
| `CasquitoConfused` | Tilted, asymmetric eyes, "?", wobble | 404, errors, FAQ |
| `CasquitoWorking` | Neutral eyes, hammer, dust, bob | Loading, processing |
| `CasquitoAlert` | Wide eyes with highlights, "!", pulse | Warnings, attention |
| `CasquitoSleeping` | Closed eyes (lines), "zzz", sway | Maintenance, inactive |

## GitHub CLI (gh)

Remote uses custom SSH alias `github-corimayo`, so `gh` commands need `--repo imanolcorimayo/gasto-obra` flag.
Project board: "Gasto Obra - Tickets" (#13, ID: `PVT_kwHOBS8o6M4BQMMH`). Status field ID: `PVTSSF_lAHOBS8o6M4BQMMHzg-YcnA`, options: Backlog(`f75ad846`), Ready(`61e4505c`), In progress(`47fc9ee4`), In review(`df73e18b`), Done(`98236657`).
