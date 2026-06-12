import { sendWhatsAppMessage } from './whatsapp.js';
import logger from '../../lib/logger.js';

// ============================================
// AI Support Sessions (persistent multi-turn)
// ============================================
const AI_SUPPORT_SESSION_TTL = 15 * 60 * 1000;
const AI_SUPPORT_WARNING_TTL = 12 * 60 * 1000;
const pendingAISupportSessions = new Map();

export function createAISupportSession(phoneNumber) {
  clearAISupportSession(phoneNumber);
  const session = {
    timestamp: Date.now(),
    previousQA: [],
    lastQueryId: null,
    warningTimerId: null,
    expiryTimerId: null
  };
  pendingAISupportSessions.set(phoneNumber, session);
  resetSessionTimers(phoneNumber);
  return session;
}

export function getAISupportSession(phoneNumber) {
  return pendingAISupportSessions.get(phoneNumber) || null;
}

export function clearAISupportSession(phoneNumber) {
  const session = pendingAISupportSessions.get(phoneNumber);
  if (session) {
    if (session.warningTimerId) clearTimeout(session.warningTimerId);
    if (session.expiryTimerId) clearTimeout(session.expiryTimerId);
    pendingAISupportSessions.delete(phoneNumber);
  }
}

export function resetSessionTimers(phoneNumber) {
  const session = pendingAISupportSessions.get(phoneNumber);
  if (!session) return;

  if (session.warningTimerId) clearTimeout(session.warningTimerId);
  if (session.expiryTimerId) clearTimeout(session.expiryTimerId);

  session.warningTimerId = setTimeout(async () => {
    const current = pendingAISupportSessions.get(phoneNumber);
    if (current === session) {
      try {
        await sendWhatsAppMessage(phoneNumber, 'El soporte se cierra en 2 minutos ⏳ Escribí tu consulta o *listo* para salir.');
      } catch (err) {
        logger.error('Error sending session warning', { error: err });
      }
    }
  }, AI_SUPPORT_WARNING_TTL);

  session.expiryTimerId = setTimeout(async () => {
    const current = pendingAISupportSessions.get(phoneNumber);
    if (current === session) {
      pendingAISupportSessions.delete(phoneNumber);
      try {
        await sendWhatsAppMessage(phoneNumber, 'Sesión de soporte finalizada ✅ Estás de vuelta en modo gastos. Escribí *AYUDA* para volver a consultar.');
      } catch (err) {
        logger.error('Error sending session expiry message', { error: err });
      }
    }
  }, AI_SUPPORT_SESSION_TTL);
}

// ============================================
// Support Rate Limiting
// ============================================
const supportRateLimits = new Map();
const SUPPORT_RATE_LIMIT = 10;
const SUPPORT_RATE_WINDOW = 60 * 60 * 1000;

export function checkSupportRateLimit(phoneNumber) {
  const now = Date.now();
  const entry = supportRateLimits.get(phoneNumber);

  if (!entry || now >= entry.resetAt) {
    supportRateLimits.set(phoneNumber, { count: 1, resetAt: now + SUPPORT_RATE_WINDOW });
    return true;
  }

  if (entry.count >= SUPPORT_RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// ============================================
// Message Rate Limiting (per phone number)
// ============================================
const messageRateLimits = new Map();
const MESSAGE_RATE_LIMIT = 20;
const MESSAGE_RATE_WINDOW = 60 * 1000;

export function checkMessageRateLimit(phoneNumber) {
  const now = Date.now();
  const entry = messageRateLimits.get(phoneNumber);

  if (!entry || now >= entry.resetAt) {
    messageRateLimits.set(phoneNumber, { count: 1, resetAt: now + MESSAGE_RATE_WINDOW });
    return true;
  }

  if (entry.count >= MESSAGE_RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// ============================================
// Onboarding State
// ============================================
const ONBOARDING_TTL = 10 * 60 * 1000;
const pendingOnboarding = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [phone, state] of pendingOnboarding.entries()) {
    if (now - state.startedAt > ONBOARDING_TTL) {
      pendingOnboarding.delete(phone);
    }
  }
}, 60 * 1000);

export function getOnboardingState(phoneNumber) {
  const state = pendingOnboarding.get(phoneNumber);
  if (!state) return null;
  if (Date.now() - state.startedAt > ONBOARDING_TTL) {
    pendingOnboarding.delete(phoneNumber);
    return null;
  }
  return state;
}

export function clearOnboarding(phoneNumber) {
  pendingOnboarding.delete(phoneNumber);
}

export function setOnboardingState(phoneNumber, state) {
  pendingOnboarding.set(phoneNumber, state);
}
