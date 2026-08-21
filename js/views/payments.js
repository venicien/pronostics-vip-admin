import { api } from '../api.js';

export async function renderPayments(container) {
  container.innerHTML = `
    <div class="header">
      <h1>💰 Validation des Paiements</h1>
    </div>
    <div class="content-list" id="payments-list">
      <div class="skeleton"></div>
    </div>
  `;

  const listDiv = container.querySelector('#payments-list');

  async function loadPayments() {
    try {
      const data = await api.request('/api/admin/payments/pending', { method: 'GET' });
      const payments = data.payments || [];
      
      if (!payments.length) {
        listDiv.innerHTML = `<div class="empty-state">Aucun paiement en attente de validation.</div>`;
        return;
      }
      
      listDiv.innerHTML = payments.map(p => {
        const date = new Date(p.created_at).toLocaleString('fr-FR');
        const amount = p.amount ? p.amount + ' ' + p.currency : 'Non spécifié';
        
        return `
          <div class="list-item" style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong>Client :</strong> ${p.actor_key} <br>
                <strong>Méthode :</strong> ${p.provider} <br>
                <strong>Montant :</strong> ${amount}
              </div>
              <div style="text-align:right;">
                <div style="color:var(--text-muted); font-size:12px;">${date}</div>
                <div style="color:var(--gold); font-weight:bold;">${p.status}</div>
              </div>
            </div>
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:4px; font-family:monospace; word-break:break-all;">
              <strong>Preuve / Hash :</strong> ${p.provider_tx_id || 'Non fourni'}
            </div>
            <div style="display:flex; gap:10px; margin-top:5px;">
              <button class="btn-primary btn-validate" data-id="${p.id}">✅ Valider et Activer VIP</button>
              <button class="btn-secondary btn-reject" data-id="${p.id}" style="color:var(--red); border-color:var(--red);">❌ Rejeter</button>
            </div>
          </div>
        `;
      }).join('');

      listDiv.querySelectorAll('.btn-validate').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          if (!confirm('Êtes-vous sûr de vouloir valider ce paiement et activer l\'accès VIP pour ce client ?')) return;
          const id = e.target.dataset.id;
          e.target.disabled = true;
          try {
            await api.request(`/api/admin/payments/${id}/validate`, { method: 'POST' });
            loadPayments();
          } catch (err) {
            alert('Erreur : ' + err.message);
            e.target.disabled = false;
          }
        });
      });

      listDiv.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          if (!confirm('Rejeter ce paiement ? (Le client devra recommencer)')) return;
          const id = e.target.dataset.id;
          e.target.disabled = true;
          try {
            await api.request(`/api/admin/payments/${id}/reject`, { method: 'POST' });
            loadPayments();
          } catch (err) {
            alert('Erreur : ' + err.message);
            e.target.disabled = false;
          }
        });
      });

    } catch (err) {
      listDiv.innerHTML = `<div class="empty-state">Erreur : ${err.message}</div>`;
    }
  }

  loadPayments();
}
