# Gasto Obra

Expense reporting system for apartment renovation projects. Service providers report daily expenses via WhatsApp, apartment owners view them through a web dashboard. Monorepo with two packages:

- **`/web`** - Nuxt 3 (Vue 3) frontend with Firebase, Pinia, Tailwind CSS
- **`/server`** - Node.js backend: WhatsApp chatbot (Express) + daily summary cron script

Both packages share the same Firebase project and Firestore database. See each package's `CLAUDE.md` for domain-specific context.

## Key Concepts

- **Provider (Proveedor)**: The service provider doing the renovation work. Has Firebase Auth account, sends expenses via WhatsApp.
- **Client (Cliente/Dueño)**: The apartment owner. Gets a read-only web link + daily WhatsApp summary. No auth needed.
- **Project (Proyecto/Obra)**: A renovation project. Has a `#tag` for WhatsApp messages.
- **Expense (Gasto)**: A single expense entry. Can come from WhatsApp (text, image, audio) or web.

## Language

All user-facing text is in **Spanish (Argentine)**. Currency: ARS with `es-AR` locale.
