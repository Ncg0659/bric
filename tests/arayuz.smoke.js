// Arayüz duman testi (gerçek tarayıcı). Playwright gerekir: npx playwright (ücretsiz).
// Oyunun hızlandırılmış bir kopyasını geçici klasörde açar; index.html'e dokunmaz.
// Kullanım: node tests/arayuz.smoke.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const M = require('./lib/motor');
const t = M.makeRunner('Arayüz duman testi');

(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')
    .replace('const BOT_DELAY = 1000', 'const BOT_DELAY = 5')
    .replace('const COLLECT_DELAY = 1500', 'const COLLECT_DELAY = 5');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bric-')), 'index.html');
  fs.writeFileSync(file, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + file);

  async function playOut() {
    for (let i = 0; i < 800; i++) {
      if (await page.isVisible('#result')) return true;
      const c = await page.$('button.playable');
      if (c) await c.click().catch(() => {});
      await page.waitForTimeout(10);
    }
    return false;
  }
  // 1) Serbest oyun, Zor rakipler, eşli, 4♠
  await page.click('#play-serbest'); await page.click('[data-diff="zor"]'); await page.click('#mode-esli');
  await page.click('[data-level="4"]'); await page.click('[data-suit="S"]'); await page.click('#start');
  t.check('Serbest / Zor / eşli oyun sonuna kadar oynanıyor', await playOut());
  const score = await page.textContent('#score');
  const m = score.match(/Biz: (\d+) \/ Onlar: (\d+)/);
  t.check('El sayacı toplamı 13', m && Number(m[1]) + Number(m[2]) === 13, score);
  // 2) Eşsiz mod, Zor, Sanzatu (Kuzey eski Zor botla oynar)
  await page.click('#result-settings'); await page.click('#mode-essiz'); await page.click('[data-suit="NT"]'); await page.click('#start');
  t.check('Serbest / Zor / eşsiz Sanzatu sonuna kadar oynanıyor', await playOut());
  // 3) Oyun ortasında ayarlara dönünce bekleyen bot hamleleri iptal olur
  await page.click('#result-settings'); await page.click('#mode-esli'); await page.click('#start');
  await page.waitForTimeout(30);
  await page.click('#to-settings');
  await page.waitForTimeout(200);
  t.check('Ayarlara dönüş: oyun ekranı kapalı kalıyor', await page.isHidden('#game'));
  // 4) Seviye modu ve kayıtlı ilerleme
  await page.evaluate(() => localStorage.setItem('bric-ayarlar', JSON.stringify({ play: 'seviye', mode: 'esli',
    difficulty: 'orta', contract: { level: 4, suit: 'S' }, progress: 6, back: 3 })));
  await page.reload();
  t.check('Kayıtlı ilerleme okunuyor (Seviye 7)', (await page.textContent('#level-title')).trim() === 'Seviye 7');
  await page.click('#start');
  t.check('Seviye 7 (Zor rakipler) sonuna kadar oynanıyor', await playOut());
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('bric-ayarlar')));
  t.check('Kart arkası ve ayarlar korunuyor', saved.back === 3 && saved.play === 'seviye');
  t.check('Sayfada hata yok', errors.length === 0, errors.join(' | '));
  await browser.close();
  process.exit(t.done() ? 0 : 1);
})();
