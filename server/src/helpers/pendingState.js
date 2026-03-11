import { sendWhatsAppMessage } from './whatsapp.js';
import logger from '../../lib/logger.js';

// ============================================
// Pending Confirmations (2 min auto-confirm)
// ============================================
export const CONFIRMATION_TTL = 2 * 60 * 1000;
const pendingExpenses = new Map();

export function getPendingExpense(phoneNumber) {
  const pending = pendingExpenses.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > CONFIRMATION_TTL) {
    pendingExpenses.delete(phoneNumber);
    return null;
  }
  return pending;
}

export function clearPendingExpense(phoneNumber) {
  pendingExpenses.delete(phoneNumber);
}

export function setRawPendingExpense(phoneNumber, entry) {
  pendingExpenses.set(phoneNumber, entry);
}

// ============================================
// Pending Project Selections (PROYECTO command)
// ============================================
const PROJECT_SELECTION_TTL = 2 * 60 * 1000;
const pendingProjectSelections = new Map();

export function setPendingProjectSelection(phoneNumber, userId, projects) {
  const timestamp = Date.now();
  pendingProjectSelections.set(phoneNumber, { userId, projects, timestamp });
  setTimeout(() => {
    const pending = pendingProjectSelections.get(phoneNumber);
    if (pending && pending.timestamp === timestamp) {
      pendingProjectSelections.delete(phoneNumber);
    }
  }, PROJECT_SELECTION_TTL);
}

export function getPendingProjectSelection(phoneNumber) {
  const pending = pendingProjectSelections.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > PROJECT_SELECTION_TTL) {
    pendingProjectSelections.delete(phoneNumber);
    return null;
  }
  return pending;
}

export function clearPendingProjectSelection(phoneNumber) {
  pendingProjectSelections.delete(phoneNumber);
}

// ============================================
// Pending Project Switch Expenses (2 min TTL)
// ============================================
const PROJECT_SWITCH_TTL = 2 * 60 * 1000;
const pendingProjectSwitchExpenses = new Map();

export function setPendingProjectSwitchExpense(phoneNumber, userId, expenseData, detectedProject) {
  const timestamp = Date.now();
  pendingProjectSwitchExpenses.set(phoneNumber, { userId, expenseData, detectedProject, timestamp });
  setTimeout(() => {
    const pending = pendingProjectSwitchExpenses.get(phoneNumber);
    if (pending && pending.timestamp === timestamp) {
      pendingProjectSwitchExpenses.delete(phoneNumber);
    }
  }, PROJECT_SWITCH_TTL);
}

export function getPendingProjectSwitchExpense(phoneNumber) {
  const pending = pendingProjectSwitchExpenses.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > PROJECT_SWITCH_TTL) {
    pendingProjectSwitchExpenses.delete(phoneNumber);
    return null;
  }
  return pending;
}

export function clearPendingProjectSwitchExpense(phoneNumber) {
  pendingProjectSwitchExpenses.delete(phoneNumber);
}

// ============================================
// Pending Resumen Selections (RESUMEN command)
// ============================================
const RESUMEN_SELECTION_TTL = 2 * 60 * 1000;
const pendingResumenSelections = new Map();

export function setPendingResumenSelection(phoneNumber, data) {
  const timestamp = Date.now();
  pendingResumenSelections.set(phoneNumber, { ...data, timestamp });
  setTimeout(() => {
    const pending = pendingResumenSelections.get(phoneNumber);
    if (pending && pending.timestamp === timestamp) {
      pendingResumenSelections.delete(phoneNumber);
    }
  }, RESUMEN_SELECTION_TTL);
}

export function getPendingResumenSelection(phoneNumber) {
  const pending = pendingResumenSelections.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > RESUMEN_SELECTION_TTL) {
    pendingResumenSelections.delete(phoneNumber);
    return null;
  }
  return pending;
}

export function clearPendingResumenSelection(phoneNumber) {
  pendingResumenSelections.delete(phoneNumber);
}

// ============================================
// Pending Support Detection
// ============================================
const SUPPORT_TTL = 2 * 60 * 1000;
const pendingSupportRequests = new Map();

export function setPendingSupportRequest(phoneNumber, originalText) {
  const timestamp = Date.now();
  pendingSupportRequests.set(phoneNumber, { originalText, timestamp });
  setTimeout(() => {
    const pending = pendingSupportRequests.get(phoneNumber);
    if (pending && pending.timestamp === timestamp) {
      pendingSupportRequests.delete(phoneNumber);
    }
  }, SUPPORT_TTL);
}

export function getPendingSupportRequest(phoneNumber) {
  const pending = pendingSupportRequests.get(phoneNumber);
  if (!pending) return null;
  if (Date.now() - pending.timestamp > SUPPORT_TTL) {
    pendingSupportRequests.delete(phoneNumber);
    return null;
  }
  return pending;
}

export function clearPendingSupportRequest(phoneNumber) {
  pendingSupportRequests.delete(phoneNumber);
}

// ============================================
// AI Support Sessions (persistent multi-turn)
// ============================================
const AI_SUPPORT_SESSION_TTL = 5 * 60 * 1000;
const AI_SUPPORT_WARNING_TTL = 2 * 60 * 1000;
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
        await sendWhatsAppMessage(phoneNumber, 'El soporte se cerrará en 3 minutos.');
      } catch (err) {
        logger.error('Error sending session warning', { error: err });
      }
    }
  }, AI_SUPPORT_WARNING_TTL);

  session.expiryTimerId = setTimeout(() => {
    const current = pendingAISupportSessions.get(phoneNumber);
    if (current === session) {
      pendingAISupportSessions.delete(phoneNumber);
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
