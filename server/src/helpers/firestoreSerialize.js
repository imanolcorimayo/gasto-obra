// Serialize a Firestore DocumentSnapshot to a plain JSON-friendly object.
// Converts Firestore Timestamps to ISO strings so the client can parse them
// with new Date(value) consistently.
export function serializeDoc(doc) {
  const data = doc.data() || {};
  const out = { id: doc.id };
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v.toDate === 'function') {
      out[k] = v.toDate().toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}
