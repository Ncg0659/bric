# Aşama 2.1 — kaldığımız yer (23 Kasım 2026)

Tamamlanan:
- Yeni Zor savunma botu (index.html: buildView, tableMemory, botHardDefense, chooseBotCard). Yalnızca Doğu/Batı + Zor.
- Eşsiz modda Kuzey, Orta ve Kolay botlar değişmedi (tests/koruma.test.js ile doğrulanıyor).
- Testler: node tests/calistir.js (hepsi geçti), node tests/arayuz.smoke.js (geçti), node tests/karsilastirma.js (rapor).
- Ön sonuç (4.050 dağıtım): savunma eli 4,34 → 4,77; batırma %47,4 → %55,1; As altından açılış %13,3 → %0; üçüncü elde kaptırma %10,6 → %3,8.

Kalan:
1. node tests/karsilastirma.js 2 ile son karşılaştırma (tests/sonuclar/karsilastirma.md).
2. Pull Request açmak (birleştirmeden).
3. Seviye 7–10'un zorlaşması kullanıcıya sorulacak (seviye ayarına dokunulmadı).
