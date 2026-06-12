// Deterministic confirmation block for a registered / edited / moved movement.
// Code-owned (not model-owned) so every field is always present and amounts are
// formatted consistently. The agent shows the returned string verbatim. Labeled
// format (Option A). The richer "footer" details land here later.

const TYPE_LABELS = { expense: 'Gasto', payment: 'Cobro', provider_expense: 'Gasto propio' };

const fmtArs = (n) => Number(n || 0).toLocaleString('es-AR');

// 'YYYY-MM-DD' → 'DD/MM' (anything else passes through untouched).
function ddmm(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? `${m[3]}/${m[2]}` : s;
}

/**
 * @param {object} m
 * @param {'registrado'|'actualizado'} [m.action]
 * @param {'expense'|'payment'|'provider_expense'} m.type
 * @param {string|null} m.project   obra name
 * @param {string} m.title
 * @param {number} m.amount
 * @param {string|null} [m.category]
 * @param {string|null} [m.vendor]
 * @param {string|null} [m.recipient]
 * @param {string|null} [m.date]    'YYYY-MM-DD' — shown only when explicitly set (backdated)
 * @returns {string}
 */
export function formatMovementConfirmation({
  action = 'registrado', type, project, title, amount, category, vendor, recipient, date,
}) {
  const typeLabel = TYPE_LABELS[type] || 'Movimiento';
  const icon = action === 'actualizado' ? '✏️' : '✅';

  const lines = [`${icon} *${typeLabel} ${action}*`];
  if (project) lines.push(`*Obra:* ${project}`);
  lines.push(`*Monto:* $${fmtArs(amount)}${title ? ` — ${title}` : ''}`);

  // Cobros are always category "pago" — not worth a line.
  if (type !== 'payment' && category && category !== 'pago') {
    lines.push(`*Categoría:* ${category}`);
  }

  // Comercio for gastos; Destinatario for cobros (and as a fallback when present).
  if (type === 'payment') {
    if (recipient) lines.push(`*Destinatario:* ${recipient}`);
  } else if (vendor) {
    lines.push(`*Comercio:* ${vendor}`);
  } else if (recipient) {
    lines.push(`*Destinatario:* ${recipient}`);
  }

  // Fecha only when backdated (a date was explicitly provided for this movement).
  if (date) lines.push(`*Fecha:* ${ddmm(date)}`);

  return lines.join('\n');
}
