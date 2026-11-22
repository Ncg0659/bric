// Oyunun kural ve bot kodunu index.html'den okuyup Node içinde çalıştırır.
// Testler böylece oyunun gerçekten kullandığı kodu dener; kopya kod tutulmaz.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const INDEX = path.join(__dirname, '..', '..', 'index.html');
const START = '1) SABİTLER';
const END = '3) AYARLAR';

// Tohumlu rastgele sayı üreteci: aynı tohum her zaman aynı dağıtımı verir
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadEngine(seed = 1) {
  const html = fs.readFileSync(INDEX, 'utf8');
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const from = script.indexOf(START);
  const to = script.indexOf(END);
  if (from < 0 || to < 0) throw new Error('index.html içinde kural bölümü bulunamadı');
  // 1) Sabitler ve 2) Kural fonksiyonları bölümlerini al (3) Ayarlar ekran koduna kadar)
  const body = script.slice(script.indexOf('*/', from) + 2, script.lastIndexOf('/*', to));

  const math = Object.create(Math);
  let rng = mulberry32(seed);
  math.random = () => rng();
  // "state" global'ine erişen bir bot kodu olursa test anında patlasın (gizli bilgi koruması)
  const trap = new Proxy({}, { get() { throw new Error('Bot kodu oyunun gizli durumuna (state) erişmeye çalıştı'); } });
  const context = vm.createContext({ Math: math, console, state: trap });
  vm.runInContext(body + `
    ;this.__engine = { createDeck, shuffle, dealHands, sortHand, nextSeat, partnerOf, legalCards, beats,
      trickWinner, botChooseCard, botEasy, botMedium, botHard, trumpOf, tricksNeeded, hcp, suitCount,
      dealForContract, LEVELS, SUITS, NT, buildView, tableMemory, botHardDefense, isBoss,
      lowestEquivalent, opponentCanBeat, deepFreeze };`, context, { filename: 'index.html#kurallar' });
  const E = context.__engine;
  E.reseed = s => { rng = mulberry32(s); };
  return E;
}

// ---- Kart yardımcıları ----
const RANKS = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
// "♠AK5 ♥QJ ..." yerine düz yazım: "S:AK5 H:QJ D:- C:T98"
function parseHand(text) {
  const cards = [];
  for (const part of text.trim().split(/\s+/)) {
    const [suit, ranks] = part.split(':');
    if (!ranks || ranks === '-') continue;
    for (const ch of ranks) {
      const rank = RANKS[ch] || Number(ch);
      cards.push({ suit, rank, id: suit + rank });
    }
  }
  return cards;
}
function card(text) {               // "SA", "H10", "DT"
  const suit = text[0];
  const r = text.slice(1);
  const rank = RANKS[r] || Number(r);
  return { suit, rank, id: suit + rank };
}
function cardName(c) {
  const sym = { S: '♠', H: '♥', D: '♦', C: '♣' }[c.suit];
  const r = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J' }[c.rank] || String(c.rank);
  return sym + r;
}

// ---- Oyuncular (strateji) ----
// Her oyuncu (oyun, yer) alır ve elinden GERÇEK bir kart nesnesi döndürür.
function players(E) {
  return {
    kolay: (g, s) => E.botEasy(g.hands[s], g.trick),
    orta: (g, s) => E.botMedium(g.hands[s], g.trick, g.trump, s),
    'eski-zor': (g, s) => E.botHard(g.hands[s], g.trick, g.trump, s),
    'yeni-zor': (g, s) => {
      const picked = E.botHardDefense(E.buildView(g, s));
      return g.hands[s].find(c => c.id === picked.id);
    }
  };
}

function newGameState(E, hands, contract) {
  return {
    hands: { N: hands.N.slice(), E: hands.E.slice(), S: hands.S.slice(), W: hands.W.slice() },
    trick: [], history: [], contract, trump: E.trumpOf(contract), target: E.tricksNeeded(contract),
    dummyOpen: false, tricksNS: 0, tricksEW: 0
  };
}

// Bir dağıtımı baştan sona oynatır. Oyundaki akışın aynısı: Batı açar, eli alan sonrakini açar.
// Kural ihlali ya da kart kaybı olursa hata fırlatır. Her kararın kaydını döndürür.
function playDeal(E, hands, contract, who, opts = {}) {
  const g = newGameState(E, hands, contract);
  const log = [];
  const seen = new Set();
  let turn = 'W';
  for (let t = 0; t < 13; t++) {
    for (let k = 0; k < 4; k++) {
      const legal = E.legalCards(g.hands[turn], g.trick);
      const before = g.hands[turn].slice();
      const trickBefore = g.trick.slice();
      if (opts.onDecision) opts.onDecision(g, turn);
      const c = who[turn](g, turn);
      if (!c || !legal.includes(c)) throw new Error(`Kural dışı kart: ${turn} el ${t + 1}`);
      if (seen.has(c.id)) throw new Error(`Aynı kart iki kez oynandı: ${c.id}`);
      seen.add(c.id);
      // Savunmacıların o an görebildiği bilgi (ölçütler bu bilgiye göre hesaplanır)
      const view = opts.views && (turn === 'E' || turn === 'W') ? E.buildView(g, turn) : null;
      log.push({ trickNo: t, pos: k, seat: turn, card: c, hand: before, trick: trickBefore, legal, view });
      g.hands[turn].splice(g.hands[turn].indexOf(c), 1);
      g.trick.push({ seat: turn, card: c });
      g.dummyOpen = true;
      turn = E.nextSeat(turn);
    }
    const winner = E.trickWinner(g.trick, g.trump);
    g.history.push({ plays: g.trick.slice(), winner });
    for (const l of log.slice(-4)) l.winner = winner, l.fullTrick = g.trick.slice();
    if (winner !== E.trickWinner(g.trick, g.trump)) throw new Error('El kazananı tutarsız');
    if (winner === 'N' || winner === 'S') g.tricksNS++; else g.tricksEW++;
    g.trick = [];
    turn = winner;
  }
  if (seen.size !== 52) throw new Error('52 kartın hepsi oynanmadı');
  if (Object.values(g.hands).some(h => h.length)) throw new Error('Elde kart kaldı');
  if (g.tricksNS + g.tricksEW !== 13) throw new Error('El toplamı 13 değil');
  return { tricksNS: g.tricksNS, tricksEW: g.tricksEW, log, history: g.history };
}

// Basit test çatısı (ek paket gerektirmez)
function makeRunner(title) {
  let pass = 0, fail = 0;
  const failures = [];
  return {
    check(name, ok, detail) {
      if (ok) pass++; else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
    },
    done() {
      console.log(`\n${title}: ${pass} geçti, ${fail} kaldı`);
      failures.forEach(f => console.log('  ✗ ' + f));
      return fail === 0;
    }
  };
}

module.exports = { loadEngine, mulberry32, parseHand, card, cardName, players, playDeal, newGameState, makeRunner };
