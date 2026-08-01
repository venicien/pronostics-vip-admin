import { setAdminKey } from '../api.js';

export function renderLogin(root, onSuccess) {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-box">
        <h1>🔒 Dashboard Admin</h1>
        <p>Colle ta clé ADMIN_API_KEY (celle définie côté Render) pour accéder au panneau.</p>
        <input type="password" id="admin-key-input" placeholder="Clé API Admin" />
        <button class="btn-primary" id="login-btn" style="width:100%;">Accéder</button>
      </div>
    </div>
  `;

  root.querySelector('#login-btn').addEventListener('click', () => {
    const key = root.querySelector('#admin-key-input').value.trim();
    if (!key) return;
    setAdminKey(key);
    onSuccess();
  });
}
