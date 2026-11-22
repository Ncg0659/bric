// Korunması gerekenler değişmedi mi? (Kolay/Orta/eski Zor bot, kurallar, seviyeler, ayarlar, tasarım)
// Parmak izleri Aşama 1 canlı sürümünden (main, 9a95a8c) alındı.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const M = require('./lib/motor');
const t = M.makeRunner('Koruma testleri');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function source(name) {
  const i = html.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let depth = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') depth++;
    else if (html[k] === '}' && --depth === 0) return html.slice(i, k + 1);
  }
  return '';
}
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

const FINGERPRINTS = {
  botChooseCard: '665c210283451856', botEasy: '5a12e904372e9c3d', botMedium: '4fb1ee948332fdea',
  botHard: 'bf2c1936442f723f', legalCards: 'f11785571b274973', beats: 'ea7dadbba617c3db',
  trickWinner: 'f3f288dd5d1b5c86', dealForContract: '34e0d0be6b1abde3', dealHands: 'b1a64cbff85d48ad',
  shuffle: '9d3371a3bf6699d1', loadSettings: '4c2327c340fa6dfe', saveSettings: 'eb73dbb3bf78fc7e',
  renderSettings: '738ea332ec3976aa', showResult: 'e8419306e176bd2d'
};
for (const [name, fp] of Object.entries(FINGERPRINTS)) {
  t.check(`${name} değişmedi`, hash(source(name)) === fp);
}

// Seviye tablosu ve kayıt anahtarı aynı (kayıtlı ilerleme korunur)
const E = M.loadEngine(1);
t.check('10 seviye duruyor', E.LEVELS.length === 10);
t.check('Kayıt anahtarı aynı (bric-ayarlar)', html.includes("const STORE_KEY = 'bric-ayarlar';"));
t.check('İlk seviye 2♠ / Kolay', E.LEVELS[0].contract.level === 2 && E.LEVELS[0].contract.suit === 'S' &&
  E.LEVELS[0].difficulty === 'kolay');
t.check('Son seviye 6♠ / Zor', E.LEVELS[9].contract.level === 6 && E.LEVELS[9].difficulty === 'zor');

// Eşsiz mod: Kuzey hâlâ eski Zor botu kullanıyor; yeni bot yalnızca Doğu ve Batı'da
const chooser = source('chooseBotCard');
t.check('Yeni bot yalnızca Doğu/Batı + Zor seviyede', chooser.includes("level === 'zor' && (seat === 'E' || seat === 'W')"));
t.check('Diğer durumlar eski bota gidiyor', chooser.includes('return botChooseCard(hand, state.trick, state.trump, seat, level);'));

module.exports = t.done();
if (require.main === module) process.exit(module.exports ? 0 : 1);
