# Store OS — Sunum Runbook'u

Prova ve jüri sunumu sırasında uyulacak kurallar. Her madde bir ölçüme veya
yaşanmış bir arızaya dayanır — "ihtiyaten" yazılmış madde yok.

Runbook'un tamamı Gün 9'da yazılacak (senaryo akışı, konuşma metni, arıza
planı). Bu dosya o güne kadar **kural biriktirir**.

---

## Ortam kuralları

### R-1 · TEK SEKME KURALI (zorunlu)

**Prova ve sunum sırasında tek tarayıcı sekmesi açık olacak. İkinci bir
Store OS sekmesi (pano, görev listesi, demo kontrol paneli) AÇILMAYACAK.**

Gerekçe — ölçülmüş (17 Ağu 2026, `scripts/storeos/istek-butcesi.ts`):

Airtable transportu kendini **4 istek/sn** ile sınırlıyor ve bu bütçe süreç
başına TEK bir kuyruktan paylaşılıyor. Yani panonun anketi ile olay zinciri
(olay → kural → görev → WhatsApp) aynı bütçeden yiyor.

**ÖLÇÜM 1 (17 Ağu, canlı katman 2 sn · görev anketi 10 sn — iyileştirme ÖNCESİ):**

| Açık sekme | Anketin sürekli yükü | Zincire kalan | Olay → telefon |
|---|---|---|---|
| 1 sekme | 2.17 istek/sn | 1.83 istek/sn | ~13 sn |
| 3 sekme | 2.97 istek/sn | 1.03 istek/sn | **~23 sn** |
| hiç sekme yok (izole) | — | 4 istek/sn | 6.8 sn |

**ÖLÇÜM 2 — YENİDEN ÖLÇÜM (18 Ağu 2026, 03:18 TRT · PROD'dan · canlı katman
4 sn · görev anketi 3 sn).** Kaynak: `GET /api/storeos/olcum?tur=4`
(store-os-two.vercel.app, deployment `store-88uak9zxc`). Yerelden DEĞİL —
sayılar Airtable transportunun kendi istek sayacından geliyor.

| Açık ekran | Sürekli anket yükü | 5 istek/sn'ye marj | Limiti aşar mı |
|---|---|---|---|
| yalnız pano (R-1 kuralı) | **1.17 istek/sn** | **3.83 istek/sn** | hayır |
| yalnız görevler (3 sn anket) | 0.67 istek/sn | 4.33 istek/sn | hayır |
| pano + görevler | 1.83 istek/sn | 3.17 istek/sn | hayır |
| pano + üç liste (kural ihlali, en kötü hâl) | 2.50 istek/sn | 2.50 istek/sn | hayır |

70 isteklik ölçüm turunda **429 (hız sınırı) sayısı: 0**.
Tur başına istek: pano canlı 4 · pano yavaş 5 · alarmlar 3 · görevler 2 ·
denetim 1. Soğuk ve sıcak turlar arasında istek sayısı DEĞİŞMİYOR (önbellek
istek düşürmüyor), süre değişiyor.

**ÖLÇÜM 3 — Olay → telefon (aynı koşu, gerçek WhatsApp hattı, kanal=whatsapp):**

| Koşu | Süre | Kapsam |
|---|---|---|
| ilk olay (soğuk lambda) | **11.9 sn** | olay → kural → görev → bildirim → n8n → 360dialog kabul |
| sıcak koşu #2 | 5.2 sn | aynı zincir |
| sıcak koşu #3 | 6.6 sn | aynı zincir |
| sıcak koşu #4 | 6.7 sn | aynı zincir |
| kuralsız olay (faz 2 — görev/bildirim YOK) | 1.95 sn | yalnız olay yazımı + kural değerlendirme + denetim |

Okuma: zincirin **~2 sn'si** olay/kural/denetim, kalan **~3–5 sn'si** görev +
bildirim yazımı ve WhatsApp bacağı. Kabul kriteri tavanı 15 sn — **sıcak koşu
tavanın çok altında (5–7 sn), soğuk koşu bile altında (11.9 sn)**.
Provada ilk olayı sunumdan önce bir kez tetikle: soğuk lambda maliyeti jüri
karşısında değil, ısınma turunda ödensin.

**ÖLÇÜM 4 — Buton basımı → panelde yansıma:**

| Bacak | Ölçüm |
|---|---|
| WhatsApp yanıtının sunucuda uygulanması (3 koşu) | **2.48 · 2.53 · 2.48 sn** |
| görev ekranı anket beklemesi | ortalama +1.5 sn · en kötü +3 sn |
| **toplam (görev ekranı açıkken)** | **~4 sn tipik · ~5.5 sn en kötü** |
| pano açıkken (canlı katman 4 sn) | ~4.5 sn tipik · ~6.5 sn en kötü |
| panelin KENDİ düğmesine basan kişinin ekranı | **anında** (iyimser UI; sunucu onayı arkada) |

Not: 2.5 sn'lik bacak `/api/storeos/demo` üzerinden simüle edilmiş buton
basımıdır — yani 360dialog → n8n gelen bacağı bu sayının DIŞINDADIR. Telefonda
gerçek düğmeye basıldığında üstüne sağlayıcı gecikmesi (tipik 1–2 sn) biner.

**R-1 NEDEN HÂLÂ GEÇERLİ.** ÖLÇÜM 1'de üç sekme açıkken zincir 15 sn tavanını
aşıyordu. İki iyileştirme (denetim satırlarının tek POST'ta toplanması + canlı
katmanın 4 sn'ye çekilmesi) ve görev anketinin 3 sn'ye inmesiyle marj genişledi:
en kötü hâlde bile 2.5 istek/sn boşta. Yine de kural KALKMIYOR — anket ile
zincir aynı kuyruktan yiyor, sekme sayısı bütçeyi doğrusal böler ve jüri
karşısında marjı sınamanın hiçbir faydası yok.

Pratikte:
- Sunum makinesinde başka Store OS sekmesi kalmadığını sunumdan önce doğrula.
- İkinci bir ekran gerekiyorsa (ör. telefonu yansıtmak) o ekranda **panel
  açma** — yalnız WhatsApp göster.
- Demo kontrol paneli (`/storeos/demo-kontrol`) kullanılacaksa aynı sekmede
  aç, ikinci sekmede değil.

İlgili: `src/components/storeos/use-pano.ts` (`ARALIK.canli = 4 sn`),
`src/lib/storeos/airtable.ts` (`SANIYEDE_ISTEK = 4`).

> Not: sekme arka plana alınınca anket **durur** (use-pano bütçe koruması).
> Yani "açık ama görünmeyen" sekme yük bindirmez — riski yaratan, aynı anda
> **görünür** olan ikinci pencere / ikinci ekrandır.

---

## Demo kontrol paneli — `/storeos/demo-kontrol`

Sunum sırasında terminal AÇILMAZ. Panelin yaptığı her şey buradan tek tıkla
yapılır. Ekran yalnız **yöneticiye** açıktır (`STOREOS_ADMIN_CLERK_IDS`, liste
boşsa `Kullanicilar.Rol = merkez`); menüdeki bağlantı da yalnız merkez rolünde
görünür — ama asıl kapı sunucudadır, gizlenen bağlantı güvenlik değildir.

### Prova sabahı sırası (ölçülmüş süreler)

| # | Düğme | Ne yapar | Süre |
|---|---|---|---|
| 1 | **Taze tohum yaz** (etiket ver: `prova1`) | Açılış tablosunu O ANIN saatiyle yeniden yazar — donmuş zaman damgası sorununu bu çözer | **~18 sn** (5 olay, Airtable) |
| 2 | **Kuyruk artışı** (ısınma turu) | Soğuk lambda maliyetini jüriden önce öder | ~12 sn ilk, sonra 5–7 sn |
| 3 | WhatsApp sağlık göstergesi | webhook/token tanımlı mı, kilit hedefi kim, son gönderimler | anında |

### Sunum sırasında

- **Senaryo düğmeleri:** Kuyruk artışı · Kamera offline (faz 1 — görev doğar),
  Raf stok düştü · İSG ıslak zemin (faz 2 — bilinçli kuralsız, "her olay görev
  doğurmaz" mesajı). "Vendor biçimi" kutusu adapter kanıtı içindir.
- **Aynı olayı tekrar gönder:** idempotency'yi canlı gösterir — ikinci gönderim
  `yinelenen` döner, ikinci görev doğmaz.
- **WhatsApp yanıtını simüle et:** canlı hat düşerse zincir yine kapanır. Görev
  no + aksiyon seç, panel değişimini ekranda göster.

### SIFIRLAMA — bilinçli olarak YOK

"Depoyu sıfırla" düğmesi Airtable deposunda **409 döner ve hiçbir şey silmez.**
Sebep tasarımdır: `depo/airtable.ts:sifirla()` uygulama içinden silmeyi
reddeder, denetim defteri append-only'dir. Bunu zayıflatmak, "kayıt silinebilir
mi" sorusuna yanlış cevap verirdi.

Zaman damgası donmasını çözen şey **Taze tohum**tur: eski parti silinmez, yeni
parti o anın saatiyle yazılır, pano zaten en yeni 20 alarmı gösterir. Depoyu
gerçekten sıfırlamak gerekirse tek yol terminaldir ve prova sabahına ait bir iş
değildir: `npx -y tsx scripts/storeos/seed.ts --sifirla --yaz`.

### Telefon kilidi

Kilit **AÇIK** kalır. `Kullanicilar.Telefon` artık gerçek E.164 numara taşıyor
(placeholder `+9000000000X` Gün 8'de kaldırıldı) ama gönderim yine yalnız
`STOREOS_DEMO_TELEFON`'a düşer; kayıtta sahip numarası korunur, fiilen gidilen
numara `Gonderilen Telefon` alanına yazılır. Sağlık göstergesi kilidin hedefini
maskeli gösterir — kilit kapalıysa panel bunu **sorun** olarak listeler.
