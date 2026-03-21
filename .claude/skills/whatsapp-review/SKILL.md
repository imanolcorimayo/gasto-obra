---
name: whatsapp-review
description: Review WhatsApp webhook changes for UX best practices, tone consistency, and conversational flow quality. Use after modifying wp_webhook.js, commands.js, or responseFormatter.js.
allowed-tools: Read, Grep, Glob, Bash
model: sonnet
---

Review the WhatsApp bot changes against the tone guide and UX principles below. Run `git diff` to identify what changed, then read the affected files for full context.

## Two Voices

The bot has two distinct modes. Every user-facing message must clearly belong to one.

### Register flow (tool mode)
- **Tone:** Direct, neutral, transactional. The bot is a tool, not a person.
- **Emojis:** None.
- **Length:** As short as possible. One line when possible.
- **Errors:** Neutral. "No se pudo procesar el mensaje." not "Perdón, no pude...".
- **Confirmations:** State the fact. "Gasto registrado." / "Gasto cancelado."
- **Examples:**
  - "Procesando mensaje..."
  - "Gasto registrado!\n\n*Clavos*\n$500"
  - "Gasto cancelado."
  - "Proyecto cambiado a *Depto 4B*."

### Help mode (companion mode)
- **Tone:** Warm, helpful, conversational. Has personality — like a knowledgeable teammate.
- **Emojis:** Sparingly. Use functional emojis (✅, 📋, 💡, ⚠️) not decorative ones.
- **Length:** Can be longer than register flow, but still concise. No walls of text.
- **Greetings:** Warm but brief. "¡Hola! Escribí tu consulta y te ayudo 💡" not just "Escribí tu consulta."
- **Closings:** Friendly. "¡Listo! Si necesitás algo más, escribí *AYUDA* cuando quieras ✅"
- **Examples:**
  - "¡Hola! Escribí tu consulta y te ayudo 💡"
  - "📋 Para registrar un gasto, mandá un mensaje con el monto y descripción..."
  - "¿Necesitás algo más?"
  - "¡Listo! Si necesitás algo más, escribí *AYUDA* cuando quieras ✅"

### Shared rules (both modes)
- **Language:** Argentine Spanish. Voseo always (tenés, querés, escribí). Never usted.
- **Formatting:** Use *bold* for key data (amounts, names, commands). No CAPS for emphasis.
- **Currency:** ARS, formatted with es-AR locale.

## WhatsApp UX Principles

Check every change against these:

### 1. Three-clicks rule
Users should accomplish their goal in 3 inputs or fewer after the initial message. Every intermediate confirmation or "are you sure?" step must justify its existence. If it's just friction, remove it.

### 2. Message economy
Count the messages the bot sends per interaction. Each message causes a phone buzz. Aim for the minimum:
- **Register flow:** 1 confirmation message + 1 result = 2 messages max (excluding the confirmation buttons).
- **Help mode:** 1 status + 1 answer + 1 follow-up = 3 messages max.
- Never send back-to-back status messages ("Procesando..." then "Buscando...").

### 3. Every state needs an exit
Every pending state (confirmation, selection, support) must have a way out:
- Explicit: accept cancel words ("cancelar", "salir", "no").
- Implicit: TTL auto-clears after timeout.
- Both is best. Never leave users stuck waiting for a timeout.

### 4. Buttons over free text
When the bot expects specific input (yes/no, pick from list), use WhatsApp buttons or list messages. Don't make users guess what to type.

### 5. Don't repeat what the user knows
Skip "Procesando mensaje..." when the response comes fast (< 2s). Don't echo back the user's own message. Don't explain what just happened if the result is self-evident.

### 6. Context preservation
If a user sends a real question, answer it — don't ask them to retype. If a flow is interrupted (new message during pending state), handle the interruption gracefully: auto-confirm the old state or clearly communicate what happened.

### 7. Graceful degradation
When AI fails, external services are down, or the user hits rate limits: give a clear, neutral message and a way forward (retry, contact support, or manual alternative). Never leave users in a dead end.

## Review Checklist

For each changed message or flow, verify:

- [ ] Correct voice (register vs help mode)?
- [ ] Message count minimized?
- [ ] Cancel/exit path exists?
- [ ] No unnecessary intermediate steps?
- [ ] Buttons used where input is constrained?
- [ ] Argentine Spanish, voseo, proper formatting?
- [ ] Error messages are neutral and actionable?
- [ ] TTL race conditions avoided? (setTimeout vs lazy TTL check)
- [ ] No dead ends — user always has a next action?

## Output Format

Group findings by severity:

**Must fix** — UX broken, user stuck, data loss, wrong voice
**Should fix** — Unnecessary friction, extra messages, missing exit
**Consider** — Style tweaks, message wording, minor improvements

For each finding: location (file:line), what's wrong, and a concrete fix.
