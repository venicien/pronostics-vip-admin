import { api } from '../api.js';
import { imageUploadFieldHtml, wireImageUploadField } from '../imageUpload.js';

const TEMPLATES = {
  pronostic_unique: 'Pronostic Unique',
  pronostic_combine: 'Pronostic Combiné',
  bilan: 'Bilan / Résultat',
  article: 'Article de fond / Guide',
  kit_reseaux: 'Kit Réseaux Sociaux (TikTok)',
};

function fieldsForTemplate(type) {
  const common = `
    <div class="field full">
      <label>Titre</label>
      <input type="text" name="title" required />
    </div>
  `;

  if (type === 'pronostic_unique' || type === 'pronostic_combine') {
    return (
      common +
      `
      <div class="field"><label>Match</label><input type="text" name="match_label" placeholder="PSG vs OM" /></div>
      <div class="field"><label>Cote</label><input type="number" step="0.01" name="cote" /></div>
      <div class="field"><label>Confiance (1-5)</label><input type="number" min="1" max="5" name="niveau_confiance" /></div>
      ${imageUploadFieldHtml({ name: 'image_url', label: 'Visuel' })}
      <div class="field full"><label>Analyse</label><textarea name="analyse"></textarea></div>
    `
    );
  }

  if (type === 'bilan') {
    return (
      common +
      `
      <div class="field"><label>Résultat</label>
        <select name="result_status">
          <option value="en_attente">En attente</option>
          <option value="valide">Validé ✅</option>
          <option value="perdu">Perdu ❌</option>
        </select>
      </div>
      <div class="field"><label>ROI (%)</label><input type="number" step="0.01" name="roi_percent" /></div>
      <div class="field full"><label>Commentaire</label><textarea name="body"></textarea></div>
      <div class="field full" style="color:var(--gold);font-size:12px;">
        ⚠️ Une fois enregistré en "Validé" ou "Perdu", ce bilan est scellé définitivement (garantie de transparence, §5.3) — plus aucune modification possible ensuite.
      </div>
    `
    );
  }

  if (type === 'article') {
    return common + `<div class="field full"><label>Contenu</label><textarea name="body" style="min-height:160px;"></textarea></div>`;
  }

  // kit_reseaux
  return (
    common +
    `
    ${imageUploadFieldHtml({ name: 'image_url', label: 'Visuel 9:16' })}
    <div class="field full"><label>Script texte prêt à poster</label><textarea name="body"></textarea></div>
  `
  );
}

function destinationCheckboxes() {
  return `
    <div class="checkbox-group">
      <label><input type="checkbox" name="publish_mini_app" /> Mini App / Site</label>
      <label><input type="checkbox" name="publish_public_channel" /> Telegram Public</label>
      <label><input type="checkbox" name="publish_vip_channel" /> Telegram VIP</label>
      <label><input type="checkbox" name="publish_social_kit" /> Kit Réseaux (TikTok)</label>
    </div>
  `;
}

function resultBadgeHtml(status) {
  const map = { valide: ['VALIDÉ', 'valide'], perdu: ['PERDU', 'perdu'], en_attente: ['—', 'attente'] };
  const [label, cls] = map[status] || map.en_attente;
  return `<span class="badge ${cls}">${label}</span>`;
}

export async function renderContent(root) {
  root.innerHTML = `
    <h1>Contenu</h1>
    <div class="subtitle">Créer un pronostic, un bilan, un article ou un kit réseaux, et choisir où le publier.</div>

    <div class="field" style="max-width:320px;margin-bottom:14px;">
      <label>Type de contenu</label>
      <select id="template-select">
        ${Object.entries(TEMPLATES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
    </div>

    <form id="content-form" class="form-grid">
      <div id="dynamic-fields" class="full" style="display:contents;"></div>
      <div class="field full">
        <label>Publier vers</label>
        ${destinationCheckboxes()}
      </div>
      <div class="full">
        <button type="submit" class="btn-primary">Créer le brouillon</button>
      </div>
    </form>

    <div class="subtitle" style="margin-top:8px;">Contenu existant</div>
    <div id="content-table"><div class="empty-state">Chargement…</div></div>
  `;

  const select = root.querySelector('#template-select');
  const dynamicFields = root.querySelector('#dynamic-fields');
  const form = root.querySelector('#content-form');

  function refreshFields() {
    dynamicFields.innerHTML = fieldsForTemplate(select.value);
    dynamicFields.style.display = 'contents';
    wireImageUploadField(dynamicFields, 'image_url');
  }
  refreshFields();
  select.addEventListener('change', refreshFields);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = { type: select.value };

    for (const [key, value] of formData.entries()) {
      if (['publish_mini_app', 'publish_public_channel', 'publish_vip_channel', 'publish_social_kit'].includes(key)) {
        payload[key] = true;
      } else if (['cote', 'roi_percent'].includes(key)) {
        payload[key] = value ? Number(value) : null;
      } else if (key === 'niveau_confiance') {
        payload[key] = value ? Number(value) : null;
      } else {
        payload[key] = value;
      }
    }
    // Les checkboxes non cochées n'apparaissent pas dans FormData : on les force à false.
    for (const key of ['publish_mini_app', 'publish_public_channel', 'publish_vip_channel', 'publish_social_kit']) {
      if (!(key in payload)) payload[key] = false;
    }

    try {
      await api.createContent(payload);
      form.reset();
      refreshFields();
      loadTable();
      showToast('✅ Contenu créé.');
    } catch (err) {
      showToast(`Erreur : ${err.message}`);
    }
  });

  async function loadTable() {
    const tableEl = root.querySelector('#content-table');
    try {
      const { content } = await api.listContent();
      if (!content.length) {
        tableEl.innerHTML = `<div class="empty-state">Aucun contenu créé pour le moment.</div>`;
        return;
      }
      tableEl.innerHTML = `
        <table>
          <thead><tr><th>Type</th><th>Titre</th><th>Résultat</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            ${content
              .map(
                (c) => `
              <tr data-id="${c.id}">
                <td>${TEMPLATES[c.type] || c.type}</td>
                <td>${c.title}</td>
                <td>${c.type === 'bilan' ? resultBadgeHtml(c.result_status) : '—'}</td>
                <td>
                  ${c.is_sealed ? '<span class="badge sealed">Scellé</span>' : ''}
                  ${c.published_at ? '<span class="badge valide">Publié</span>' : '<span class="badge attente">Brouillon</span>'}
                </td>
                <td><button class="btn-secondary publish-btn" data-id="${c.id}">Publier</button></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;

      tableEl.querySelectorAll('.publish-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            const { destinations } = await api.publishContent(btn.dataset.id);
            showToast(`✅ Publié sur : ${destinations.join(', ') || 'aucune destination'}`);
            loadTable();
          } catch (err) {
            showToast(`Erreur : ${err.message}`);
          }
        });
      });
    } catch (err) {
      tableEl.innerHTML = `<div class="empty-state">Impossible de charger le contenu.</div>`;
    }
  }

  loadTable();
}

function showToast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
