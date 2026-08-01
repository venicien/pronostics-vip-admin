import { getAdminKey, clearAdminKey } from './api.js';
import { renderLogin } from './views/login.js';
import { renderContent } from './views/content.js';
import { renderBanners } from './views/banners.js';
import { renderBookmakers } from './views/bookmakers.js';
import { renderWinback } from './views/winback.js';
import { renderSettings } from './views/settings.js';
import { renderFaq } from './views/faq.js';

const routes = {
  content: { label: '📋 Contenu', render: renderContent },
  banners: { label: '📢 Bannières', render: renderBanners },
  bookmakers: { label: '🤝 Bookmakers', render: renderBookmakers },
  faq: { label: '❓ FAQ', render: renderFaq },
  settings: { label: '⚙️ Réglages', render: renderSettings },
  winback: { label: '🔁 Relance VIP', render: renderWinback },
};

function renderShell(root, activeRoute) {
  root.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar__brand">⚙️ Admin Panel</div>
      ${Object.entries(routes)
        .map(([key, r]) => `<button data-route="${key}" class="${key === activeRoute ? 'active' : ''}">${r.label}</button>`)
        .join('')}
      <button id="logout-btn" style="margin-top:20px;color:var(--red);">↩ Déconnexion</button>
    </aside>
    <main class="main" id="main-view"></main>
  `;

  root.querySelectorAll('.sidebar button[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(root, btn.dataset.route));
  });
  root.querySelector('#logout-btn').addEventListener('click', () => {
    clearAdminKey();
    boot();
  });
}

function navigate(root, routeKey) {
  window.location.hash = routeKey;
  renderShell(root, routeKey);
  routes[routeKey].render(root.querySelector('#main-view'));
}

function boot() {
  const root = document.getElementById('app');

  if (!getAdminKey()) {
    renderLogin(root, () => boot());
    return;
  }

  const initialRoute = window.location.hash.replace('#', '');
  const routeKey = routes[initialRoute] ? initialRoute : 'content';
  navigate(root, routeKey);
}

document.addEventListener('DOMContentLoaded', boot);
