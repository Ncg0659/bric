// Bütün Node testlerini sırayla çalıştırır. Kullanım: node tests/calistir.js
// (Tarayıcı testi ayrı: node tests/arayuz.smoke.js — Playwright gerekir)
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const files = ['kurallar.test.js', 'koruma.test.js', 'pozisyonlar.test.js', 'gizli-bilgi.test.js',
  'kararlilik.test.js', 'dagitim.test.js'];
let ok = true;
for (const f of files) {
  try { execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' }); }
  catch (e) { ok = false; }
}
console.log(ok ? '\nBÜTÜN TESTLER GEÇTİ' : '\nBAZI TESTLER KALDI');
process.exit(ok ? 0 : 1);
