# Gasto Obra

Sistema de control de gastos para obras y remodelaciones. Los proveedores reportan gastos diarios por WhatsApp, los clientes los ven en tiempo real desde un dashboard web.

## Estructura

```
web/     → Nuxt 3 (Vue 3) frontend — dashboard + vista de cliente
server/  → Node.js backend — chatbot WhatsApp (Express) + cron de resumen diario
docs/    → Manual de marca, demo animada, herramientas de documentación
```

Ambos paquetes comparten el mismo proyecto Firebase y base de datos Firestore.

## Cómo funciona

1. El proveedor selecciona un proyecto en WhatsApp con el comando `PROYECTO`
2. Envía gastos con mensajes de texto libre, fotos de tickets o audios
3. La IA (Gemini) interpreta el mensaje y extrae monto, categoría y descripción
4. El gasto aparece en el dashboard del proveedor y en la vista del cliente

## Setup

### Web (frontend)

```bash
cd web
npm install
npm run dev
```

### Server (backend)

```bash
cd server
npm install
node src/webhooks/wp_webhook.js
```

## Demo

Hay una demo animada en HTML/CSS que muestra el flujo completo de la app.

### Ver la demo

```bash
xdg-open docs/demo.html
```

### Generar video de la demo

Requiere Node.js >= 18 y ffmpeg.

```bash
# Instalar dependencias (una sola vez, desde la raíz del proyecto)
npm install

# Capturar y generar el MP4
node docs/capture-demo.js
```

Genera `docs/demo.mp4` — 1920x1080 @60fps, alta calidad (CRF 15).

## Stack

- **Frontend**: Nuxt 3, Vue 3, Tailwind CSS, Firebase, Pinia
- **Backend**: Node.js, Express, Firebase Admin SDK, Gemini API
- **Base de datos**: Firestore
- **Auth**: Firebase Auth (Google)
- **IA**: Google Gemini (parsing de tickets, audio, categorización)
