// Seviye dağıtımları: koşul sağlanıyor mu, ne kadar sürüyor? (Bu aşamada dağıtım kodu değişmedi; ölçüm amaçlı)
'use strict';
const M = require('./lib/motor');
const E = M.loadEngine(9);
const t = M.makeRunner('Dağıtım testleri');

E.LEVELS.forEach((L, i) => {
  const trump = E.trumpOf(L.contract);
  const times = []; let miss = 0;
  for (let g = 0; g < 200; g++) {
    const start = process.hrtime.bigint();
    const h = E.dealForContract(L.contract, L.minHCP);
    times.push(Number(process.hrtime.bigint() - start) / 1e6);
    const pts = E.hcp(h.N) + E.hcp(h.S);
    const ok = pts >= L.minHCP && (!trump || (E.suitCount(h.S, trump) >= 4 && E.suitCount(h.S, trump) + E.suitCount(h.N, trump) >= 8));
    if (!ok) miss++;
    t.check(`Seviye ${i + 1} dağıtımı 4×13 kart`, ['N', 'E', 'S', 'W'].every(s => h[s].length === 13));
  }
  times.sort((a, b) => a - b);
  console.log(`Seviye ${i + 1}: ortalama ${(times.reduce((a, b) => a + b) / times.length).toFixed(1)} ms, ` +
    `en yavaş %1 ${times[198].toFixed(0)} ms, koşulu sağlamayan ${miss}/200`);
});
module.exports = t.done();
if (require.main === module) process.exit(module.exports ? 0 : 1);
