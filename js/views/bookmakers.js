import { api } from '../api.js';
import { imageUploadFieldHtml, wireImageUploadField } from '../imageUpload.js';

export async function renderBookmakers(root) {
  root.innerHTML = `
    <h1>Bookmakers</h1>
    <div class="subtitle">Partenaires d'affiliation affichés dans l'onglet "Bonus & Bookmakers" de la Mini App.</div>

    <form id="bm-form" class="form-grid">
      <div class="field"><label>Nom</label><input type="text" name="name" required /></div>
      <div class="field"><label>Ordre d'affichage</label><input type="number" name="display_order" value="0" /></div>
      <div class="field full"><label>Lien d'affiliation</label><input type="text" name="affiliate_link" required /></div>
      <div class="field"><label>Code promo</label><input type="text" name="promo_code" /></div>
      ${imageUploadFieldHtml({ name: 'logo_url', label: 'Logo' })}
      <div class="full"><button type="submit" class="btn-primary">Ajouter</button></div>
    </form>

    <div id="bm-table"><div class="empty-state">Chargement…</div></div>
  `;

  const form = root.querySelector('#bm-form');
  wireImageUploadField(form, 'logo_url');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.display_order = Number(data.display_order || 0);
    await api.createBookmaker(data);
    form.reset();
    loadTable();
  });

  async function loadTable() {
    const tableEl = root.querySelector('#bm-table');
    try {
      const { bookmakers } = await api.listBookmakers();
      if (!bookmakers.length) {
        tableEl.innerHTML = `<div class="empty-state">Aucun bookmaker enregistré.</div>`;
        return;
      }
      tableEl.innerHTML = `
        <table>
          <thead><tr><th>Nom</th><th>Code promo</th><th>Actif</th></tr></thead>
          <tbody>
            ${bookmakers
              .map(
                (b) => `
              <tr>
                <td>${b.name}</td>
                <td class="mono">${b.promo_code || '—'}</td>
                <td><div class="toggle ${b.is_active ? 'on' : ''}" data-id="${b.id}" data-active="${b.is_active}"></div></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;

      tableEl.querySelectorAll('.toggle').forEach((el) => {
        el.addEventListener('click', async () => {
          await api.updateBookmaker(el.dataset.id, { is_active: el.dataset.active !== 'true' });
          loadTable();
        });
      });
    } catch (err) {
      tableEl.innerHTML = `<div class="empty-state">Impossible de charger les bookmakers.</div>`;
    }
  }

  loadTable();
}
