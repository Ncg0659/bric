// Kararlılık: bütün kontratlarda ve zorluklarda 13 el boyunca kural dışı hamle, kayıp ya da tekrar kart olmamalı.
// Kullanım: node tests/kararlilik.test.js [oyun-sayısı-çarpanı]
'use strict';
const M = require('./lib/motor');
const SCALE = Number(process.argv[2] || 1);
const E = M.loadEngine(77);
const P = M.players(E);
const t = M.makeRunner('Kararlılık testleri');

let games = 0, errors = 0;
const firstErrors = [];
function run(name, hands, contract, defender) {
  const who = { N: P['eski-zor'], S: P['eski-zor'], E: P[defender], W: P[defender] };
  try { M.playDeal(E, hands, contract, who); games++; }
  catch (e) { errors++; if (firstErrors.length < 5) firstErrors.push(`${name}: ${e.message}`); }
}
// 35 kontrat × 4 savunma botu (Kolay, Orta, eski Zor, yeni Zor)
for (let level = 1; level <= 7; level++) for (const suit of ['C', 'D', 'H', 'S', 'NT'])
  for (const d of ['kolay', 'orta', 'eski-zor', 'yeni-zor'])
    for (let g = 0; g < 60 * SCALE; g++) run(`${level}${suit} ${d}`, E.dealHands(E.shuffle(E.createDeck())), { level, suit }, d);
// 10 seviyenin kendi dağıtımları, yeni Zor bot ile
E.LEVELS.forEach((L, i) => { for (let g = 0; g < 50 * SCALE; g++) run(`Seviye ${i + 1}`, E.dealForContract(L.contract, L.minHCP), L.contract, 'yeni-zor'); });

console.log(`${games + errors} oyun oynandı`);
t.check('Kural dışı hamle, kayıp ya da tekrar kart yok', errors === 0, firstErrors.join(' | '));

module.exports = t.done();
if (require.main === module) process.exit(module.exports ? 0 : 1);
