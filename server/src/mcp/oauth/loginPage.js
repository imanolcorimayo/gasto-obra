// The consent screen served at GET /oauth/authorize. The user signs in with Google
// (same Firebase project as the web app), the page gets a Firebase ID token and POSTs
// it to /oauth/authorize/approve, which verifies it server-side and mints an auth code.
// Self-contained HTML (Firebase Web SDK from gstatic) — no build step, no framework.

/** @param {{clientName?:string, firebaseApiKey:string, firebaseAuthDomain:string, firebaseProjectId:string, params:object}} opts */
export function renderLoginPage({ clientName, firebaseApiKey, firebaseAuthDomain, firebaseProjectId, params }) {
  // params (client_id, redirect_uri, state, code_challenge, ...) round-trip to /approve.
  const paramsJson = JSON.stringify(params);
  const app = clientName ? escapeHtml(clientName) : 'una aplicación';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Gasto Obra · Conectar</title>
<style>
  :root { --go-yellow:#FFC400; --go-ink:#1A1A1A; --go-muted:#6B6B6B; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: "Red Hat Display", system-ui, sans-serif; background:#FAFAFA; color:var(--go-ink);
         min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { background:#fff; border:1px solid #ECECEC; border-radius:16px; padding:32px; max-width:380px; width:100%;
          box-shadow:0 8px 28px rgba(0,0,0,.06); text-align:center; }
  h1 { font-size:20px; margin:8px 0 4px; }
  p { color:var(--go-muted); font-size:14px; line-height:1.5; margin:4px 0 24px; }
  .app { color:var(--go-ink); font-weight:600; }
  button { width:100%; border:0; border-radius:10px; padding:13px 16px; font-size:15px; font-weight:600;
           cursor:pointer; background:var(--go-yellow); color:var(--go-ink); }
  button:disabled { opacity:.6; cursor:default; }
  .err { color:#C0392B; font-size:13px; margin-top:14px; min-height:18px; }
  .hat { font-size:40px; }
</style>
</head>
<body>
  <div class="card">
    <div class="hat">👷</div>
    <h1>Conectar con Gasto Obra</h1>
    <p><span class="app">${app}</span> quiere acceder a tus obras y gastos en tu nombre. Iniciá sesión para autorizarlo.</p>
    <button id="login">Continuar con Google</button>
    <div class="err" id="err"></div>
  </div>

<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { getAuth, GoogleAuthProvider, signInWithPopup }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

  const OAUTH = ${paramsJson};
  const app = initializeApp({
    apiKey: ${JSON.stringify(firebaseApiKey)},
    authDomain: ${JSON.stringify(firebaseAuthDomain)},
    projectId: ${JSON.stringify(firebaseProjectId)},
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
