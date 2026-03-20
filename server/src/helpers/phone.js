export function normalizePhoneNumber(phone) {
  if (!phone) return phone;
  // Argentine number missing country code (10 digits, e.g. 3512136977 → 543512136977)
  if (phone.length === 10 && /^[1-9]/.test(phone)) {
    return '54' + phone;
  }
  // Strip mobile 9 prefix (549XXXXXXXXXX → 54XXXXXXXXXX)
  if (phone.startsWith('549') && phone.length === 13) {
    return '54' + phone.slice(3);
  }
  return phone;
}
