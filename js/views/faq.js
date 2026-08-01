import { api } from '../api.js';

export async function renderFaq(root) {
  root.innerHTML = `
    <h1>FAQ</h1>
    <div class="subtitle">Questions fréquentes affichées dans l'onglet Bonus de la Mini App.</div>

    <form id="faq-form" class="form-grid">
      <div class="field full"><label>Question</label><input type="text" name="question" required /></div>
      <div class="field full"><label>Réponse</label><textarea name="answer" required></textarea></div>
      <div class="field"><label>Ordre d'affichage</label><input type="number" name="display_order" value="0" /></div>
      <div class="full"><button type="submit" class="btn-primary">Ajouter</button></div>
    </form>

    <div id="faq-table"><div class="empty-state">Chargement…</div></div>
  `;

  const form = root.querySelector('#faq-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.display_order = Number(data.display_order || 0);
    await api.createFaq(data);
    form.reset();
    loadTable();
  });

  async function loadTable() {
    const tableEl = root.querySelector('#faq-table');
    try {
      const { faq } = await api.listFaq();
      if (!faq.length) {
        tableEl.innerHTML = `<div class="empty-state">Aucune question ajoutée.</div>`;
        return;
      }
      tableEl.innerHTML = `
        <table>
          <thead><tr><th>Question</th><th>Active</th><th></th></tr></thead>
          <tbody>
            ${faq
              .map(
                (f) => `
              <tr>
                <td>${f.question}</td>
                <td><div class="toggle ${f.is_active ? 'on' : ''}" data-id="${f.id}" data-active="${f.is_active}"></div></td>
                <td><button class="btn-danger delete-btn" data-id="${f.id}">Supprimer</button></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;

      tableEl.querySelectorAll('.toggle').forEach((el) => {
        el.addEventListener('click', async () => {
          await api.updateFaq(el.dataset.id, { is_active: el.dataset.active !== 'true' });
          loadTable();
        });
      });

      tableEl.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Supprimer cette question ?')) return;
          await api.deleteFaq(btn.dataset.id);
          loadTable();
        });
      });
    } catch (err) {
      tableEl.innerHTML = `<div class="empty-state">Impossible de charger la FAQ.</div>`;
    }
  }

  loadTable();
}
