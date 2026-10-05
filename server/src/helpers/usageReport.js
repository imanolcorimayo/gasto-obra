/**
 * Read-only usage data: who signed up and what they actually did.
 *
 * Shared by the CLI (scripts/usage-report.js) and the admin API
 * (GET /api/admin/usage). Returns plain JSON-safe objects; formatting is the
 * caller's job.
 */

import { admin, db, COLLECTIONS } from '../config/firebase.js';

// WhatsApp ids are E.164 without '+'. Argentina adds a '9' after 54 for mobiles,
// so 549 + area code. Only the codes we have actually seen are mapped; the rest
// print raw so you can look them up instead of trusting a wrong guess.
const COUNTRIES = { 54: 'Argentina', 52: 'México', 56: 'Chile', 57: 'Colombia', 51: 'Perú', 598: 'Uruguay', 595: 'Paraguay', 591: 'Bolivia', 55: 'Brasil', 34: 'España', 1: 'USA/Canadá' };
const AR_AREAS = { 11: 'Buenos Aires (AMBA)', 351: 'Córdoba', 341: 'Rosario', 261: 'Mendoza', 381: 'Tucumán', 387: 'Salta', 388: 'Jujuy', 299: 'Neuquén', 223: 'Mar del Plata', 342: 'Santa Fe', 221: 'La Plata', 264: 'San Juan', 370: 'Formosa', 376: 'Posadas', 380: 'La Rioja', 383: 'Catamarca', 385: 'Santiago del Estero', 379: 'Corrientes', 362: 'Resistencia', 343: 'Paraná', 345: 'Concordia', 353: 'Villa María', 358: 'Río Cuarto', 336: 'San Nicolás', 291: 'Bahía Blanca', 249: 'Tandil', 280: 'Trelew', 297: 'Comodoro Rivadavia', 2944: 'Bariloche', 2657: 'Merlo (SL)', 266: 'San Luis', 2966: 'Río Gallegos' };

export function phoneOrigin(raw) {
  const n = String(raw).replace(/\D/g, '');
  for (const cc of [598, 595, 591, 54, 52, 56, 57, 51, 55, 34, 1]) {
    if (!n.startsWith(String(cc))) continue;
    let rest = n.slice(String(cc).length);
    if (cc === 54) {
      if (rest.startsWith('9')) rest = rest.slice(1);
      for (const len of [4, 3, 2]) {
        const area = Number(rest.slice(0, len));
        if (AR_AREAS[area]) return `Argentina — ${AR_AREAS[area]} (${area})`;
      }
      return `Argentina — área ${rest.slice(0, 3)}?`;
    }
    return COUNTRIES[cc];
  }
  return 'desconocido';
}

const iso = ts => (ts?.toDate?.() ? ts.toDate().toISOString() : null);
const millis = ts => ts?.toMillis?.() || 0;
const sum = arr => arr.reduce((s, e) => s + (e.amount || 0), 0);

async function loadAll() {
  const users = [];
  let pageToken;
  do {
    const page = await admin.auth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  // One full scan each (dataset is tiny)
  const [projectsSnap, expensesSnap, linksSnap] = await Promise.all([
    db.collection(COLLECTIONS.PROJECTS).get(),
    db.collection(COLLECTIONS.EXPENSES).get(),
    db.collection(COLLECTIONS.WHATSAPP_LINKS).get(),
  ]);

  // whatsappLinks holds BOTH linked phones (doc id = phone) and pending
  // verification codes (doc id = code, status 'pending'). Keep them apart:
  // a pile of pendings means someone kept retrying and never connected.
  const phonesByUid = {};
  const pendingByUid = {};
  linksSnap.docs.forEach(d => {
    const data = d.data();
    if (!data.userId) return;
    const bucket = data.status === 'pending' ? pendingByUid : phonesByUid;
    (bucket[data.userId] ||= []).push({
      phone: data.phoneNumber || d.id,
      contactName: data.contactName || null,
      linkedAt: iso(data.linkedAt),
    });
  });

  return {
    users,
    projects: projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    expenses: expensesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    phonesByUid,
    pendingByUid,
  };
}

const byProvider = (arr, uid) => arr.filter(x => x.providerId === uid);

const DAY = 24 * 60 * 60 * 1000;
const isoMs = ms => (ms ? new Date(ms).toISOString() : null);

// Count for the last 30 days and the 30 before, so the dashboard shows trend.
function windowed(items, getMs, now) {
  let current = 0;
  let previous = 0;
  items.forEach(x => {
    const age = now - getMs(x);
    if (age < 30 * DAY) current++;
    else if (age < 60 * DAY) previous++;
  });
  return { current, previous };
}

// One row per auth user, most recently active first, plus 30-day trend metrics.
// "Active" = recorded at least one expense in the window (login time only
// exists as a last value, so it can't be compared across periods).
export async function getUsageSummary() {
  const { users, projects, expenses, phonesByUid, pendingByUid } = await loadAll();
  const now = Date.now();

  const rows = users.map(u => {
    const ue = byProvider(expenses, u.uid);
    const lastExpense = Math.max(0, ...ue.map(e => millis(e.createdAt)));
    const lastLogin = u.metadata.lastSignInTime ? Date.parse(u.metadata.lastSignInTime) : 0;
    const createdMs = u.metadata.creationTime ? Date.parse(u.metadata.creationTime) : 0;
    const phones = phonesByUid[u.uid] || [];
    return {
      uid: u.uid,
      name: u.displayName || null,
      email: u.email || null,
      createdAt: isoMs(createdMs),
      isNew: now - createdMs < 30 * DAY,
      lastActivityAt: isoMs(Math.max(lastExpense, lastLogin)),
      lastExpenseAt: isoMs(lastExpense),
      projects: byProvider(projects, u.uid).length,
      expenses: ue.length,
      expenses30d: ue.filter(e => now - millis(e.createdAt) < 30 * DAY).length,
      origins: [...new Set(phones.map(p => phoneOrigin(p.phone)))],
      pendingCodes: (pendingByUid[u.uid] || []).length,
    };
  });

  rows.sort((a, b) => (b.lastActivityAt || '').localeCompare(a.lastActivityAt || ''));

  const activeIn = (from, to) => new Set(
    expenses.filter(e => { const age = now - millis(e.createdAt); return age >= from && age < to; })
      .map(e => e.providerId)
  ).size;

  return {
    metrics: {
      activeUsers: { current: activeIn(0, 30 * DAY), previous: activeIn(30 * DAY, 60 * DAY) },
      newUsers: windowed(users, u => Date.parse(u.metadata.creationTime || 0), now),
      expenses: windowed(expenses, e => millis(e.createdAt), now),
      newProjects: windowed(projects, p => millis(p.createdAt), now),
    },
    users: rows,
  };
}

// Phones, projects and last 20 expenses for one user; null if unknown uid.
export async function getUserDetail(uid) {
  const { users, projects, expenses, phonesByUid, pendingByUid } = await loadAll();
  const u = users.find(x => x.uid === uid);
  if (!u) return null;

  const ue = byProvider(expenses, uid);
  return {
    uid,
    name: u.displayName || null,
    email: u.email || null,
    createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : null,
    lastLoginAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
    phones: (phonesByUid[uid] || []).map(p => ({ ...p, origin: phoneOrigin(p.phone) })),
    pendingCodes: (pendingByUid[uid] || []).length,
    projects: byProvider(projects, uid).map(p => {
      const pe = expenses.filter(e => e.projectId === p.id);
      return { id: p.id, name: p.name, status: p.status, createdAt: iso(p.createdAt), expenses: pe.length, total: sum(pe) };
    }),
    lastExpenses: ue
      .sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
      .slice(0, 20)
      .map(e => ({
        id: e.id,
        createdAt: iso(e.createdAt),
        type: e.type || null,
        amount: e.amount || 0,
        category: e.category || null,
        source: e.source || null,
        media: [e.imageUrl && 'img', e.audioUrl && 'audio', e.fileUrl && 'pdf'].filter(Boolean),
        title: e.title || null,
      })),
  };
}
