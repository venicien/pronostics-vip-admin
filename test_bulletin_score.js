const fs = require('fs');
const { createCanvas, loadImage, registerFont } = require('canvas');

const row = { score_home: 3, score_away: 0, hs: null, as: null };
const sh = row.score_home ?? row.hs ?? '-';
const sa = row.score_away ?? row.as ?? '-';

if (sh === 3 && sa === 0) {
  console.log('SCORE_LOGIC_OK', `${sh} - ${sa}`);
} else {
  console.log('SCORE_LOGIC_FAIL', `${sh} - ${sa}`);
  process.exit(1);
}
