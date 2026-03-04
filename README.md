# gasto obra

Construction expense tracking via WhatsApp. Built for people managing renovation projects who need to log every cost, track payments, and share progress with clients — without leaving their phone.

---

## What it does

- **WhatsApp bot** — log expenses in natural language. Text, photo, or voice note. Gemini parses it into structured data.
- **Web dashboard** — view expense history, track budget, manage categories and recipients, generate client reports.
- **Client view** — shareable read-only link (no login required) showing a running balance for the project.
- **Daily summary** — automated digest sent each morning via WhatsApp to linked accounts.

---

## Stack

| Layer | Technology | Deployment |
|---|---|---|
| Frontend | Nuxt 3 · Vue 3 · TypeScript · Tailwind CSS · Pinia | Firebase Hosting |
| Backend | Express.js · Node.js | Render |
| Database | Firebase Firestore | — |
| Auth | Firebase Auth (Google) | — |
| Bot | WhatsApp Business API (Meta) | — |
| AI | Google Gemini (text, vision, audio) | — |

---

## Project structure

```
gasto-obra/
├── web/          # Nuxt 3 frontend
├── server/       # Express.js backend + WhatsApp webhook
├── docs/         # Design system and logo system docs
└── tasks/        # Ongoing task tracking and gap analysis
```

### Frontend (`/web`)

```
pages/
  index.vue                  # Landing + Google login
  projects/
    index.vue                # Project grid
    new.vue                  # Create project
    [id].vue                 # Project detail (main dashboard)
  settings/
    whatsapp.vue             # WhatsApp account linking
    categories.vue           # Category management
    recipients.vue           # Payment recipient management
  client/
    index.vue                # Client portal landing
    join.vue                 # Join via invite
    project/[id].vue         # Client project view
  view/[token].vue           # Legacy public share view

components/                  # 15 components (AppHeader, ExpenseCard, ExpenseSummary, ...)
stores/                      # 5 Pinia stores (project, expense, category, recipient, whatsapp)
utils/odm/                   # Custom Firestore ODM (Schema base class + Validator + typed queries)
```

### Backend (`/server`)

```
webhooks/wp_webhook.js       # WhatsApp webhook handler (~1,600 lines)
handlers/GeminiHandler.js    # Gemini API wrapper (text + vision + audio)
scripts/send-daily-summary.js # Cron job for morning digest
```

---

## Data model

| Collection | Scope | Key fields |
|---|---|---|
| `projects` | per user | name, tag, budget, status, clientName, shareToken |
| `expenses` | per project | type, amount, category, recipient, isPaid, linkedPaymentId |
| `whatsappLinks` | per user | phone, linkedAt, pendingCode |

Expense types: `gasto` (expense) · `cobro` (payment received) · `gasto_propio` (provider's own expense)

Default categories: Materiales · Herramientas · Transporte · Mano de obra · Comida · Otros

---

## Setup

### Prerequisites

- Node.js 18+
- Firebase project with Firestore + Authentication enabled
- Meta WhatsApp Business API app
- Google Gemini API key

### Environment variables

**`/web/.env`**
```
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
NUXT_PUBLIC_API_URL=
```

**`/server/.env`**
```
PORT=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
GEMINI_API_KEY=
WHATSAPP_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

### Running locally

```bash
# Frontend
cd web && npm install && npm run dev

# Backend
cd server && npm install && node webhooks/wp_webhook.js
```

### Deploy

```bash
# Frontend → Firebase Hosting
cd web && npm run build && firebase deploy

# Backend → Render (push to connected branch)
```

---

## Notes

- Language: Spanish (Argentine). Currency: ARS (`es-AR` locale).
- SPA mode (SSR disabled for authenticated routes).
- Dark mode default; light mode supported.
- The `/view/[token]` route is public — no auth required.
- Firestore security rules are not yet configured. **Do not use in production without them.**
