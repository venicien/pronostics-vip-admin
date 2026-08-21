const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function testRender() {
  const canvas = createCanvas(1080, 570);
  const ctx = canvas.getContext('2d');
  
  // Fond
  ctx.fillStyle = '#0f111a';
  ctx.fillRect(0,0,1080,570);
  
  // En-tête
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e2b34a';
  ctx.font = `bold 38px sans-serif`;
  ctx.fillText('PRONOSTICS VIP', 1080/2, 80);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 68px sans-serif`;
  ctx.fillText('TEST COMBINE', 1080/2, 160);
  
  ctx.fillStyle = '#e2b34a';
  ctx.font = `bold 34px sans-serif`;
  ctx.fillText('COTE TOTALE : 2.5', 1080/2, 220);
  
  // Carte
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(40, 280, 1000, 170);
  
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 28px sans-serif`;
  ctx.fillText('PSG', 240, 365);
  
  ctx.textAlign = 'right';
  ctx.fillText('MARSEILLE', 1080 - 240, 365);
  
  ctx.textAlign = 'center';
  ctx.fillStyle = '#666666';
  ctx.font = `bold 36px sans-serif`;
  ctx.fillText('VS', 1080/2, 365);
  
  const buffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync('/home/ubuntu/upload/test_render.jpg', buffer);
  console.log('Render saved to /home/ubuntu/upload/test_render.jpg');
}

testRender().catch(console.error);
