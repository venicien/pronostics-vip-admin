import { api, setAdminKey, clearAdminKey } from '../api.js';

export function renderLogin(root, onSuccess) {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-box">
        <h1>🔒 Dashboard Admin</h1>
        <p>Colle ta clé ADMIN_API_KEY (celle définie côté Render) pour accéder au panneau.</p>
        <input type="password" id="admin-key-input" placeholder="Clé API Admin" />
        <button class="btn-primary" id="login-btn" style="width:100%;">Accéder</button>
        <div id="login-error" style="color:var(--red);font-size:12px;margin-top:10px;"></div>
      </div>
    </div>
  `;

  const btn = root.querySelector('#login-btn');
  const input = root.querySelector('#admin-key-input');
  const errorEl = root.querySelector('#login-error');

  async function attemptLogin() {
    const key = input.value.trim();
    if (!key) return;

    btn.disabled = true;
    btn.textContent = 'Vérification…';
    errorEl.textContent = '';

    const isValid = await api.validateAdminKey(key);

    if (isValid) {
      setAdminKey(key);
      onSuccess();
    } else {
      clearAdminKey();
      btn.disabled = false;
      btn.textContent = 'Accéder';
      errorEl.textContent = '❌ Clé invalide, ou backend injoignable — vérifie la clé et ta connexion.';
    }
  }

  btn.addEventListener('click', attemptLogin);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });
}
