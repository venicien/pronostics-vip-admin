import { api } from '../api.js';
import { imageUploadFieldHtml, wireImageUploadField } from '../imageUpload.js';

export async function renderSettings(root) {
  root.innerHTML = `
    <h1>Réglages</h1>
    <div class="subtitle">Modifications à la volée de la Mini App (§5.3).</div>
    <div id="settings-form-container"><div class="empty-state">Chargement…</div></div>
  `;

  const container = root.querySelector('#settings-form-container');
  const MM_OPERATORS = ['Orange Money', 'MTN Mobile Money', 'Wave', 'Moov Money'];

  try {
    const { settings } = await api.getSettings();
    let mmAccounts = {};
    try {
      mmAccounts = JSON.parse(settings.mobile_money_accounts || '{}');
    } catch (e) {
      mmAccounts = {};
    }

    container.innerHTML = `
      <form id="settings-form" class="form-grid">
        ${imageUploadFieldHtml({ name: 'logo_url', label: 'Logo (affiché en haut de la Mini App)', currentUrl: settings.logo_url || '' })}
        <div class="field">
          <label>Mise recommandée (% du budget)</label>
          <input type="number" step="0.5" min="0.5" max="100" name="bankroll_percent" value="${settings.bankroll_percent ?? 3}" />
        </div>
        <div class="field">
          <label>Contact support (@username ou email)</label>
          <input type="text" name="support_contact" value="${settings.support_contact || ''}" />
        </div>

        <div class="full" style="margin-top:8px;">
          <strong>Numéros Mobile Money (affichés au client avant qu'il envoie le paiement)</strong>
        </div>
        ${MM_OPERATORS.map(
          (op) => `
          <div class="field">
            <label>${op} — numéro + nom du bénéficiaire</label>
            <input type="text" name="mm_${op}" placeholder="Ex : 07 00 00 00 00 (Nom Prénom)" value="${mmAccounts[op] || ''}" />
          </div>`
        ).join('')}

        <div class="full"><button type="submit" class="btn-primary">Enregistrer</button></div>
      </form>
    `;

    const form = container.querySelector('#settings-form');
    wireImageUploadField(form, 'logo_url');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const mobileMoneyAccounts = Object.fromEntries(
        MM_OPERATORS.map((op) => [op, data[`mm_${op}`] || '']).filter(([, v]) => v)
      );
      try {
        await Promise.all([
          api.updateSetting('logo_url', data.logo_url),
          api.updateSetting('bankroll_percent', Number(data.bankroll_percent)),
          api.updateSetting('support_contact', data.support_contact),
          api.updateSetting('mobile_money_accounts', JSON.stringify(mobileMoneyAccounts)),
        ]);
        showToast('✅ Réglages enregistrés.');
      } catch (err) {
        showToast(`Erreur : ${err.message}`);
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Impossible de charger les réglages.</div>`;
  }
}

function showToast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
