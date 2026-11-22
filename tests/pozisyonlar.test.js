// Yeni Zor savunma botu için sabit pozisyonlar.
// Her pozisyonda briç prensiplerine göre beklenen kart(lar) yazılıdır.
// Elleri yazarken: S=♠ H=♥ D=♦ C=♣, T=10. Ör. "S:AK5 H:QJ D:- C:T98"
'use strict';
const M = require('./lib/motor');
const E = M.loadEngine(1);
const t = M.makeRunner('Sabit pozisyon testleri');

function plays(text) {
  if (!text) return [];
  return text.split(/\s+/).map(x => { const [seat, c] = x.split(':'); return { seat, card: M.card(c) }; });
}
// Pozisyonu oyun durumuna çevirir. Gizli eller boş bırakılır: bot zaten onları görmez.
function position(p) {
  const hands = { N: [], E: [], S: [], W: [] };
  hands[p.seat] = M.parseHand(p.hand);
  if (p.dummy) hands.N = M.parseHand(p.dummy);
  const history = (p.history || []).map(h => {
    const ps = plays(h);
    return { plays: ps, winner: E.trickWinner(ps, E.trumpOf(p.contract)) };
  });
  const trick = plays(p.trick);
  const contract = p.contract;
  return {
    hands, trick, history, contract, trump: E.trumpOf(contract), target: E.tricksNeeded(contract),
    dummyOpen: history.length > 0 || trick.length > 0,
    tricksNS: history.filter(h => h.winner === 'N' || h.winner === 'S').length,
    tricksEW: history.filter(h => h.winner === 'E' || h.winner === 'W').length
  };
}
function expect(name, p, ...expected) {
  const g = position(p);
  const got = E.botHardDefense(E.buildView(g, p.seat));
  const ok = expected.includes(got.id);
  t.check(name, ok, `beklenen ${expected.map(id => M.cardName(M.card(id))).join(' / ')}, oynanan ${M.cardName(got)}`);
}
const SPADES4 = { level: 4, suit: 'S' };
const NT3 = { level: 3, suit: 'NT' };

// ---------------- AÇILIŞ ----------------
expect('Kozlu: As-Papaz varsa As açılır', { seat: 'W', contract: SPADES4,
  hand: 'S:84 H:AK75 D:9632 C:J87' }, 'H14');
expect('Kozlu: As\'ın altından küçük açılmaz', { seat: 'W', contract: SPADES4,
  hand: 'S:73 H:JT4 D:A853 C:Q962' }, 'H11');
expect('Kozlu: Papaz-Kız sırasından Papaz', { seat: 'W', contract: SPADES4,
  hand: 'S:82 H:9763 D:J52 C:KQ84' }, 'C13');
expect('Kozlu: koz kesme şansı olan tekli', { seat: 'W', contract: SPADES4,
  hand: 'S:852 H:K863 D:4 C:Q9752' }, 'D4');
expect('Kozlu: her renk riskliyse küçük koz', { seat: 'W', contract: SPADES4,
  hand: 'S:764 H:K852 D:Q93 C:A642' }, 'S4');
expect('Kozlu: iç sıradan (P-V-10) Vale', { seat: 'W', contract: { level: 4, suit: 'H' },
  hand: 'S:KJT4 H:83 D:9752 C:864' }, 'S11');
expect('Sanzatu: P-K-V sırasından Papaz', { seat: 'W', contract: NT3,
  hand: 'S:KQJ65 H:83 D:972 C:J54' }, 'S13');
expect('Sanzatu: uzun renkten dördüncü büyük', { seat: 'W', contract: NT3,
  hand: 'S:84 H:Q9742 D:J63 C:K5' }, 'H4');
expect('Sanzatu: kısa onurlu renkten açılmaz, uzun renk seçilir', { seat: 'W', contract: NT3,
  hand: 'S:K4 H:A3 D:J9852 C:Q763' }, 'D5');
expect('Sanzatu: iç sıradan (A-V-10) Vale', { seat: 'W', contract: NT3,
  hand: 'S:AJT42 H:863 D:974 C:52' }, 'S11');

// ---------------- ÜÇÜNCÜ EL ----------------
expect('Üçüncü el yüksek, bitişiklerin küçüğü (P-K → K)', { seat: 'E', contract: SPADES4,
  hand: 'S:52 H:KQ8 D:J974 C:9632', dummy: 'S:QJ7 H:J6 D:AK5 C:K854', trick: 'W:H4 N:H3' }, 'H12');
expect('Ortak sıranın başıyla (Papaz) önde, As benim: küçük at', { seat: 'E', contract: SPADES4,
  hand: 'S:52 H:A92 D:J974 C:9632', dummy: 'S:QJ7 H:86 D:AK5 C:K854', trick: 'W:H13 N:H3' }, 'H2');
expect('Yer (Kız) önde: Papaz ile üstüne çık', { seat: 'E', contract: SPADES4,
  hand: 'S:52 H:K84 D:J974 C:9632', dummy: 'S:QJ7 H:63 D:AK5 C:K854', trick: 'W:H3 N:H12' }, 'H13');
expect('Son oyuncu yer ve Papazı var: Kız\'ı boşa harcama', { seat: 'W', contract: SPADES4,
  hand: 'S:52 H:9632 D:J97 C:QJ7', dummy: 'S:QJ7 H:K63 D:AK5 C:K6', trick: 'E:C5 S:C2' }, 'C7');
expect('Sanzatu: P-V-x ile üçüncü el Papaz', { seat: 'E', contract: NT3,
  hand: 'S:KJ3 H:9752 D:T84 C:963', dummy: 'S:97 H:AQ4 D:KQJ5 C:A84', trick: 'W:S4 N:S2' }, 'S13');
expect('Ortağın As\'ı kesin: küçük at', { seat: 'E', contract: NT3,
  hand: 'S:K73 H:9752 D:T84 C:963', dummy: 'S:95 H:AQ4 D:KQJ5 C:A84', trick: 'W:S14 N:S2' }, 'S3');
expect('As-Papaz ile üçüncü el: Papaz yeter', { seat: 'E', contract: SPADES4,
  hand: 'S:52 H:AK8 D:J974 C:9632', dummy: 'S:QJ7 H:76 D:AK5 C:K854', trick: 'W:H4 N:H3' }, 'H13');

// ---------------- İKİNCİ EL ----------------
expect('İkinci el küçük (deklaran küçük açtı)', { seat: 'W', contract: SPADES4,
  hand: 'S:52 H:A86 D:J97 C:9632', dummy: 'S:QJ7 H:KT5 D:AK C:K854',
  history: ['W:D4 N:D5 E:D10 S:D2'], trick: 'S:H3' }, 'H6');
expect('Yer sıralı büyük açtı (Kız, Vale yerde): kapatma', { seat: 'E', contract: SPADES4,
  hand: 'S:52 H:9862 D:J97 C:K74', dummy: 'S:QJ7 H:K3 D:AK5 C:JT8', trick: 'N:C12' }, 'C4');
expect('Yer tek büyük açtı: Papazla kapat', { seat: 'E', contract: SPADES4,
  hand: 'S:52 H:9862 D:J97 C:K74', dummy: 'S:QJ7 H:K3 D:AK5 C:854', trick: 'N:C12' }, 'C13');

// ---------------- RENGE UYAMAMA ----------------
expect('Ortağın As\'ı kesin: koz kesme, at', { seat: 'E', contract: SPADES4,
  hand: 'S:52 H:9862 D:- C:J9743', dummy: 'S:QJ7 H:K3 D:865 C:AQ8', trick: 'W:D14 N:D3' }, 'C3', 'H2');
expect('Rakip önde: küçük kozla kes', { seat: 'W', contract: SPADES4,
  hand: 'S:A52 H:9862 D:- C:J9743', dummy: 'S:QJ7 H:K D:8653 C:AQ8',
  history: ['W:H10 N:H3 E:H14 S:H4'], trick: 'E:D2 S:D13' }, 'S2');
expect('Atışta korumalı Papaz bozulmaz (ikili Papaz tutulur)', { seat: 'W', contract: NT3,
  hand: 'S:K4 H:Q87 D:- C:96532', dummy: 'S:A52 H:AK3 D:K8653 C:AQ', trick: 'E:D2 S:D14' }, 'C2');

// ---------------- MASA HAFIZASI ----------------
{
  const g = position({ seat: 'W', contract: SPADES4, hand: 'S:52 H:Q8 D:J97 C:9632',
    dummy: 'S:QJ7 D:AK5 C:K854',
    history: ['W:H2 N:H3 E:H14 S:H4', 'E:H13 S:H7 W:H6 N:H5'] });
  const v = E.buildView(g, 'W');
  const mem = E.tableMemory(v);
  t.check('Hafıza: As ve Papaz oynandıysa Kız en büyük kart', E.isBoss(M.card('H12'), v, mem));
  t.check('Hafıza: oynanan kartlar sayılıyor', mem.played.size === 8);
  const g2 = position({ seat: 'W', contract: SPADES4, hand: 'S:52 H:Q86 D:J97 C:9632',
    dummy: 'S:QJ7 H:53 D:AK C:K854', history: ['W:D2 N:D5 E:D10 S:S3'] });
  const m2 = E.tableMemory(E.buildView(g2, 'W'));
  t.check('Hafıza: renge uyamayan oyuncunun o rengi bitti', m2.voids.S.has('D') && !m2.voids.E.has('D'));
  t.check('Hafıza: ortağın açtığı renk biliniyor', E.tableMemory(E.buildView(position({ seat: 'W', contract: SPADES4,
    hand: 'S:52 H:Q86 D:J97 C:963', dummy: 'S:QJ7', history: ['W:D2 N:D5 E:D10 S:D3', 'E:C4 S:C5 W:C2 N:C8'] }), 'W')).partnerSuit === 'C');
}

module.exports = t.done();
if (require.main === module) process.exit(module.exports ? 0 : 1);
