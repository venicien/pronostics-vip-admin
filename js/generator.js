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
