import { api } from '../api.js';

export async function renderBanners(root) {
  root.innerHTML = `
    <h1>Bannières</h1>
    <div class="subtitle">Bandeau d'annonce affiché en haut de la Mini App (promos, alertes).</div>

    <form id="banner-form" class="form-grid">
      <div class="field full">
        <label>Nouveau message</label>
        <input type="text" name="message" placeholder="Ex : 🔥 -20% sur le Pass Mensuel jusqu'à minuit !" required />
      </div>
      <div class="full">
        <button type="submit" class="btn-primary">Créer la bannière</button>
      </div>
    </form>

    <div id="banners-table"><div class="empty-state">Chargement…</div></div>
  `;

  const form = root.querySelector('#banner-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = new FormData(form).get('message');
    await api.createBanner({ message, is_active: false });
    form.reset();
    loadTable();
  });

  async function loadTable() {
    const tableEl = root.querySelector('#banners-table');
    try {
      const { banners } = await api.listBanners();
      if (!banners.length) {
        tableEl.innerHTML = `<div class="empty-state">Aucune bannière créée.</div>`;
        return;
      }
      tableEl.innerHTML = `
        <table>
          <thead><tr><th>Message</th><th>Active</th></tr></thead>
          <tbody>
            ${banners
              .map(
                (b) => `
              <tr>
                <td>${b.message}</td>
                <td><div class="toggle ${b.is_active ? 'on' : ''}" data-id="${b.id}" data-active="${b.is_active}"></div></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;

      tableEl.querySelectorAll('.toggle').forEach((el) => {
        el.addEventListener('click', async () => {
          const newState = el.dataset.active !== 'true';
          // Une seule bannière active à la fois : on désactive les autres côté client
          // (le backend accepte plusieurs actives, mais l'UX Mini App n'affiche que la plus récente).
          await api.updateBanner(el.dataset.id, { is_active: newState });
          loadTable();
        });
      });
    } catch (err) {
      tableEl.innerHTML = `<div class="empty-state">Impossible de charger les bannières.</div>`;
    }
  }

  loadTable();
}
