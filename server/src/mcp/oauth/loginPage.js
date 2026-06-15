// The consent screen served at GET /oauth/authorize. The user signs in with Google
// (same Firebase project as the web app), the page gets a Firebase ID token and POSTs
// it to /oauth/authorize/approve, which verifies it server-side and mints an auth code.
// Self-contained HTML (Firebase Web SDK from gstatic) — no build step, no framework.

/** @param {{clientName?:string, firebaseApiKey:string, firebaseAuthDomain:string, firebaseProjectId:string, params:object}} opts */
export function renderLoginPage({ clientName, firebaseApiKey, firebaseAuthDomain, firebaseProjectId, params }) {
  // params (client_id, redirect_uri, state, code_challenge, ...) are attacker-influenced
  // query values that round-trip to /approve. They're embedded inside an inline <script>,
  // so JSON.stringify alone is NOT safe — a value like `</script>...` would break out.
  // safeJson() neutralizes script-terminating and line-separator sequences.
  const paramsJson = safeJson(params);
  const app = clientName ? escapeHtml(clientName) : 'una aplicación';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Gasto Obra · Conectar</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
  /* Brand tokens (web/assets/css/main.css). This page is served standalone by the
     server, outside the Nuxt/Tailwind build, so the palette is mirrored here by hand. */
  :root {
    --go-bg:#F5F0E8; --go-surface:#FFFFFF; --go-border:#B8AFA2; --go-border-subtle:#CFC7BA;
    --go-primary:#92520B; --go-primary-hover:#7F4709;
    --go-text:#1C1915; --go-text-muted:#635B54; --go-danger:#B53E36;
    --go-radius:18px; --go-shadow:0 8px 28px rgba(0,0,0,.12);
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         padding:24px; background:var(--go-bg); color:var(--go-text);
         font-family:'Red Hat Display', system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
  .card { background:var(--go-surface); border:1px solid var(--go-border-subtle); border-radius:var(--go-radius);
          padding:36px 32px; max-width:384px; width:100%; box-shadow:var(--go-shadow); text-align:center; }
  .mark { width:78px; height:auto; margin:0 auto 14px; display:block; }
  h1 { font-family:'Space Grotesk', system-ui, sans-serif; font-size:21px; font-weight:600;
       letter-spacing:-.01em; margin:0 0 8px; }
  p { color:var(--go-text-muted); font-size:14px; line-height:1.55; margin:0 0 26px; }
  .app { color:var(--go-text); font-weight:600; }
  button { width:100%; display:flex; align-items:center; justify-content:center; gap:10px;
           border:1px solid var(--go-border); border-radius:10px; padding:12px 16px;
           font-family:inherit; font-size:15px; font-weight:600; color:var(--go-text);
           background:var(--go-surface); cursor:pointer; transition:background .15s, border-color .15s; }
  button:hover:not(:disabled) { background:#FBF7F0; }
  button:disabled { opacity:.55; cursor:default; }
  button svg { width:18px; height:18px; flex:0 0 auto; }
  .err { color:var(--go-danger); font-size:13px; margin-top:16px; min-height:18px; }
  .note { margin-top:22px; font-size:12px; color:var(--go-text-muted); }
</style>
</head>
<body>
  <div class="card">
    <!-- Casquito (neutral) — ported verbatim from web/components/CasquitoNeutral.vue -->
    <svg class="mark" viewBox="0 0 200 230" fill="none" role="img" aria-label="Gasto Obra">
      <path d="M 52,118 L 50,205 Q 100,220 148,205 L 148,118 Z" stroke="#FFAB40" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="#FFAB40" fill-opacity="0.06"/>
      <line x1="56" y1="140" x2="144" y2="140" stroke="#FFAB40" stroke-width="5.5" stroke-dasharray="10 14" stroke-linecap="round" opacity="0.5"/>
      <path d="M 35,112 C 35,38 165,38 165,112 Z" fill="#FFAB40"/>
      <path d="M 14,110 Q 14,100 38,106 L 162,106 Q 186,100 186,110 L 186,120 Q 186,128 162,122 L 38,122 Q 14,128 14,120 Z" fill="#E99A35"/>
      <path d="M 38,108 Q 100,102 162,108" stroke="rgba(255,255,255,0.15)" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 62,56 Q 78,40 108,48" stroke="rgba(255,255,255,0.35)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M 68,68 Q 78,58 96,63" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="76" cy="86" r="5" fill="#2C261E"/>
      <circle cx="124" cy="86" r="5" fill="#2C261E"/>
    </svg>
    <h1>Conectar con Gasto Obra</h1>
    <p><span class="app">${app}</span> quiere acceder a tus obras y gastos en tu nombre. Iniciá sesión para autorizarlo.</p>
    <button id="login">
      <svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
      Continuar con Google
    </button>
    <div class="err" id="err"></div>
    <div class="note">Iniciás sesión con tu cuenta de Gasto Obra.</div>
  </div>

<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { getAuth, GoogleAuthProvider, signInWithPopup }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

  const OAUTH = ${paramsJson};
  const app = initializeApp({
    apiKey: ${safeJson(firebaseApiKey)},
    authDomain: ${safeJson(firebaseAuthDomain)},
    projectId: ${safeJson(firebaseProjectId)},
  });
  const auth = getAuth(app);
  const btn = document.getElementById("login");
  const err = document.getElementById("err");

  btn.addEventListener("click", async () => {
    err.textContent = "";
    btn.disabled = true;
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/oauth/authorize/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, ...OAUTH }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirect) throw new Error(data.error_description || data.error || "No se pudo autorizar.");
      window.location.href = data.redirect;
    } catch (e) {
      err.textContent = e.message || "Error al iniciar sesión.";
      btn.disabled = false;
    }
  });
</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// JSON safe to embed in an inline <script>: escape the sequences that could close the
// script element or break the script context (and U+2028/U+2029, invalid in JS strings).
function safeJson(value) {
  // Escape the sequences that could terminate the inline <script> (and U+2028/U+2029,
  // invalid in JS string literals). Built from char codes so the source carries no
  // literal backslash or separator char — nothing for an editor/tool to mangle.
  const BS = String.fromCharCode(92);
  const esc = (c) => BS + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0');
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .split('<').join(esc('<'))
    .split('>').join(esc('>'))
    .split('&').join(esc('&'))
    .split(LS).join(esc(LS))
    .split(PS).join(esc(PS));
}
