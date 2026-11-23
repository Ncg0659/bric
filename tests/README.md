# Briç Masası testleri

Testler ek paket gerektirmez, yalnızca Node ile çalışır. Kural ve bot kodunu doğrudan `index.html`'den okurlar,
yani her zaman oyunun gerçekten kullandığı kodu denerler.

| Komut | Ne yapar |
|---|---|
| `node tests/calistir.js` | Bütün Node testlerini sırayla çalıştırır |
| `node tests/karsilastirma.js` | Eski ve yeni Zor botu aynı dağıtımlarda karşılaştırır, `tests/sonuclar/karsilastirma.md` dosyasını yazar (`2` yazarsanız iki kat örnek) |
| `node tests/arayuz.smoke.js` | Gerçek tarayıcıda oyunu oynatır (Playwright gerekir, ücretsiz) |

## Test dosyaları

- `kurallar.test.js` — renge uyma, koz, Sanzatu, eli kim alır, deste ve dağıtım
- `koruma.test.js` — Kolay, Orta ve eski Zor bot, kurallar, seviyeler ve ayar kodu Aşama 1 sürümüyle aynı mı
- `pozisyonlar.test.js` — yeni Zor savunma botu için sabit açılış, ikinci el, üçüncü el, atış ve hafıza pozisyonları
- `gizli-bilgi.test.js` — bot gizli kartları göremiyor; gizli eller değişince kararı değişmiyor
- `kararlilik.test.js` — 35 kontrat ve 4 bot ile binlerce oyun: kural dışı hamle, kayıp ya da tekrar kart yok
- `dagitim.test.js` — seviye dağıtımlarının süresi ve koşulu
- `lib/motor.js` — ortak yardımcılar: kodu yükleme, tohumlu dağıtım, oyunu baştan sona oynatma
