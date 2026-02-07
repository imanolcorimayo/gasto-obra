# Gasto Obra - Server

Node.js backend: WhatsApp webhook for expense registration + daily summary cron.

## Architecture

### 1. WhatsApp Webhook (`webhooks/wp_webhook.js`)
- Express server receiving WhatsApp Business API webhooks
- Account linking via verification codes
- Parses expense messages: `$500 Clavos #flores3b`
- Handles receipt images (Gemini Vision) and audio (Gemini transcription)
- Commands: VINCULAR, DESVINCULAR, AYUDA, PROYECTOS, RESUMEN #tag

### 2. Daily Summary Script (`scripts/send-daily-summary.js`)
- Sends end-of-day expense summaries to clients via WhatsApp
- Triggered by cron at 8 PM ART

### 3. Handlers (`handlers/GeminiHandler.js`)
- Gemini AI: receipt parsing, audio transcription, expense categorization

## Firestore Collections
- `projects` - Renovation projects
- `expenses` - Expense records
- `whatsappLinks` - Account linking state

## Expense Categories
materiales, herramientas, transporte, mano de obra, comida, otros

## WhatsApp Message Format
`$<amount> <title> #<projectTag> d:<description> c:<category>`

## Environment Variables
See `.env.example`
