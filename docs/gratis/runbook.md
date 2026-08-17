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

**ÖLÇÜM (17 Ağu, canlı katman 2 sn iken — yani iyileştirme ÖNCESİ):**

| Açık sekme | Anketin sürekli yükü | Zincire kalan | Olay → telefon |
|---|---|---|---|
| 1 sekme | 2.17 istek/sn | 1.83 istek/sn | ~13 sn |
| 3 sekme | 2.97 istek/sn | 1.03 istek/sn | **~23 sn** |
| hiç sekme yok (izole) | — | 4 istek/sn | 6.8 sn |

Kabul kriteri tavanı 15 sn. Üç sekme açıkken zincir bu tavanı **aşıyor** —
jüri telefona bakarken 23 saniye beklemek demonun en ayrıştırıcı anını siler.

Bu ölçümden sonra iki iyileştirme yapıldı (denetim satırlarının tek POST'ta
toplanması + canlı katmanın 4 sn'ye çekilmesi). **Tablo henüz güncellenmedi:**
yeniden ölçüm, görev ekranının anketi 3 sn'ye indikten SONRA yapılacak — aksi
hâlde aynı ölçüm iki kez yapılmış olur. Yeniden ölçüm yapılana kadar buradaki
sayılar iyileştirme öncesine aittir; **kural yine de geçerlidir**, çünkü sekme
sayısı bütçeyi doğrusal olarak böler.

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
