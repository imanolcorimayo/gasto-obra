# Gasto Obra - Server

Node.js backend: WhatsApp webhook for expense registration + daily summary cron.

## Architecture

```
server/
├── src/
│   ├── index.js                  # Future formal API server (api.gastoobra.com)
│   ├── config/
│   │   └── firebase.js           # Firebase Admin SDK initialization + Firestore export
│   ├── handlers/                 # External service integrations (classes)
│   │   └── GeminiHandler.js      # Gemini AI: receipt parsing, audio transcription, categorization
│   ├── helpers/                  # Stateless utility functions
│   │   ├── whatsapp.js           # sendMessage(), downloadMedia() — WhatsApp Cloud API wrapper
│   │   ├── phone.js              # Phone normalization (Argentine format handling)
│   │   └── responseFormatter.js  # All user-facing WhatsApp message templates
│   ├── webhooks/                 # Webhook servers (one file per webhook)
│   │   └── wp_webhook.js         # WhatsApp Business API webhook (Express)
│   └── scripts/
│       └── send-daily-summary.js # Daily expense summary to clients (cron, 8 PM ART)
├── lib/
│   ├── instrument.js             # Sentry error tracking
│   └── logger.js                 # Winston logging
└── package.json
```

### Module roles

- **Handlers**: Classes that manage external service interactions (Gemini API, future image storage provider). Each handler encapsulates a third-party service's API.
- **Helpers**: Stateless utility functions for reusable logic (phone formatting, WhatsApp message sending, message templates, future image compression). No side effects beyond their explicit purpose.
- **Webhooks**: Self-contained Express servers. Each file represents one webhook integration. The webhook stays monolithic for its business logic but delegates to handlers/helpers.
- **Config**: Shared initialization (Firebase, env). Imported by webhooks, scripts, and the future API server.
- **`src/index.js`**: Future formal API endpoint. Separate from webhooks — will serve authenticated REST endpoints.

### WhatsApp Webhook (`src/webhooks/wp_webhook.js`)
- Express server receiving WhatsApp Business API webhooks
- Account linking via verification codes
- Parses expense messages: `$500 Clavos #flores3b`
- Handles receipt images (Gemini Vision) and audio (Gemini transcription)
- Commands: VINCULAR, DESVINCULAR, AYUDA, PROYECTO, RESUMEN

## Firestore Collections
- `projects` - Renovation projects
- `expenses` - Expense records
- `categories` - Custom expense categories (global or project-specific)
- `whatsappLinks` - Account linking state

## Expense Categories
materiales, herramientas, transporte, mano de obra, comida, otros

## WhatsApp Message Format
`$<amount> <title> #<projectTag> d:<description> c:<category>`

## Environment Variables
See `.env.example`
