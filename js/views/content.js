import { api } from '../api.js';
import { imageUploadFieldHtml, wireImageUploadField } from '../imageUpload.js';
import { generatePronosticImage, generateBilanImage, generateBulletinImage, generateVerticalKitImage, generateArticleHybridImage, generatePronoHybridImage } from '../generator.js';

const TEMPLATES = {
  pronostic_unique: 'Pronostic Unique',
  pronostic_combine: 'Pronostic Combiné',
  bilan: 'Bilan / Résultat',
  bulletin: 'Bulletin de résultats',
  article: 'Article de fond / Guide',
  kit_reseaux: 'Kit Réseaux Sociaux (TikTok)',
};

function esc(value) {
  return (value ?? '').toString().replace(/"/g, '&quot;');
}

function parseBulletinData(data = {}) {
  if (Array.isArray(data.bulletin_matches)) return data;
  try {
    const parsed = JSON.parse(data.body || '{}');
    if (parsed && Array.isArray(parsed.matches)) {
      return {
        ...data,
        bulletin_competition: parsed.competition || data.bulletin_competition || '',
        bulletin_brand_name: parsed.brand_name || data.bulletin_brand_name || 'PARADOX RATIO',
        bulletin_matches: parsed.matches,
        body: parsed.note || '',
      };
    }
  } catch (error) {
    // Ancien Bulletin éventuellement stocké comme texte simple.
  }
  return { ...data, bulletin_matches: [] };
}

function fieldsForTemplate(type, data = {}) {
  const common = `
    <div class="field full">
      <label>Titre</label>
      <input type="text" name="title" required value="${esc(data.title)}" />
    </div>
  `;

  if (type === 'pronostic_unique' || type === 'pronostic_combine') {
    const status = data.result_status || 'en_attente';
    const isCombine = type === 'pronostic_combine';
    
    // Format de la date pour le champ datetime-local
    let dateValue = '';
    if (data.event_date) {
      const d = new Date(data.event_date);
      dateValue = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    
    // Si c'est un combiné, on cache les champs "match_label" et "event_date" principaux 
    // car ils seront gérés par les sélections multiples.
    const hideSingleMatch = isCombine ? 'display: none;' : '';
    
    return (
      common +
      `
      <div class="field" style="${hideSingleMatch}"><label>Match</label><input type="text" name="match_label" placeholder="PSG vs OM" value="${esc(data.match_label)}" /></div>
      <div class="field" style="${hideSingleMatch}"><label>Date et heure du match</label><input type="datetime-local" name="event_date" value="${dateValue}" ${!isCombine ? 'required' : ''} /></div>
      <div class="field"><label>Cote Totale</label><input type="number" step="0.01" name="cote" value="${esc(data.cote)}" /></div>
      <div class="field"><label>Confiance (1-5)</label><input type="number" min="1" max="5" name="niveau_confiance" value="${esc(data.niveau_confiance)}" /></div>
      
      <div class="field full" id="selections-container">
        <label>Sélections (Matchs du pronostic)</label>
        <div id="selections-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
          <!-- Les sélections seront injectées ici par JS -->
        </div>
        <button type="button" class="btn-secondary" id="add-selection-btn" style="font-size: 12px; padding: 6px 12px;">+ Ajouter un match</button>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
          Les logos doivent être uploadés localement (via le bouton image).
        </div>
      </div>
      
      <div class="field"><label>Résultat du pronostic</label>
        <select name="result_status">
          <option value="en_attente" ${status === 'en_attente' ? 'selected' : ''}>En attente ⏳</option>
          <option value="gagne" ${status === 'gagne' ? 'selected' : ''}>Gagné ✅</option>
          <option value="perdu" ${status === 'perdu' ? 'selected' : ''}>Perdu ❌</option>
          <option value="rembourse" ${status === 'rembourse' ? 'selected' : ''}>Remboursé 🔄</option>
          <option value="annule" ${status === 'annule' ? 'selected' : ''}>Annulé 🚫</option>
        </select>
      </div>
      <div class="field"><label>Unités gagnées/perdues</label><input type="number" step="0.01" name="result_units" value="${esc(data.result_units)}" placeholder="ex: 1.5 ou -1" /></div>
      
      ${imageUploadFieldHtml({ name: 'image_url', label: 'Visuel', currentUrl: data.image_url || '' })}
      <div class="field">
        <label>Style Visuel</label>
        <select name="visual_style">
          <option value="classic">Classique (Standard)</option>
          <option value="hybrid">Premium (Hybride IA)</option>
        </select>
      </div>
      <div class="field full">
        <label style="display:flex;justify-content:space-between;align-items:center;">
          Analyse
          <button type="button" class="btn-secondary" id="btn-ai-analyse" style="font-size:12px;padding:4px 8px;">🤖 Générer l'analyse</button>
        </label>
        <textarea name="analyse">${esc(data.analyse)}</textarea>
      </div>
      
      <div class="field full" style="color:var(--gold);font-size:12px;">
        🔒 L'heure du match servira de verrou automatique. Une fois le match commencé, aucune modification ne sera possible pour garantir l'intégrité de l'historique.
      </div>
    `
    );
  }

  if (type === 'bulletin') {
    const bulletin = parseBulletinData(data);
    return (
      common +
      `
      <div class="field"><label>Compétition / journée</label><input type="text" name="bulletin_competition" value="${esc(bulletin.bulletin_competition)}" placeholder="Ex : Ligue des champions" /></div>
      <div class="field"><label>Nom de marque</label><input type="text" name="bulletin_brand_name" value="${esc(bulletin.bulletin_brand_name || 'PARADOX RATIO')}" placeholder="PARADOX RATIO" /></div>
      <div class="field full" id="bulletin-matches-container">
        <label>Matchs du Bulletin</label>
        <div id="bulletin-matches-list" style="display:flex;flex-direction:column;gap:10px;margin-bottom:10px;"></div>
        <button type="button" class="btn-secondary" id="add-bulletin-match-btn" style="font-size:12px;padding:6px 12px;">+ Ajouter un match</button>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Les logos locaux sont prioritaires. La date et l'heure sont obligatoires pour chaque match.</div>
      </div>
      <div class="field full">
        <label style="display:flex;justify-content:space-between;align-items:center;">
          Note / légende facultative
          <button type="button" class="btn-secondary" id="btn-ai-note" style="font-size:12px;padding:4px 8px;">🤖 Générer la note</button>
        </label>
        <textarea name="body" placeholder="Contexte ou commentaire du bulletin">${esc(bulletin.body)}</textarea>
      </div>
      ${imageUploadFieldHtml({ name: 'image_url', label: 'Visuel Bulletin', currentUrl: bulletin.image_url || '' })}
      <div class="field full" style="color:var(--gold);font-size:12px;">Le visuel reprend la composition du Bulletin de référence : score central, logos, résultat vert/rouge et date/heure de chaque match.</div>
    `
    );
  }

  if (type === 'bilan') {
    const sealed = !!data.is_sealed;
    const status = data.result_status || 'en_attente';
    return (
      common +
      `
      <div class="field full">
        <label>Pronostic lié (Optionnel)</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" name="linked_pronostic_id" placeholder="ID du pronostic (UUID)" value="${esc(data.linked_pronostic_id)}" style="flex: 1;" />
          <button type="button" class="btn-secondary" id="select-prono-btn" style="white-space: nowrap;">Sélectionner...</button>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          Si renseigné, ce bilan sera rattaché à ce pronostic. S'il est vide, c'est un bilan indépendant.
        </div>
      </div>
      <div class="field"><label>Résultat</label>
        <select name="result_status" ${sealed ? 'disabled' : ''}>
          <option value="en_attente" ${status === 'en_attente' ? 'selected' : ''}>En attente</option>
          <option value="valide" ${status === 'valide' ? 'selected' : ''}>Validé ✅</option>
          <option value="perdu" ${status === 'perdu' ? 'selected' : ''}>Perdu ❌</option>
        </select>
      </div>
      <div class="field"><label>ROI (%)</label><input type="number" step="0.01" name="roi_percent" value="${esc(data.roi_percent)}" ${sealed ? 'disabled' : ''} /></div>
      <div class="field full">
        <label style="display:flex;justify-content:space-between;align-items:center;">
          Commentaire
          <button type="button" class="btn-secondary" id="btn-ai-commentaire" style="font-size:12px;padding:4px 8px;">🤖 Générer le commentaire</button>
        </label>
        <textarea name="body">${esc(data.body)}</textarea>
      </div>
      ${imageUploadFieldHtml({ name: 'image_url', label: 'Visuel (capture du bilan, preuve, etc.)', currentUrl: data.image_url || '' })}
      <div class="field full" style="color:var(--gold);font-size:12px;">
        ${sealed
          ? '🔒 Ce bilan est scellé (résultat déjà validé/perdu) : le résultat et le ROI ne sont plus modifiables, mais le commentaire reste éditable.'
          : '⚠️ Une fois enregistré en "Validé" ou "Perdu", ce bilan est scellé définitivement (garantie de transparence, §5.3) — plus aucune modification du résultat possible ensuite.'}
      </div>
    `
    );
  }

  if (type === 'article') {
    return common + `
      <div class="field full">
        <label style="display:flex;justify-content:space-between;align-items:center;">
          Contenu (Markdown supporté)
          <button type="button" class="btn-secondary" id="btn-ai-article" style="font-size:12px;padding:4px 8px;">🤖 Générer avec l'IA</button>
        </label>
        <textarea name="body" style="min-height:200px;" placeholder="Écrivez votre article ici...">${esc(data.body)}</textarea>
      </div>
    `;
  }

  // kit_reseaux
  return (
    common +
    `
    ${imageUploadFieldHtml({ name: 'image_url', label: 'Visuel 9:16', currentUrl: data.image_url || '' })}
    <div class="field full">
      <label style="display:flex;justify-content:space-between;align-items:center;">
        Script texte prêt à poster
        <button type="button" class="btn-secondary" id="btn-ai-legende" style="font-size:12px;padding:4px 8px;">🤖 Générer la légende</button>
      </label>
      <textarea name="body">${esc(data.body)}</textarea>
    </div>
  `
  );
}

function destinationCheckboxes(data = {}) {
  const c = (key) => (data[key] ? 'checked' : '');
  return `
    <div class="checkbox-group">
      <label><input type="checkbox" name="publish_mini_app" ${c('publish_mini_app')} /> Mini App / Site</label>
      <label><input type="checkbox" name="publish_public_channel" ${c('publish_public_channel')} /> Telegram Public</label>
      <label><input type="checkbox" name="publish_vip_channel" ${c('publish_vip_channel')} /> Telegram VIP</label>
      <label><input type="checkbox" name="publish_social_kit" ${c('publish_social_kit')} /> Kit Réseaux (TikTok)</label>
      <label><input type="checkbox" name="publish_facebook" ${c('publish_facebook')} /> 🤖 Facebook (légende + visuel générés par IA)</label>
    </div>
  `;
}

function resultBadgeHtml(status) {
  const map = { 
    valide: ['VALIDÉ', 'valide'], 
    gagne: ['GAGNÉ', 'valide'], 
    perdu: ['PERDU', 'perdu'], 
    rembourse: ['REMBOURSÉ', 'attente'],
    annule: ['ANNULÉ', 'attente'],
    en_attente: ['—', 'attente'] 
  };
  const [label, cls] = map[status] || map.en_attente;
  return `<span class="badge ${cls}">${label}</span>`;
}

export async function renderContent(root) {
  root.innerHTML = `
    <h1>Contenu</h1>
    <div class="subtitle">Créer un pronostic, un bilan, un article ou un kit réseaux, et choisir où le publier.</div>
    <div class="compliance-callout">
      <strong>Checklist avant publication</strong>
      <span>✓ Ne jamais promettre un gain garanti</span>
      <span>✓ Vérifier compétition, date/heure et statut de chaque sélection</span>
      <span>✓ Publier les résultats réels en vert/rouge dès qu'ils sont connus</span>
      <span>✓ Ne publier que des visuels dont tu as les droits</span>
    </div>

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
        <div id="destinations-container">${destinationCheckboxes()}</div>
      </div>
      <div class="full" style="display:flex;gap:10px;">
        <button type="submit" class="btn-primary" id="submit-btn">Créer le brouillon</button>
        <button type="button" class="btn-secondary" id="cancel-edit-btn" style="display:none;">Annuler la modification</button>
      </div>
    </form>

    <div class="subtitle" style="margin-top:8px;">Contenu existant</div>
    <div id="content-table"><div class="empty-state">Chargement…</div></div>
  `;

  const select = root.querySelector('#template-select');
  const dynamicFields = root.querySelector('#dynamic-fields');
  const destinationsContainer = root.querySelector('#destinations-container');
  const form = root.querySelector('#content-form');
  const submitBtn = root.querySelector('#submit-btn');
  const cancelBtn = root.querySelector('#cancel-edit-btn');

  let editingId = null; // null = mode création, sinon id du contenu en cours d'édition

  let currentSelections = [];
  let currentBulletinMatches = [];

  function renderSelections() {
    const list = document.getElementById('selections-list');
    if (!list) return;
    
    list.innerHTML = currentSelections.map((sel, i) => {
      // Format date
      let dateVal = '';
      if (sel.event_date) {
        const d = new Date(sel.event_date);
        dateVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
      
      return `
        <div class="selection-item" data-index="${i}" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); padding: 10px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <strong style="font-size: 12px; color: var(--gold);">Match ${i + 1}</strong>
            <button type="button" class="remove-selection-btn" data-index="${i}" style="background: none; color: var(--red); font-size: 12px;">✖ Retirer</button>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div><label style="font-size: 11px;">Compétition</label><input type="text" class="sel-comp" value="${esc(sel.competition)}" style="padding: 6px; font-size: 12px;" /></div>
            <div><label style="font-size: 11px;">Date/Heure</label><input type="datetime-local" class="sel-date" value="${dateVal}" style="padding: 6px; font-size: 12px;" /></div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
              <label style="font-size: 11px;">Équipe 1</label>
              <input type="text" class="sel-t1" value="${esc(sel.team1_name)}" placeholder="Nom" style="padding: 6px; font-size: 12px; margin-bottom: 4px;" />
              ${imageUploadFieldHtml({ name: 'sel_t1_logo_' + i, label: 'Logo', currentUrl: sel.team1_logo_url || '' })}
            </div>
            <div>
              <label style="font-size: 11px;">Équipe 2</label>
              <input type="text" class="sel-t2" value="${esc(sel.team2_name)}" placeholder="Nom" style="padding: 6px; font-size: 12px; margin-bottom: 4px;" />
              ${imageUploadFieldHtml({ name: 'sel_t2_logo_' + i, label: 'Logo', currentUrl: sel.team2_logo_url || '' })}
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div><label style="font-size: 11px;">Intitulé du pronostic</label><input type="text" class="sel-label" value="${esc(sel.selection_label)}" style="padding: 6px; font-size: 12px;" /></div>
            <div><label style="font-size: 11px;">Cote</label><input type="number" step="0.01" class="sel-cote" value="${sel.cote || ''}" style="padding: 6px; font-size: 12px;" /></div>
          </div>
          
          <div>
            <label style="font-size: 11px;">Résultat</label>
            <select class="sel-status" style="padding: 6px; font-size: 12px; width: 100%;">
              <option value="en_attente" ${sel.result_status === 'en_attente' ? 'selected' : ''}>En attente</option>
              <option value="gagne" ${sel.result_status === 'gagne' ? 'selected' : ''}>Gagné</option>
              <option value="perdu" ${sel.result_status === 'perdu' ? 'selected' : ''}>Perdu</option>
              <option value="rembourse" ${sel.result_status === 'rembourse' ? 'selected' : ''}>Remboursé</option>
              <option value="annule" ${sel.result_status === 'annule' ? 'selected' : ''}>Annulé</option>
            </select>
          </div>
        </div>
      `;
    }).join('');
    
    // Ré-attacher les uploaders d'images
    currentSelections.forEach((_, i) => {
      wireImageUploadField(list, 'sel_t1_logo_' + i);
      wireImageUploadField(list, 'sel_t2_logo_' + i);
    });
    
    // Attacher les events de suppression
    list.querySelectorAll('.remove-selection-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        saveSelectionsState();
        currentSelections.splice(idx, 1);
        renderSelections();
      });
    });
  }

  function saveSelectionsState() {
    const list = document.getElementById('selections-list');
    if (!list) return;
    
    const items = list.querySelectorAll('.selection-item');
    currentSelections = Array.from(items).map(item => {
      const i = item.dataset.index;
      const t1LogoInput = item.querySelector(`input[name="sel_t1_logo_${i}"]`);
      const t2LogoInput = item.querySelector(`input[name="sel_t2_logo_${i}"]`);
      
      let eventDate = item.querySelector('.sel-date').value;
      if (eventDate) {
        eventDate = new Date(eventDate).toISOString();
      }
      
      return {
        competition: item.querySelector('.sel-comp').value,
        event_date: eventDate,
        team1_name: item.querySelector('.sel-t1').value,
        team1_logo_url: t1LogoInput ? t1LogoInput.value : '',
        team2_name: item.querySelector('.sel-t2').value,
        team2_logo_url: t2LogoInput ? t2LogoInput.value : '',
        selection_label: item.querySelector('.sel-label').value,
        cote: item.querySelector('.sel-cote').value ? Number(item.querySelector('.sel-cote').value) : null,
        result_status: item.querySelector('.sel-status').value
      };
    });
  }

  function renderBulletinMatches() {
    const list = document.getElementById('bulletin-matches-list');
    if (!list) return;

    list.innerHTML = currentBulletinMatches.map((match, i) => {
      let dateVal = '';
      if (match.event_date) {
        const d = new Date(match.event_date);
        dateVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
      return `
        <div class="bulletin-match-item" data-index="${i}" style="background:rgba(0,0,0,0.2);border:1px solid var(--border);padding:10px;border-radius:8px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <strong style="font-size:12px;color:var(--gold);">Match ${i + 1}</strong>
            <button type="button" class="remove-bulletin-match-btn" data-index="${i}" style="background:none;color:var(--red);font-size:12px;">✖ Retirer</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div><label style="font-size:11px;">Compétition</label><input type="text" class="bulletin-comp" value="${esc(match.competition)}" placeholder="Compétition" style="padding:6px;font-size:12px;" /></div>
            <div><label style="font-size:11px;">Date et heure *</label><input type="datetime-local" class="bulletin-date" value="${dateVal}" required style="padding:6px;font-size:12px;" /></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
            <div>
              <label style="font-size:11px;">Équipe domicile</label>
              <input type="text" class="bulletin-home" value="${esc(match.home || match.team1_name)}" placeholder="Équipe A" required style="padding:6px;font-size:12px;margin-bottom:4px;" />
              ${imageUploadFieldHtml({ name: 'bulletin_home_logo_' + i, label: 'Logo domicile', currentUrl: match.home_logo_url || match.team1_logo_url || '' })}
            </div>
            <div>
              <label style="font-size:11px;">Équipe extérieure</label>
              <input type="text" class="bulletin-away" value="${esc(match.away || match.team2_name)}" placeholder="Équipe B" required style="padding:6px;font-size:12px;margin-bottom:4px;" />
              ${imageUploadFieldHtml({ name: 'bulletin_away_logo_' + i, label: 'Logo extérieur', currentUrl: match.away_logo_url || match.team2_logo_url || '' })}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;">
            <div><label style="font-size:11px;">Score dom.</label><input type="number" min="0" class="bulletin-score-home" value="${esc(match.score_home ?? match.hs)}" placeholder="-" style="padding:6px;font-size:12px;" /></div>
            <div><label style="font-size:11px;">Score ext.</label><input type="number" min="0" class="bulletin-score-away" value="${esc(match.score_away ?? match.as)}" placeholder="-" style="padding:6px;font-size:12px;" /></div>
            <div><label style="font-size:11px;">Pronostic</label><input type="text" class="bulletin-label" value="${esc(match.selection_label)}" placeholder="1N2, Over 2.5…" style="padding:6px;font-size:12px;" /></div>
            <div><label style="font-size:11px;">Issue</label><select class="bulletin-status" style="padding:6px;font-size:12px;width:100%;"><option value="gagne" ${match.result_status === 'gagne' ? 'selected' : ''}>Gagné</option><option value="perdu" ${match.result_status === 'perdu' ? 'selected' : ''}>Perdu</option><option value="en_attente" ${match.result_status === 'en_attente' ? 'selected' : ''}>En attente</option></select></div>
          </div>
        </div>
      `;
    }).join('');

    currentBulletinMatches.forEach((_, i) => {
      wireImageUploadField(list, `bulletin_home_logo_${i}`);
      wireImageUploadField(list, `bulletin_away_logo_${i}`);
    });

    list.querySelectorAll('.remove-bulletin-match-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        saveBulletinState();
        currentBulletinMatches.splice(Number(e.currentTarget.dataset.index), 1);
        renderBulletinMatches();
      });
    });
  }

  function saveBulletinState() {
    const list = document.getElementById('bulletin-matches-list');
    if (!list) return;
    currentBulletinMatches = Array.from(list.querySelectorAll('.bulletin-match-item')).map((item) => {
      const i = item.dataset.index;
      const date = item.querySelector('.bulletin-date').value;
      const homeLogo = item.querySelector(`input[name="bulletin_home_logo_${i}"]`);
      const awayLogo = item.querySelector(`input[name="bulletin_away_logo_${i}"]`);
      return {
        competition: item.querySelector('.bulletin-comp').value.trim(),
        event_date: date ? new Date(date).toISOString() : null,
        home: item.querySelector('.bulletin-home').value.trim(),
        away: item.querySelector('.bulletin-away').value.trim(),
        home_logo_url: homeLogo?.value || null,
        away_logo_url: awayLogo?.value || null,
        score_home: item.querySelector('.bulletin-score-home').value === '' ? null : Number(item.querySelector('.bulletin-score-home').value),
        score_away: item.querySelector('.bulletin-score-away').value === '' ? null : Number(item.querySelector('.bulletin-score-away').value),
        selection_label: item.querySelector('.bulletin-label').value.trim(),
        result_status: item.querySelector('.bulletin-status').value,
      };
    });
  }

  let allPronostics = [];

  async function loadPronosticsForSelection() {
    try {
      const data = await api.listContent();
      // On ne garde que les pronostics en attente pour éviter de lier un bilan à un pronostic déjà validé
      allPronostics = data.content.filter(c => 
        (c.type === 'pronostic_unique' || c.type === 'pronostic_combine') && 
        c.result_status === 'en_attente'
      );
    } catch (e) {
      console.error('Erreur chargement pronostics', e);
      showToast('Erreur lors du chargement des pronostics.');
    }
  }

  function showPronosticSelector() {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox open';
    overlay.style.alignItems = 'center';
    
    const content = `
      <div style="background: var(--surface); padding: 20px; border-radius: 12px; width: 90%; max-width: 500px; max-height: 80vh; display: flex; flex-direction: column;">
        <h3 style="margin-bottom: 15px;">Sélectionner un pronostic</h3>
        <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px;">
          ${allPronostics.map(p => {
            const isBilante = p.result_status && p.result_status !== 'en_attente';
            const badge = isBilante ? '<span style="font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; margin-left: 8px; vertical-align: middle;">Déjà bilanté</span>' : '';
            const opacity = isBilante ? '0.6' : '1';
            return `
            <div class="prono-select-item" data-id="${p.id}" style="padding: 10px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; opacity: ${opacity};">
              <div style="font-size: 12px; color: var(--gold); margin-bottom: 4px;">${new Date(p.created_at).toLocaleDateString()} - ${p.type === 'pronostic_combine' ? 'Combiné' : 'Simple'}</div>
              <div style="font-weight: bold;">${p.title} ${badge}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${p.match_label || ''}</div>
            </div>
            `;
          }).join('')}
        </div>
        <button class="btn-secondary" style="margin-top: 15px;" id="close-prono-selector">Annuler</button>
      </div>
    `;
    
    overlay.innerHTML = content;
    document.body.appendChild(overlay);
    
    overlay.querySelectorAll('.prono-select-item').forEach(item => {
      item.addEventListener('click', () => {
        const input = document.querySelector('input[name="linked_pronostic_id"]');
        if (input) input.value = item.dataset.id;
        overlay.remove();
      });
    });
    
    overlay.querySelector('#close-prono-selector').addEventListener('click', () => {
      overlay.remove();
    });
  }

  function refreshFields(data = {}) {
    dynamicFields.innerHTML = fieldsForTemplate(select.value, data);
    
    // Restaurer la valeur du select visual_style si existante
    if ((select.value === 'pronostic_unique' || select.value === 'pronostic_combine') && data.visual_style) {
      const styleSelect = dynamicFields.querySelector('select[name="visual_style"]');
      if (styleSelect) styleSelect.value = data.visual_style;
    }
    dynamicFields.style.display = 'contents';
    wireImageUploadField(dynamicFields, 'image_url');
    
    if (select.value === 'bilan') {
      const btn = document.getElementById('select-prono-btn');
      if (btn) {
        btn.addEventListener('click', async () => {
          if (allPronostics.length === 0) await loadPronosticsForSelection();
          showPronosticSelector();
        });
      }
    }

    // Helper pour attacher l'IA
    function attachAiButton(btnId, targetSelector, contextType) {
      const btnAi = document.getElementById(btnId);
      if (btnAi) {
        btnAi.addEventListener('click', async () => {
          const title = document.querySelector('input[name="title"]').value.trim();
          if (!title) return alert("Veuillez d'abord renseigner le titre/sujet.");
          
          const originalText = btnAi.textContent;
          btnAi.disabled = true;
          btnAi.textContent = '⏳ Génération en cours...';
          try {
            const { draft } = await api.request('/api/admin/ai/generate', { 
              method: 'POST', 
              body: { topic: title, contextType } 
            });
            document.querySelector(targetSelector).value = draft;
          } catch (e) {
            alert('Erreur IA : ' + e.message);
          } finally {
            btnAi.disabled = false;
            btnAi.textContent = originalText;
          }
        });
      }
    }

    if (select.value === 'article') {
      attachAiButton('btn-ai-article', 'textarea[name="body"]', 'article');
    }
    if (select.value === 'pronostic_unique' || select.value === 'pronostic_combine') {
      attachAiButton('btn-ai-analyse', 'textarea[name="analyse"]', 'analyse');
    }
    if (select.value === 'bilan') {
      attachAiButton('btn-ai-commentaire', 'textarea[name="body"]', 'commentaire');
    }
    if (select.value === 'bulletin') {
      attachAiButton('btn-ai-note', 'textarea[name="body"]', 'note');
    }
    if (select.value === 'kit_reseaux') {
      attachAiButton('btn-ai-legende', 'textarea[name="body"]', 'legende');
    }
    
    if (select.value === 'pronostic_unique' || select.value === 'pronostic_combine') {
      currentSelections = data.selections || [];
      // Si c'est un prono unique sans sélections mais avec match_label, on pré-remplit
      if (currentSelections.length === 0 && data.match_label) {
        currentSelections.push({
          match_label: data.match_label,
          event_date: data.event_date,
          selection_label: data.title || '',
          cote: data.cote,
          result_status: data.result_status || 'en_attente'
        });
      }
      
      renderSelections();
      
      const addBtn = document.getElementById('add-selection-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          saveSelectionsState();
          currentSelections.push({ result_status: 'en_attente' });
          renderSelections();
        });
      }
    }

    if (select.value === 'bulletin') {
      const bulletin = parseBulletinData(data);
      currentBulletinMatches = bulletin.bulletin_matches || [];
      renderBulletinMatches();
      const addBtn = document.getElementById('add-bulletin-match-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          saveBulletinState();
          currentBulletinMatches.push({ result_status: 'gagne' });
          renderBulletinMatches();
        });
      }
    } else {
      currentBulletinMatches = [];
    }
  }

  function enterEditMode(item) {
    editingId = item.id;
    select.value = item.type;
    select.disabled = true; // on ne change pas le type d'un contenu existant
    refreshFields(item);
    destinationsContainer.innerHTML = destinationCheckboxes(item);
    submitBtn.textContent = 'Enregistrer les modifications';
    cancelBtn.style.display = 'inline-block';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  function exitEditMode() {
    editingId = null;
    select.disabled = false;
    form.reset();
    refreshFields();
    destinationsContainer.innerHTML = destinationCheckboxes();
    submitBtn.textContent = 'Créer le brouillon';
    cancelBtn.style.display = 'none';
  }

  refreshFields();
  select.addEventListener('change', () => refreshFields());
  cancelBtn.addEventListener('click', exitEditMode);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = { type: select.value };

    for (const [key, value] of formData.entries()) {
      if (['publish_mini_app', 'publish_public_channel', 'publish_vip_channel', 'publish_social_kit', 'publish_facebook'].includes(key)) {
        payload[key] = true;
      } else if (['cote', 'roi_percent', 'niveau_confiance', 'result_units'].includes(key)) {
        payload[key] = value ? Number(value) : null;
      } else if (key === 'event_date' && value) {
        // Convertir la date locale en UTC pour Supabase
        payload[key] = new Date(value).toISOString();
      } else {
        payload[key] = value;
      }
    }
    for (const key of ['publish_mini_app', 'publish_public_channel', 'publish_vip_channel', 'publish_social_kit', 'publish_facebook']) {
      if (!(key in payload)) payload[key] = false;
    }
    
    if (select.value === 'pronostic_unique' || select.value === 'pronostic_combine') {
      saveSelectionsState();
      payload.selections = currentSelections;
      
      // Transférer les URLs des logos locaux vers les sélections
      payload.selections.forEach((sel, i) => {
        sel.team1_logo_url = payload[`sel_t1_logo_${i}`] || sel.team1_logo_url || null;
        sel.team2_logo_url = payload[`sel_t2_logo_${i}`] || sel.team2_logo_url || null;
      });

      // Nettoyer le payload des champs de sélection injectés par formData
      Object.keys(payload).forEach(key => {
        if (key.startsWith('sel_t1_logo_') || key.startsWith('sel_t2_logo_')) {
          delete payload[key];
        }
      });
    }

    if (select.value === 'bulletin') {
      saveBulletinState();
      if (!currentBulletinMatches.length) throw new Error('Ajoutez au moins un match au Bulletin.');
      const missingDate = currentBulletinMatches.find((match) => !match.event_date);
      if (missingDate) throw new Error('La date et l’heure sont obligatoires pour chaque match du Bulletin.');

      const bulletinMatches = currentBulletinMatches.map((match, i) => ({
        ...match,
        home_logo_url: payload[`bulletin_home_logo_${i}`] || match.home_logo_url || null,
        away_logo_url: payload[`bulletin_away_logo_${i}`] || match.away_logo_url || null,
      }));
      payload.bulletin_matches = bulletinMatches;
      payload.body = JSON.stringify({
        version: 1,
        competition: payload.bulletin_competition || '',
        brand_name: payload.bulletin_brand_name || 'PARADOX RATIO',
        note: payload.body || '',
        matches: bulletinMatches,
      });
      payload.event_date = bulletinMatches.map((match) => match.event_date).sort()[0] || null;
      delete payload.bulletin_competition;
      delete payload.bulletin_brand_name;
      // Ne pas supprimer payload.bulletin_matches ici car le générateur d'image en a besoin
      Object.keys(payload).forEach((key) => {
        if (key.startsWith('bulletin_home_logo_') || key.startsWith('bulletin_away_logo_')) delete payload[key];
      });
    }

        try {
      // Génération automatique d'image si le champ image_url est vide.
      // Cette étape ne doit jamais empêcher la sauvegarde d'un brouillon.
      if (!payload.image_url) {
        showToast('⏳ Génération du visuel en cours...');
        try {
          if (payload.type === 'pronostic_unique' || payload.type === 'pronostic_combine') {
            if (payload.visual_style === 'hybrid') {
              const bgPrompt = `stade de football illuminé la nuit, ambiance électrique, haute qualité, sans texte`;
              const bgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(bgPrompt)}?model=flux&width=1080&height=1350&nologo=true`;
              payload.image_url = await generatePronoHybridImage(payload, api.uploadImage, bgUrl);
            } else {
              payload.image_url = await generatePronosticImage(payload, api.uploadImage);
            }
          } else if (payload.type === 'bilan') {
            let linkedProno = null;
            if (payload.linked_pronostic_id) {
              try {
                const res = await api.listContent();
                linkedProno = res.content?.find(c => c.id === payload.linked_pronostic_id) || null;
              } catch (e) {}
            }
            payload.image_url = await generateBilanImage(payload, api.uploadImage, linkedProno);
          } else if (payload.type === 'bulletin') {
            payload.image_url = await generateBulletinImage(payload, api.uploadImage);
          } else if (payload.type === 'kit_reseaux') {
            payload.image_url = await generateVerticalKitImage(payload, api.uploadImage);
          } else if (payload.type === 'article') {
            // L'article n'a pas d'image locale : fond Pollinations + Canvas,
            // puis fallback Canvas local si le service externe échoue.
            try {
              const res = await api.request('/api/admin/ai/generate', { method: 'POST', body: { topic: payload.title, contextType: 'image_prompt' } });
              const prompt = res.draft || `illustration sportive professionnelle, thème : ${payload.title}, haute qualité`;
              const bgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&nologo=true`;
              payload.image_url = await generateArticleHybridImage(payload, api.uploadImage, bgUrl);
            } catch (e) {
              payload.image_url = await generateArticleHybridImage(payload, api.uploadImage, null);
            }
          }
        } catch (imageError) {
          console.warn('[content] Visuel indisponible, brouillon sauvegardé sans image:', imageError);
          payload.image_url = null;
          showToast('⚠️ Visuel indisponible : brouillon sauvegardé sans image.');
        }
      }
      
      if (payload.type === 'bulletin') {
        delete payload.bulletin_matches; // Empêcher l'erreur Supabase "Could not find column"
      }
      
      if (editingId) {
        await api.updateContent(editingId, payload);
        showToast('✅ Contenu modifié.');
        exitEditMode();
      } else {
        await api.createContent(payload);
        form.reset();
        refreshFields();
        showToast('✅ Contenu créé.');
      }
      loadTable();
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
          <thead><tr><th>Type</th><th>Titre</th><th>Résultat</th><th>Engagement</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            ${content
              .map(
                (c) => `
              <tr data-id="${c.id}">
                <td>
                  ${TEMPLATES[c.type] || c.type}
                  ${(c.type === 'pronostic_unique' || c.type === 'pronostic_combine') && c.result_status !== 'en_attente' ? '<span class="badge" style="background: var(--surface-light); color: var(--text-muted); font-size: 10px; margin-left: 6px;">Bilanté</span>' : ''}
                </td>
                <td>${c.title}</td>
                <td>${(c.type === 'bilan' || c.type === 'pronostic_unique' || c.type === 'pronostic_combine') ? resultBadgeHtml(c.result_status) : '—'}</td>
                <td style="font-size: 12px; color: var(--text-muted); white-space: nowrap;">
                  ${c.engagement ? `👍 ${c.engagement.likes_count || 0} &nbsp; 👎 ${c.engagement.dislikes_count || 0} &nbsp; ★ ${c.engagement.favorites_count || 0}` : '—'}
                </td>
                <td>
                  ${c.is_sealed ? '<span class="badge sealed">Scellé</span>' : ''}
                  ${c.published_at ? '<span class="badge valide">Publié</span>' : '<span class="badge attente">Brouillon</span>'}
                </td>
                <td style="white-space:nowrap;">
                  <button class="btn-secondary comments-btn" data-id="${c.id}" title="Gérer les commentaires">💬</button>
                  <button class="btn-secondary edit-btn" data-id="${c.id}">Modifier</button>
                  <button class="btn-secondary publish-btn" data-id="${c.id}">Publier</button>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;

      tableEl.querySelectorAll('.publish-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            const { destinations, failures } = await api.publishContent(btn.dataset.id);
            const ok = destinations.length ? `✅ Publié sur : ${destinations.join(', ')}` : '';
            const ko = failures?.length ? `⚠️ Échec : ${failures.join(', ')}` : '';
            showToast([ok, ko].filter(Boolean).join(' — ') || 'Aucune destination cochée');
            loadTable();
          } catch (err) {
            showToast(`Erreur : ${err.message}`);
          }
        });
      });

      tableEl.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const item = content.find((c) => c.id === btn.dataset.id);
          if (item) enterEditMode(item);
        });
      });

      tableEl.querySelectorAll('.comments-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          showCommentsManager(btn.dataset.id);
        });
      });
    } catch (err) {
      tableEl.innerHTML = `<div class="empty-state">Impossible de charger le contenu.</div>`;
    }
  }

  async function showCommentsManager(contentId) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox open';
    overlay.style.alignItems = 'center';
    
    overlay.innerHTML = `
      <div style="background: var(--surface); padding: 20px; border-radius: 12px; width: 90%; max-width: 600px; max-height: 80vh; display: flex; flex-direction: column;">
        <h3 style="margin-bottom: 15px;">Modération des commentaires</h3>
        <div id="comments-list-admin" style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px;">
          <div class="empty-state">Chargement...</div>
        </div>
        <button class="btn-secondary" style="margin-top: 15px;" id="close-comments-selector">Fermer</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.querySelector('#close-comments-selector').addEventListener('click', () => {
      overlay.remove();
    });
    
    try {
      const { comments } = await api.getComments(contentId);
      const listDiv = overlay.querySelector('#comments-list-admin');
      
      if (!comments || comments.length === 0) {
        listDiv.innerHTML = '<div class="empty-state">Aucun commentaire pour ce contenu.</div>';
        return;
      }
      
      listDiv.innerHTML = comments.map(c => `
        <div class="comment-item-admin" style="padding: 10px; border: 1px solid var(--border); border-radius: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 12px; color: var(--gold); margin-bottom: 4px;">
              ${c.author_name} - ${new Date(c.created_at).toLocaleString()}
            </div>
            <div style="font-size: 14px;">${c.body.replace(/</g, '&lt;')}</div>
          </div>
          <button class="btn-secondary delete-comment-btn" data-id="${c.id}" style="color: var(--red); padding: 4px 8px; font-size: 12px;">Supprimer</button>
        </div>
      `).join('');
      
      listDiv.querySelectorAll('.delete-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Voulez-vous vraiment supprimer ce commentaire ?')) {
            try {
              await api.deleteComment(btn.dataset.id);
              btn.closest('.comment-item-admin').remove();
              showToast('Commentaire supprimé');
            } catch (err) {
              showToast('Erreur : ' + err.message);
            }
          }
        });
      });
      
    } catch (err) {
      overlay.querySelector('#comments-list-admin').innerHTML = '<div class="empty-state" style="color: var(--red);">Erreur de chargement</div>';
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
