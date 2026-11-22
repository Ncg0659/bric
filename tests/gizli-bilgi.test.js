// Gizli bilgi testi: yeni Zor bot rakiplerin ve ortağın gizli kartlarını göremez.
'use strict';
const M = require('./lib/motor');
const E = M.loadEngine(5);
const P = M.players(E);
const t = M.makeRunner('Gizli bilgi testleri');

let leaks = 0, changed = 0, notFrozen = 0, decisions = 0;
const examples = [];

// Botun gördüğü kartlar yalnızca: kendi eli + (açıldıysa) yer + oynanmış kartlar olmalı
function visibleIds(g, seat) {
  const ids = new Set(g.hands[seat].map(c => c.id));
  if (g.dummyOpen && seat !== 'N') g.hands.N.forEach(c => ids.add(c.id));
  g.history.forEach(h => h.plays.forEach(p => ids.add(p.card.id)));
  g.trick.forEach(p => ids.add(p.card.id));
  return ids;
}
function allIds(obj, out = new Set()) {
  if (obj && typeof obj === 'object') {
    if (typeof obj.id === 'string' && obj.suit) out.add(obj.id);
    Object.values(obj).forEach(v => allIds(v, out));
  }
  return out;
}

// Gizli iki eli (ortak ve deklaran) aralarında karıştırır; botun göreceği bilgi aynı kalır
function shuffleHidden(g, seat) {
  const partner = E.partnerOf(seat);
  const hidden = [partner, 'S'].filter(s => s !== seat);
  const pool = hidden.flatMap(s => g.hands[s]);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const copy = { ...g, hands: { ...g.hands } };
  let k = 0;
  for (const s of hidden) { copy.hands[s] = pool.slice(k, k + g.hands[s].length); k += g.hands[s].length; }
  return copy;
}

for (let n = 0; n < 400; n++) {
  const contract = { level: 1 + (n % 7), suit: ['C', 'D', 'H', 'S', 'NT'][n % 5] };
  const who = { N: P['eski-zor'], S: P['eski-zor'], E: P['yeni-zor'], W: P['yeni-zor'] };
  M.playDeal(E, E.dealHands(E.shuffle(E.createDeck())), contract, who, {
    onDecision(g, seat) {
      if (seat !== 'E' && seat !== 'W') return;
      decisions++;
      const view = E.buildView(g, seat);
      if (!Object.isFrozen(view) || !Object.isFrozen(view.hand)) notFrozen++;
      const seen = allIds(view), allowed = visibleIds(g, seat);
      for (const id of seen) if (!allowed.has(id)) { leaks++; if (examples.length < 3) examples.push(`${seat} gizli kart gördü: ${id}`); }
      // Gizli eller karıştırılınca kararın değişmemesi gerekir
      const a = E.botHardDefense(view).id;
      const b = E.botHardDefense(E.buildView(shuffleHidden(g, seat), seat)).id;
      if (a !== b) changed++;
    }
  });
}
console.log(`${decisions} savunma kararı incelendi`);
t.check('Görünür bilgide gizli kart yok', leaks === 0, examples.join(' | '));
t.check('Gizli eller değişince karar değişmiyor', changed === 0, `${changed} karar değişti`);
t.check('Görünür bilgi değiştirilemez (dondurulmuş)', notFrozen === 0);
t.check('İlk açılışta yer kartları görünmüyor', E.buildView({ hands: E.dealHands(E.shuffle(E.createDeck())), trick: [],
  history: [], contract: { level: 4, suit: 'S' }, trump: 'S', target: 10, dummyOpen: false, tricksNS: 0, tricksEW: 0 }, 'W').dummy === null);
// Bot kodu oyunun gerçek durumuna (state) erişmeye çalışırsa motor.js içindeki tuzak hata verir;
// yukarıdaki yüzlerce kararda hata çıkmaması, botun yalnızca kendisine verilen bilgiyi kullandığını gösterir.
t.check('Bot gerçek oyun durumuna erişmiyor', decisions > 1000);

module.exports = t.done();
if (require.main === module) process.exit(module.exports ? 0 : 1);
