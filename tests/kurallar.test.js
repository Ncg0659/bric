// Temel briç kuralları: renge uyma, koz, Sanzatu, eli kim alır
'use strict';
const M = require('./lib/motor');
const E = M.loadEngine(1);
const t = M.makeRunner('Kural testleri');
const C = M.card;
const play = (...xs) => xs.map(x => { const [seat, c] = x.split(':'); return { seat, card: C(c) }; });

// legalCards
const hand = M.parseHand('S:A5 H:KQ2 D:- C:T9');
t.check('Açılışta bütün kartlar oynanabilir', E.legalCards(hand, []).length === 7);
t.check('Açılan renk eldeyse yalnızca o renk', E.legalCards(hand, play('W:H5')).every(c => c.suit === 'H'));
t.check('Açılan renk elde yoksa bütün kartlar', E.legalCards(hand, play('W:D5')).length === 7);

// trickWinner
t.check('Kozsuz: açılan rengin en büyüğü alır', E.trickWinner(play('W:H5', 'N:HK', 'E:H2', 'S:SA'), null) === 'N');
t.check('Koz kesen alır', E.trickWinner(play('W:H5', 'N:HK', 'E:S2', 'S:H3'), 'S') === 'E');
t.check('Üstten koz kesen alır', E.trickWinner(play('W:H5', 'N:S3', 'E:S9', 'S:H3'), 'S') === 'E');
t.check('Başka renk atan alamaz', E.trickWinner(play('W:H5', 'N:DA', 'E:CA', 'S:H3'), 'S') === 'W');
t.check('Koz açıldıysa en büyük koz alır', E.trickWinner(play('W:S5', 'N:SQ', 'E:SK', 'S:S2'), 'S') === 'E');
t.check('Yarım elde önde olan doğru', E.trickWinner(play('W:H5', 'N:H9'), 'S') === 'N');
t.check('Sanzatu\'da maça koz sayılmaz', E.trickWinner(play('W:H5', 'N:SA', 'E:H6', 'S:H2'), null) === 'E');

// Yardımcılar
t.check('Saat yönü: Kuzey → Doğu', E.nextSeat('N') === 'E' && E.nextSeat('W') === 'N');
t.check('Ortaklar', E.partnerOf('N') === 'S' && E.partnerOf('E') === 'W');
t.check('Gereken el: 4♠ → 10', E.tricksNeeded({ level: 4, suit: 'S' }) === 10);
t.check('Sanzatu kozsuz', E.trumpOf({ level: 3, suit: 'NT' }) === null);
t.check('Puan: AKQJ = 10', E.hcp(M.parseHand('S:AKQJ')) === 10);

// Deste ve dağıtım
const deck = E.createDeck();
t.check('Deste 52 farklı kart', deck.length === 52 && new Set(deck.map(c => c.id)).size === 52);
const h = E.dealHands(E.shuffle(deck));
t.check('Her oyuncuya 13 kart', ['N', 'E', 'S', 'W'].every(s => h[s].length === 13));

module.exports = t.done();
if (require.main === module) process.exit(module.exports ? 0 : 1);
