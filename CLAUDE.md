# Gasto Obra

Expense reporting system for apartment renovation projects. Service providers report daily expenses via WhatsApp, apartment owners view them through a web dashboard. Monorepo with two packages:

- **`/web`** - Nuxt 3 (Vue 3) frontend with Firebase, Pinia, Tailwind CSS
- **`/server`** - Node.js backend: WhatsApp chatbot (Express) + daily summary cron script

Both packages share the same Firebase project and Firestore database. See each package's `CLAUDE.md` for domain-specific context.

## Key Concepts

- **Provider (Proveedor)**: The service provider doing the renovation work. Has Firebase Auth account, sends expenses via WhatsApp.
- **Client (Cliente/Dueño)**: The apartment owner. Gets a read-only web link + daily WhatsApp summary. No auth needed.
- **Project (Proyecto/Obra)**: A renovation project. Selected via the PROYECTO command in WhatsApp before sending expenses.
- **Expense (Gasto)**: A single expense entry. Can come from WhatsApp (text, image, audio) or web.

## Language

All user-facing text is in **Spanish (Argentine)**. Currency: ARS with `es-AR` locale.

## GitHub CLI (gh)

Remote uses custom SSH alias `github-corimayo`, so `gh` commands need `--repo imanolcorimayo/gasto-obra` flag.
Project board: "Gasto Obra - Tickets" (#13, ID: `PVT_kwHOBS8o6M4BQMMH`). Status field ID: `PVTSSF_lAHOBS8o6M4BQMMHzg-YcnA`, options: Backlog(`f75ad846`), Ready(`61e4505c`), In progress(`47fc9ee4`), In review(`df73e18b`), Done(`98236657`).
