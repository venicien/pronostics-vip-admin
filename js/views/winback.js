import { api } from '../api.js';

export function renderWinback(root) {
  root.innerHTML = `
    <h1>Relance VIP</h1>
    <div class="subtitle">
      Envoie un message ciblé à tous les anciens membres VIP expirés (ex : avant un grand match, §3.3).
      Le timing est laissé à ton jugement, contrairement à la relance panier abandonné qui est automatique.
    </div>

    <form id="winback-form" class="form-grid">
      <div class="field full">
        <label>Message</label>
        <textarea name="message" placeholder="Ex : 🔥 Clasico ce soir ! Reviens VIP pour ne rater aucun pronostic." required></textarea>
      </div>
      <div class="full">
        <button type="submit" class="btn-primary">Envoyer la relance</button>
      </div>
    </form>

    <div id="winback-result"></div>
  `;

  const form = root.querySelector('#winback-form');
  const result = root.querySelector('#winback-result');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = new FormData(form).get('message');
    result.innerHTML = `<div class="empty-state">Envoi en cours…</div>`;
    try {
      const { targeted, sent } = await api.broadcastWinBack(message);
      result.innerHTML = `<div class="empty-state">✅ Envoyé à ${sent}/${targeted} anciens VIP.</div>`;
      form.reset();
    } catch (err) {
      result.innerHTML = `<div class="empty-state">Erreur : ${err.message}</div>`;
    }
  });
}
