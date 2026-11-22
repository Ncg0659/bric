// Eski ve yeni Zor botu AYNI dağıtımlarda savunmada karşılaştırır.
// Deklaran tarafı (Kuzey-Güney) her iki durumda da eski Zor bot ile oynanır, böylece tek fark savunmadır.
// Kullanım: node tests/karsilastirma.js [dağıtım-sayısı-çarpanı]
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('./lib/motor');

const SCALE = Number(process.argv[2] || 1);
const E = M.loadEngine(2026);
const P = M.players(E);
const SUITS_ALL = ['C', 'D', 'H', 'S', 'NT'];

function team(defender) {
  return { N: P['eski-zor'], S: P['eski-zor'], E: P[defender], W: P[defender] };
}

// ---- Stratejik karar ölçütleri (oyun bittikten sonra, tam bilgiyle değerlendirilir) ----
function newMetrics() {
  return { asAlti: [0, 0], papazAlti: [0, 0], ucuncuKaptirma: [0, 0], ortagiGecme: [0, 0],
           ortagiKesme: [0, 0], korumasizAtis: [0, 0] };
}
// Ortağın kartı, sonra oynayacak rakiplerce (görünen bilgiye göre) geçilemez mi?
function partnerSafe(d, partnerCard, leadSuit) {
  const v = d.view;
  const mem = E.tableMemory(v);
  const after = [];
  let s = d.seat;
  for (let i = d.trick.length + 1; i < 4; i++) { s = E.nextSeat(s); after.push(s); }
  return after.filter(x => x !== mem.partner).every(x => !E.opponentCanBeat(x, partnerCard, leadSuit, v, mem));
}

function analyse(log, trump, m) {
  for (const d of log) {
    if (d.seat !== 'E' && d.seat !== 'W') continue;
    const partner = E.partnerOf(d.seat);
    const leadSuit = d.trick.length ? d.trick[0].card.suit : d.card.suit;
    const inSuit = d.hand.filter(c => c.suit === d.card.suit);
    // 1) Kozlu oyunda ilk açılış: As'ın altından küçük açma / desteksiz Papaz'dan açma
    if (d.trickNo === 0 && d.pos === 0 && trump) {
      const hasA = inSuit.some(c => c.rank === 14), hasK = inSuit.some(c => c.rank === 13);
      const hasQ = inSuit.some(c => c.rank === 12);
      m.asAlti[1]++; if (d.card.suit !== trump && hasA && !hasK && d.card.rank !== 14) m.asAlti[0]++;
      m.papazAlti[1]++; if (d.card.suit !== trump && hasK && !hasA && !hasQ && d.card.rank !== 13) m.papazAlti[0]++;
    }
    // 2) Üçüncü el
    if (d.pos === 2 && d.card.suit === leadSuit && d.trick[0].seat === partner) {
      const finalWin = d.fullTrick.find(p => p.seat === d.winner).card;
      const myHigh = Math.max(...inSuit.map(c => c.rank));
      // Kaptırma: eli rakip, benim elimdekinden KÜÇÜK bir kartla (koz kesmeden) aldı
      m.ucuncuKaptirma[1]++;
      if (d.winner !== d.seat && d.winner !== partner && finalWin.suit === leadSuit &&
          finalWin.rank < myHigh && d.card.rank < myHigh) m.ucuncuKaptirma[0]++;
      // Ortağı gereksiz geçme: ortak önde ve ortağın kartı GÖRÜNEN bilgiye göre kesin alıyordu, ben yine de geçtim
      const partnerCard = d.trick[0].card;
      if (E.trickWinner(d.trick, trump) === partner) {
        m.ortagiGecme[1]++;
        const couldDuck = d.legal.some(c => c.rank < partnerCard.rank);    // daha küçük kart vardı (zorunlu değil)
        if (couldDuck && d.card.rank > partnerCard.rank && partnerSafe(d, partnerCard, leadSuit)) m.ortagiGecme[0]++;
      }
    }
    // 3) Ortağın kesin elini koz kesme (görünen bilgiye göre ortağın kartı kesin alıyordu)
    if (trump && d.trick.length && leadSuit !== trump && !d.hand.some(c => c.suit === leadSuit) &&
        E.trickWinner(d.trick, trump) === partner) {
      const pc = d.trick.find(p => p.seat === partner).card;
      if (partnerSafe(d, pc, leadSuit) && d.legal.some(c => c.suit !== trump)) {   // atacak başka kart vardı
        m.ortagiKesme[1]++;
        if (d.card.suit === trump) m.ortagiKesme[0]++;
      }
    }
    // 4) Korumasız bırakan atış (Papaz ikili, Kız üçlü)
    if (d.trick.length && d.card.suit !== leadSuit && d.card.suit !== trump) {
      m.korumasizAtis[1]++;
      const left = inSuit.filter(c => c !== d.card);
      if (left.some(c => (c.rank === 13 && left.length < 2) || (c.rank === 12 && left.length < 3))) m.korumasizAtis[0]++;
    }
  }
}

const stats = {};
function bucket(name) {
  return stats[name] || (stats[name] = { n: 0, ew: { 'eski-zor': 0, 'yeni-zor': 0 }, set: { 'eski-zor': 0, 'yeni-zor': 0 },
    better: 0, worse: 0, same: 0 });
}
const metrics = { 'eski-zor': newMetrics(), 'yeni-zor': newMetrics() };
const worseExamples = [];
let worseTotal = 0;

function compare(name, hands, contract) {
  const trump = E.trumpOf(contract);
  const need = E.tricksNeeded(contract);
  const r = {};
  for (const bot of ['eski-zor', 'yeni-zor']) {
    r[bot] = M.playDeal(E, hands, contract, team(bot), { views: true });
    analyse(r[bot].log, trump, metrics[bot]);
  }
  for (const b of [bucket(name), bucket('TOPLAM'), bucket(trump ? 'Kozlu' : 'Sanzatu')]) {
    b.n++;
    for (const bot of ['eski-zor', 'yeni-zor']) {
      b.ew[bot] += r[bot].tricksEW;
      if (r[bot].tricksNS < need) b.set[bot]++;
    }
    const diff = r['yeni-zor'].tricksEW - r['eski-zor'].tricksEW;
    if (diff > 0) b.better++; else if (diff < 0) b.worse++; else b.same++;
  }
  const diff = r['yeni-zor'].tricksEW - r['eski-zor'].tricksEW;
  if (diff < 0) {
    worseTotal++;
    if (worseExamples.length < 12) {
      const a = r['eski-zor'].log, b = r['yeni-zor'].log;
      const i = b.findIndex((d, k) => d.card.id !== a[k].card.id);
      worseExamples.push({ name, contract, diff, first: b[i], old: a[i], hands });
    }
  }
}

// A) Seviye dağıtımları (her seviyenin kontratı ve dağıtım koşulu)
E.reseed(11);
E.LEVELS.forEach((L, i) => {
  for (let g = 0; g < 300 * SCALE; g++) compare(`Seviye ${i + 1} (${L.contract.level}${L.contract.suit === 'NT' ? 'SA' : L.contract.suit})`,
    E.dealForContract(L.contract, L.minHCP), L.contract);
});
// B) Serbest oyun: tamamen rastgele dağıtımlar, 35 kontrat
E.reseed(12);
for (let level = 1; level <= 7; level++) for (const suit of SUITS_ALL)
  for (let g = 0; g < 30 * SCALE; g++) compare('Serbest (rastgele)', E.dealHands(E.shuffle(E.createDeck())), { level, suit });

// ---- Rapor ----
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
const lines = [];
lines.push('# Eski ve yeni Zor bot karşılaştırması', '',
  'Deklaran tarafı her iki durumda da eski Zor bot ile oynandı; tek fark savunmadır. Aynı dağıtımlar, aynı tohum.', '',
  '| Dağıtım grubu | Oyun | Savunma eli (eski → yeni) | Batırma oranı (eski → yeni) | Yeni daha iyi / aynı / daha kötü |',
  '|---|---:|---:|---:|---:|');
for (const [name, b] of Object.entries(stats)) {
  lines.push(`| ${name} | ${b.n} | ${(b.ew['eski-zor'] / b.n).toFixed(2)} → ${(b.ew['yeni-zor'] / b.n).toFixed(2)} | ` +
    `${pct(b.set['eski-zor'], b.n)} → ${pct(b.set['yeni-zor'], b.n)} | ${b.better} / ${b.same} / ${b.worse} |`);
}
const names = {
  asAlti: 'Kozluda As\'ın altından küçük açılış', papazAlti: 'Kozluda desteksiz Papaz\'dan küçük açılış',
  ucuncuKaptirma: 'Üçüncü elde eli küçük kartla rakibe kaptırma', ortagiGecme: 'Üçüncü elde ortağın kazanan kartını gereksiz geçme',
  ortagiKesme: 'Ortağın kesin elini koz kesme', korumasizAtis: 'Papaz/Kız\'ı korumasız bırakan atış'
};
lines.push('', '## Stratejik karar hataları (düşük daha iyi)', '', '| Hata | Eski Zor | Yeni Zor |', '|---|---:|---:|');
for (const k of Object.keys(names)) {
  const o = metrics['eski-zor'][k], n = metrics['yeni-zor'][k];
  lines.push(`| ${names[k]} | ${pct(o[0], o[1])} (${o[0]}/${o[1]}) | ${pct(n[0], n[1])} (${n[0]}/${n[1]}) |`);
}
lines.push('', `## Yeni botun eskisinden kötü savunduğu dağıtımlar: ${worseTotal}`, '');
for (const w of worseExamples) {
  const f = w.first, o = w.old;
  const c = `${w.contract.level}${w.contract.suit === 'NT' ? 'SA' : w.contract.suit}`;
  lines.push(`- **${w.name}, ${c}**: savunma ${-w.diff} el az aldı. İlk farklı karar: ${f.trickNo + 1}. el, ` +
    `${f.seat}, ${['açılış', '2. el', '3. el', '4. el'][f.pos]} — eski ${M.cardName(o.card)}, yeni ${M.cardName(f.card)}. ` +
    `Masada: ${f.trick.map(p => p.seat + ' ' + M.cardName(p.card)).join(', ') || '(boş)'}; ` +
    `${f.seat} eli: ${f.hand.map(M.cardName).join(' ')}`);
}
const out = lines.join('\n');
console.log(out);
const dir = path.join(__dirname, 'sonuclar');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'karsilastirma.md'), out + '\n');
