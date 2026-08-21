/**
 * Moteur de rendu des visuels (Pronostics & Bilans) extrait de Créateur Pro.
 * Intégré au CMS Admin de Pronostics VIP.
 */

const CP_LOGO_CACHE = {};

export function cpLoadImageSafe(src){
  return new Promise(resolve=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=> resolve(img);
    img.onerror = ()=> resolve(null);
    img.src = src;
  });
}

export function cpLoadImageFromDataUrl(dataUrl){
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=> resolve(img);
    img.onerror = ()=> resolve(null);
    img.src = dataUrl;
  });
}

export async function cpWikipediaTeamLogo(name){
  const key = name.trim().toLowerCase();
  if(key in CP_LOGO_CACHE) return CP_LOGO_CACHE[key];
  try{
    const params = new URLSearchParams({
      action: 'query', generator: 'search', gsrsearch: `${name} football club`,
      gsrlimit: '1', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '400',
      format: 'json', origin: '*',
    });
    const r = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`);
    if(!r.ok){ CP_LOGO_CACHE[key] = null; return null; }
    const data = await r.json();
    const pages = data?.query?.pages || {};
    for(const p of Object.values(pages)){
      const src = p?.thumbnail?.source;
      if(src){ const img = await cpLoadImageSafe(src); CP_LOGO_CACHE[key] = img; return img; }
    }
    CP_LOGO_CACHE[key] = null;
    return null;
  }catch(e){ CP_LOGO_CACHE[key] = null; return null; }
}

export function hexToRgb(hex){
  const h = hex.replace('#','');
  return { r: parseInt(h.substring(0,2),16), g: parseInt(h.substring(2,4),16), b: parseInt(h.substring(4,6),16) };
}

export function roundedRect(ctx, x, y, w, h, r, fill, stroke, strokeWidth){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if(fill){ ctx.fillStyle = fill; ctx.fill(); }
  if(stroke && strokeWidth){ ctx.strokeStyle = stroke; ctx.lineWidth = strokeWidth; ctx.stroke(); }
}

export function drawInitials(ctx, cx, cy, box, name){
  ctx.save();
  ctx.fillStyle = '#171a2c';
  ctx.beginPath(); ctx.arc(cx, cy, box/2, 0, Math.PI*2); ctx.fill();
  const initials = name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';
  ctx.fillStyle = '#e6e6e6';
  ctx.font = `700 ${Math.round(box*0.36)}px 'Inter', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(initials, cx, cy+2);
  ctx.restore();
}

export function drawFitImage(ctx, img, cx, cy, box){
  if(!img) return false;
  const ratio = Math.min(box/img.width, box/img.height);
  const dw = img.width*ratio, dh = img.height*ratio;
  ctx.drawImage(img, cx-dw/2, cy-dh/2, dw, dh);
  return true;
}

export function drawNeonGrid(ctx, W, H, color){
  ctx.save();
  ctx.strokeStyle = color; ctx.globalAlpha = .10; ctx.lineWidth = 1;
  const step = 44;
  for(let x=0; x<=W; x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0; y<=H; y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();
}

export function wrapTeamName(ctx, text, font, maxWidth){
  ctx.font = font;
  const words = text.split(' ');
  const lines = []; let cur = '';
  for(const w of words){
    const test = cur ? cur + ' ' + w : w;
    if(ctx.measureText(test).width > maxWidth && cur){ lines.push(cur); cur = w; }
    else cur = test;
    if(lines.length >= 2) break;
  }
  if(cur && lines.length < 2) lines.push(cur);
  return lines.slice(0,2).length ? lines.slice(0,2) : [text];
}

export function cpDrawBackgroundLogo(ctx, canvas, img, opts){
  opts = opts || {};
  const blur = opts.blur || 0, opacityPct = opts.opacityPct==null?15:opts.opacityPct, scalePct = opts.scalePct||100;
  if(!img) return;
  ctx.save();
  const targetW = canvas.width * (scalePct/100);
  const ratio = targetW / img.width;
  const dw = img.width*ratio, dh = img.height*ratio;
  const cx = canvas.width/2, cy = canvas.height/2;
  ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
  ctx.globalAlpha = Math.max(0, Math.min(1, opacityPct/100));
  ctx.drawImage(img, cx-dw/2, cy-dh/2, dw, dh);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Génère un visuel pour un pronostic (simple ou combiné)
 */
export async function generatePronosticImage(payload, apiUploadImage) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Paramètres visuels (identiques à Créateur Pro)
  const W = 1080, headerH = 260, rowH = 210, footerH = 100;
  const selections = payload.selections || [];
  const isCombine = payload.type === 'pronostic_combine';
  
  // S'il n'y a pas de sélections (pronostic simple sans sélection détaillée), on crée une sélection factice
  const displaySelections = selections.length > 0 ? selections : [{
    team1_name: payload.match_label ? payload.match_label.split(' vs ')[0] : 'Équipe A',
    team2_name: payload.match_label && payload.match_label.includes(' vs ') ? payload.match_label.split(' vs ')[1] : 'Équipe B',
    selection_label: payload.title || 'Victoire',
    cote: payload.cote,
    competition: '',
    event_date: payload.event_date
  }];
  
  const H = headerH + displaySelections.length * rowH + footerH;
  canvas.width = W; canvas.height = H;
  
  const bgColor = '#0f111a';
  const accent = '#e2b34a'; // gold
  
  // Fond
  ctx.fillStyle = bgColor;
  ctx.fillRect(0,0,W,H);
  
  // Grille néon
  drawNeonGrid(ctx, W, H, accent);
  
  // En-tête
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = accent;
  ctx.font = `700 38px 'Space Grotesk', sans-serif`;
  ctx.fillText('PRONOSTICS VIP', W/2, 80);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 68px 'Space Grotesk', sans-serif`;
  ctx.fillText(payload.title.toUpperCase(), W/2, 160);
  
  if (isCombine && payload.cote) {
    ctx.fillStyle = accent;
    ctx.font = `700 34px 'Inter', sans-serif`;
    ctx.fillText(`COTE TOTALE : ${payload.cote}`, W/2, 220);
  } else if (!isCombine && payload.niveau_confiance) {
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `500 24px 'Inter', sans-serif`;
    ctx.fillText(`CONFIANCE : ${payload.niveau_confiance}/5`, W/2, 220);
  }
  
  // Dessiner chaque sélection
  let y = headerH;
  for (let i = 0; i < displaySelections.length; i++) {
    const sel = displaySelections[i];
    const team1 = sel.team1_name || 'Équipe A';
    const team2 = sel.team2_name || 'Équipe B';
    
    // Résolution des logos (Upload local > Wikipedia > Initiales)
    let img1 = null, img2 = null;
    if (sel.team1_logo_url) img1 = await cpLoadImageSafe(sel.team1_logo_url);
    else img1 = await cpWikipediaTeamLogo(team1);
    
    if (sel.team2_logo_url) img2 = await cpLoadImageSafe(sel.team2_logo_url);
    else img2 = await cpWikipediaTeamLogo(team2);
    
    // Carte du match
    const cardY = y + 20, cardH = rowH - 40;
    roundedRect(ctx, 40, cardY, W-80, cardH, 16, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)', 1);
    
    // Date & Compétition
    let meta = '';
    if (sel.competition) meta += sel.competition.toUpperCase();
    if (sel.event_date) {
      const d = new Date(sel.event_date);
      if (meta) meta += ' • ';
      meta += `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    if (meta) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#888888';
      ctx.font = `600 18px 'Inter', sans-serif`;
      ctx.fillText(meta, W/2, cardY + 35);
    }
    
    // Logos et Noms
    const logoBox = 80;
    const lcx = 180, rcx = W - 180;
    const cy = cardY + cardH/2 + 10;
    
    if (!drawFitImage(ctx, img1, lcx, cy, logoBox)) drawInitials(ctx, lcx, cy, logoBox, team1);
    if (!drawFitImage(ctx, img2, rcx, cy, logoBox)) drawInitials(ctx, rcx, cy, logoBox, team2);
    
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
    ctx.font = `700 28px 'Inter', sans-serif`;
    ctx.fillText(team1.toUpperCase(), lcx + 60, cy + 10);
    
    ctx.textAlign = 'right';
    ctx.fillText(team2.toUpperCase(), rcx - 60, cy + 10);
    
    ctx.textAlign = 'center'; ctx.fillStyle = '#666666';
    ctx.font = `900 36px 'Inter', sans-serif`;
    ctx.fillText('VS', W/2, cy + 10);
    
    // Pronostic et Cote
    if (sel.selection_label) {
      const pillW = 400, pillH = 46;
      roundedRect(ctx, W/2 - pillW/2, cardY + cardH - pillH/2, pillW, pillH, pillH/2, accent, null, null);
      ctx.fillStyle = '#000000';
      ctx.font = `800 20px 'Inter', sans-serif`;
      let text = sel.selection_label.toUpperCase();
      if (sel.cote) text += ` @ ${sel.cote}`;
      ctx.fillText(text, W/2, cardY + cardH - pillH/2 + 32);
    }
    
    y += rowH;
  }
  
  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, H - footerH, W, footerH);
  ctx.fillStyle = '#666666'; ctx.textAlign = 'center';
  ctx.font = `500 20px 'Inter', sans-serif`;
  ctx.fillText('JOUEZ RESPONSABLE • LES JEUX D\'ARGENT COMPORTENT DES RISQUES', W/2, H - footerH/2 + 8);
  
  // Upload
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('Erreur création image'));
      const file = new File([blob], `prono_${Date.now()}.jpg`, { type: 'image/jpeg' });
      try {
        const data = await apiUploadImage(file);
        resolve(data.url);
      } catch (err) {
        reject(err);
      }
    }, 'image/jpeg', 0.9);
  });
}

/**
 * Génère un visuel pour un bilan (avec ou sans pronostic lié)
 */
export async function generateBilanImage(payload, apiUploadImage, linkedPronoData = null) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const W = 1080, H = 1080;
  canvas.width = W; canvas.height = H;
  
  const bgColor = '#0f111a';
  const isWin = payload.result_status === 'valide';
  const accent = isWin ? '#22c55e' : (payload.result_status === 'perdu' ? '#ef4444' : '#e2b34a');
  
  // Si le bilan est lié à un pronostic qui a déjà une image, on l'utilise en fond
  if (linkedPronoData && linkedPronoData.image_url) {
    const bgImg = await cpLoadImageSafe(linkedPronoData.image_url);
    if (bgImg) {
      // Dessiner l'image du prono d'origine
      const ratio = Math.max(W/bgImg.width, H/bgImg.height);
      const dw = bgImg.width*ratio, dh = bgImg.height*ratio;
      ctx.drawImage(bgImg, W/2-dw/2, H/2-dh/2, dw, dh);
      
      // Assombrir
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0,0,W,H);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0,0,W,H);
      drawNeonGrid(ctx, W, H, accent);
    }
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,W,H);
    drawNeonGrid(ctx, W, H, accent);
  }
  
  // Tampon central
  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.rotate(-15 * Math.PI / 180);
  
  const text = isWin ? 'GAGNÉ' : (payload.result_status === 'perdu' ? 'PERDU' : 'BILAN');
  ctx.font = `900 160px 'Space Grotesk', sans-serif`;
  const tw = ctx.measureText(text).width;
  
  roundedRect(ctx, -tw/2 - 60, -100, tw + 120, 200, 20, null, accent, 12);
  ctx.fillStyle = accent;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 10);
  
  ctx.restore();
  
  // ROI ou Infos
  if (payload.roi_percent) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 60px 'Space Grotesk', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`ROI : ${payload.roi_percent > 0 ? '+' : ''}${payload.roi_percent}%`, W/2, H - 150);
  }
  
  // Upload
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('Erreur création image bilan'));
      const file = new File([blob], `bilan_${Date.now()}.jpg`, { type: 'image/jpeg' });
      try {
        const data = await apiUploadImage(file);
        resolve(data.url);
      } catch (err) {
        reject(err);
      }
    }, 'image/jpeg', 0.9);
  });
}


/**
 * Génère le visuel Bulletin en reprenant la composition du fichier de référence.
 * Les logos locaux déjà téléversés sont prioritaires, puis Wikipédia, puis initiales.
 * Chaque ligne affiche obligatoirement sa date et son heure lorsqu'elles sont fournies.
 */
export async function generateBulletinImage(payload, apiUploadImage) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const W = 1080;
  const rows = Array.isArray(payload.bulletin_matches) ? payload.bulletin_matches : [];
  if (!rows.length) throw new Error('Ajoutez au moins un match au Bulletin.');

  const rowH = 190;
  const headerH = 300;
  const footerH = 130;
  const H = headerH + rows.length * rowH + footerH;
  canvas.width = W;
  canvas.height = H;

  const accent = '#e2b34a';
  const bgColor = '#102017';
  const brandName = (payload.bulletin_brand_name || 'PARADOX RATIO').trim();
  const competition = (payload.bulletin_competition || '').trim();

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1b3828');
  grad.addColorStop(1, bgColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawNeonGrid(ctx, W, H, accent);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#eeeeee';
  ctx.font = `700 50px 'Space Grotesk', sans-serif`;
  ctx.fillText(brandName.toUpperCase(), W / 2, 88);
  ctx.fillStyle = accent;
  ctx.font = `700 62px 'Space Grotesk', sans-serif`;
  ctx.fillText('RÉSULTATS', W / 2, 164);

  if (competition) {
    ctx.font = `700 28px 'Inter', sans-serif`;
    const label = competition.toUpperCase();
    const tw = ctx.measureText(label).width;
    roundedRect(ctx, W / 2 - tw / 2 - 26, headerH - 66, tw + 52, 50, 25, null, accent, 2);
    ctx.fillStyle = '#e6e6e6';
    ctx.textAlign = 'center';
    ctx.fillText(label, W / 2, headerH - 32);
  }

  const pad = 44;
  const nameA0 = pad + 110;
  const nameA1 = pad + 340;
  const logoA = nameA1 + 70;
  const logoB = W - nameA1 - 70;
  const nameB0 = W - nameA1;
  const nameB1 = W - pad - 110;
  const scoreCx = W / 2;

  function drawInitialsBulletin(cx, cy, box, name) {
    drawInitials(ctx, cx, cy, box, name);
  }

  async function resolveLogo(url, name) {
    if (url) {
      const local = await cpLoadImageSafe(url);
      if (local) return local;
    }
    return cpWikipediaTeamLogo(name);
  }

  let y = headerH;
  for (const row of rows) {
    const home = (row.home || row.team1_name || 'Équipe A').trim();
    const away = (row.away || row.team2_name || 'Équipe B').trim();
    const homeImg = await resolveLogo(row.home_logo_url || row.team1_logo_url, home);
    const awayImg = await resolveLogo(row.away_logo_url || row.team2_logo_url, away);
    const won = row.result_status === 'gagne' || row.won === true;
    const side = row.side === 'away' ? 'away' : 'home';
    const cardTop = y + 18;
    const cardBottom = y + rowH - 18;
    const cy = (cardTop + cardBottom) / 2;

    roundedRect(ctx, pad, cardTop, W - pad * 2, cardBottom - cardTop, 20, 'rgba(11,28,19,0.55)', 'rgba(255,255,255,0.08)', 2);

    const iconCx = side === 'away' ? W - pad - 50 : pad + 50;
    ctx.beginPath();
    ctx.arc(iconCx, cy, 32, 0, Math.PI * 2);
    ctx.fillStyle = won ? '#3ac460' : '#de3e4c';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (won) {
      ctx.beginPath();
      ctx.moveTo(iconCx - 15, cy);
      ctx.lineTo(iconCx - 3, cy + 13);
      ctx.lineTo(iconCx + 17, cy - 15);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(iconCx - 13, cy - 13);
      ctx.lineTo(iconCx + 13, cy + 13);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(iconCx - 13, cy + 13);
      ctx.lineTo(iconCx + 13, cy - 13);
      ctx.stroke();
    }

    const dateText = row.event_date
      ? new Date(row.event_date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : 'Date/heure non renseignée';
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `600 20px 'Inter', sans-serif`;
    ctx.fillText(dateText, W / 2, cardTop + 32);

    ctx.font = `700 30px 'Inter', sans-serif`;
    for (const [x0, x1, name, align] of [[nameA0, nameA1, home, 'left'], [nameB0, nameB1, away, 'right']]) {
      const lines = wrapTeamName(ctx, name, `700 30px 'Inter', sans-serif`, x1 - x0);
      const lineHeight = 36;
      const startY = cy - (lines.length * lineHeight) / 2 + lineHeight * 0.75 + 8;
      ctx.fillStyle = '#e8e8e8';
      ctx.textAlign = align;
      const x = align === 'left' ? x0 : x1;
      lines.forEach((line, index) => ctx.fillText(line, x, startY + index * lineHeight));
    }

    if (!drawFitImage(ctx, homeImg, logoA, cy, 84)) drawInitialsBulletin(logoA, cy, 84, home);
    if (!drawFitImage(ctx, awayImg, logoB, cy, 84)) drawInitialsBulletin(logoB, cy, 84, away);

    const boxW = 168;
    const boxH = 96;
    roundedRect(ctx, scoreCx - boxW / 2, cy - boxH / 2, boxW, boxH, 14, '#000', null, 0);
    ctx.font = `700 52px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    const sh = row.score_home ?? row.hs ?? '-';
    const sa = row.score_away ?? row.as ?? '-';
    ctx.fillText(`${sh} - ${sa}`, scoreCx, cy + 18);
    ctx.font = `600 18px 'Inter', sans-serif`;
    ctx.fillStyle = accent;
    ctx.fillText((row.selection_label || '').toUpperCase(), scoreCx, cy + 45);

    y += rowH;
  }

  const footerTop = H - footerH;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, footerTop + 24);
  ctx.lineTo(W - pad, footerTop + 24);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `700 30px 'Space Grotesk', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${brandName.toUpperCase()} — RÉSULTATS VÉRIFIÉS`, W / 2, footerTop + 84);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('Erreur de création du visuel Bulletin'));
      try {
        const file = new File([blob], `bulletin_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const data = await apiUploadImage(file);
        resolve(data.url);
      } catch (error) {
        reject(error);
      }
    }, 'image/jpeg', 0.92);
  });
}

/**
 * Génère un visuel vertical (9:16) optimisé pour TikTok / Instagram Reels.
 */
export async function generateVerticalKitImage(payload, apiUploadImage) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Format TikTok/Reels : 1080x1920
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  
  const bgColor = '#0f111a';
  const accent = '#e2b34a';
  const green = '#10b981';
  
  // Fond
  ctx.fillStyle = bgColor;
  ctx.fillRect(0,0,W,H);
  drawNeonGrid(ctx, W, H, accent);
  
  // Titre
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = `800 60px 'Space Grotesk', sans-serif`;
  ctx.fillText('VIP EXCLUSIF', W/2, 200);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 75px 'Space Grotesk', sans-serif`;
  wrapText(ctx, payload.title || 'Gros coup à venir !', W/2, 320, W-100, 85);
  
  // Si c'est un bilan, on affiche le résultat en gros
  if (payload.type === 'bilan') {
    ctx.fillStyle = payload.result_status === 'gagne' ? green : (payload.result_status === 'perdu' ? '#ef4444' : '#6b7280');
    ctx.font = `900 120px 'Space Grotesk', sans-serif`;
    ctx.fillText(payload.result_status.toUpperCase(), W/2, H/2 - 100);
    
    if (payload.roi_percent) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 80px 'Space Grotesk', sans-serif`;
      ctx.fillText(`ROI : ${payload.roi_percent}%`, W/2, H/2 + 50);
    }
  } else {
    // Teaser pour pronostic
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 50px 'Space Grotesk', sans-serif`;
    ctx.fillText('ANALYSE DISPONIBLE', W/2, H/2 - 100);
    
    ctx.fillStyle = accent;
    ctx.font = `700 60px 'Space Grotesk', sans-serif`;
    ctx.fillText('SUR LA MINI APP', W/2, H/2);
    
    if (payload.cote) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 80px 'Space Grotesk', sans-serif`;
      ctx.fillText(`COTE : ${payload.cote}`, W/2, H/2 + 150);
    }
  }
  
  // Footer CTA
  ctx.fillStyle = accent;
  ctx.fillRect(0, H - 250, W, 250);
  
  ctx.fillStyle = '#000000';
  ctx.font = `800 55px 'Space Grotesk', sans-serif`;
  ctx.fillText('LIEN EN BIO', W/2, H - 125);
  
  // Convertir en fichier et uploader
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
  const file = new File([blob], 'kit_vertical.jpg', { type: 'image/jpeg' });
  const url = await apiUploadImage(file);
  return url;
}

/**
 * Génère un visuel hybride pour un Article : fond artistique (Pollinations) + texte et marque (Canvas)
 */
export async function generateArticleHybridImage(payload, apiUploadImage, backgroundUrl) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Format carré 1024x1024 pour correspondre à Pollinations
  const W = 1024;
  const H = 1024;
  canvas.width = W;
  canvas.height = H;
  
  const accent = '#e2b34a'; // gold
  
  // 1. Dessiner l'image de fond générée par Pollinations
  if (backgroundUrl) {
    const bgImg = await cpLoadImageSafe(backgroundUrl);
    if (bgImg) {
      // Remplir le canvas avec l'image en conservant le ratio (cover)
      const ratio = Math.max(W / bgImg.width, H / bgImg.height);
      const dw = bgImg.width * ratio;
      const dh = bgImg.height * ratio;
      ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#0f111a';
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, W, H);
  }
  
  // 2. Ajouter un dégradé sombre en bas pour rendre le texte lisible
  const gradient = ctx.createLinearGradient(0, H * 0.4, 0, H);
  gradient.addColorStop(0, 'rgba(15, 17, 26, 0)');
  gradient.addColorStop(0.6, 'rgba(15, 17, 26, 0.8)');
  gradient.addColorStop(1, 'rgba(15, 17, 26, 0.95)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, H * 0.4, W, H * 0.6);
  
  // 3. Ajouter la marque en haut à gauche (discret mais premium)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  roundedRect(ctx, 30, 30, 320, 60, 30, true, false, 0);
  ctx.fillStyle = accent;
  ctx.font = `700 24px 'Space Grotesk', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PRONOSTICS VIP', 190, 60);
  
  // 4. Ajouter le titre de l'article en bas
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  
  // Gérer le retour à la ligne du titre
  const titleLines = wrapTeamName(ctx, payload.title.toUpperCase(), `900 64px 'Space Grotesk', sans-serif`, W - 100);
  
  const titleY = H - 140 - ((titleLines.length - 1) * 70);
  
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  
  for (let i = 0; i < titleLines.length; i++) {
    ctx.fillText(titleLines[i], W / 2, titleY + (i * 70));
  }
  
  // Désactiver l'ombre pour la suite
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // 5. Ajouter un petit séparateur et "LIRE L'ARTICLE"
  ctx.fillStyle = accent;
  ctx.fillRect(W / 2 - 40, H - 90, 80, 4);
  
  ctx.fillStyle = '#aaaaaa';
  ctx.font = `600 28px 'Inter', sans-serif`;
  ctx.fillText('LIRE L\'ARTICLE COMPLET', W / 2, H - 40);
  
  // 6. Ajouter une bordure dorée fine tout autour
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);
  
  // Convertir en fichier et uploader
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
  const file = new File([blob], 'article_hybride.jpg', { type: 'image/jpeg' });
  const url = await apiUploadImage(file);
  return url;
}
