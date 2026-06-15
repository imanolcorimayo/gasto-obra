import * as Sentry from '@sentry/node';
import logger from '../../lib/logger.js';
import { normalizePhoneNumber } from './phone.js';

const WP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.IDENTIFIER_WP_NUMBER;
const WP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.ACCESS_TOKEN_WP_BUSINESS;

// WhatsApp rejects text bodies over 4096 chars. Replies should be brief, but as a
// safety net split an over-long message into chunks on the cleanest nearby boundary
// (blank line → newline → sentence → space), so a rare long answer arrives whole
// across a couple of bubbles instead of being rejected.
const WP_TEXT_LIMIT = 3900; // headroom under the 4096 hard cap

function splitForWhatsApp(text, max = WP_TEXT_LIMIT) {
  if (!text || text.length <= max) return [text || ''];
  const chunks = [];
  let rest = text;
  while (rest.length > max) {
    const window = rest.slice(0, max);
    let cut = window.lastIndexOf('\n\n');
    if (cut < max * 0.5) cut = window.lastIndexOf('\n');
    if (cut < max * 0.5) cut = window.lastIndexOf('. ');
    if (cut < max * 0.5) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = max;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function sendOneWhatsAppText(normalizedTo, body) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${WP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'text',
        text: { preview_url: false, body }
      })
    }
  );

  const result = await response.json();
  if (!response.ok) {
    logger.error('Error sending WhatsApp message', { result });
  } else {
    logger.info('WhatsApp message sent', { to: normalizedTo });
  }
}

export async function sendWhatsAppMessage(to, message) {
  const normalizedTo = normalizePhoneNumber(to);

  if (!WP_PHONE_NUMBER_ID || !WP_ACCESS_TOKEN) {
    logger.warn('WhatsApp credentials not configured, skipping message send', { to: normalizedTo, message });
    return;
  }

  try {
    // Almost always one chunk; only over-long replies fan out to multiple bubbles.
    for (const part of splitForWhatsApp(message)) {
      await sendOneWhatsAppText(normalizedTo, part);
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error sending WhatsApp message', { error });
  }
}

export async function sendWhatsAppButtons(to, body, buttons) {
  const normalizedTo = normalizePhoneNumber(to);

  if (!WP_PHONE_NUMBER_ID || !WP_ACCESS_TOKEN) {
    logger.warn('WhatsApp credentials not configured, skipping message send', { to: normalizedTo });
    return;
  }

  // WhatsApp interactive button body must be 1–1024 chars
  const MAX_BODY = 1024;
  if (!body || body.length === 0) {
    body = 'No pude generar el detalle. Confirmá igual o respondé *NO* para descartar.';
  } else if (body.length > MAX_BODY) {
    const suffix = '\n…(detalle recortado)';
    const limit = MAX_BODY - suffix.length;
    let cut = body.slice(0, limit);
    const lastNewline = cut.lastIndexOf('\n');
    if (lastNewline > limit * 0.5) cut = cut.slice(0, lastNewline);
    body = cut + suffix;
    logger.warn('WhatsApp button body exceeded 1024 chars, truncating', { to: normalizedTo, originalLength: body.length });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: body },
            action: {
              buttons: buttons.map((btn, i) => ({
                type: 'reply',
                reply: { id: btn.id || `btn_${i}`, title: btn.title }
              }))
            }
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      logger.error('Error sending WhatsApp buttons', { result });
    } else {
      logger.info('WhatsApp buttons sent', { to: normalizedTo });
    }
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error sending WhatsApp buttons', { error });
  }
}

export async function downloadWhatsAppMedia(mediaId) {
  if (!WP_ACCESS_TOKEN) {
    logger.warn('WhatsApp credentials not configured, cannot download media');
    return null;
  }

  try {
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      {
        headers: { 'Authorization': `Bearer ${WP_ACCESS_TOKEN}` }
      }
    );

    if (!mediaResponse.ok) {
      logger.error('Error getting media URL', { response: await mediaResponse.text() });
      return null;
    }

    const mediaInfo = await mediaResponse.json();
    const mediaUrl = mediaInfo.url;
    const mimeType = mediaInfo.mime_type || 'application/octet-stream';

    const downloadResponse = await fetch(mediaUrl, {
      headers: { 'Authorization': `Bearer ${WP_ACCESS_TOKEN}` }
    });

    if (!downloadResponse.ok) {
      logger.error('Error downloading media');
      return null;
    }

    const buffer = await downloadResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { base64, mimeType };
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error downloading WhatsApp media', { error });
    return null;
  }
}
