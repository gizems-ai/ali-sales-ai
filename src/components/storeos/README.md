# src/components/storeos/

Store OS bileşenleri.

İzolasyon kuralı: buradaki hiçbir dosya `@/components/ui/*`, `@/components/panel/*`
veya başka bir panel bileşenini import edemez. Ortak görünen bir şeye ihtiyaç
olursa **kopyalanır**. Bkz. `src/lib/storeos/README.md`.

Renkler bileşene gömülmez — hepsi `src/lib/storeos/tema.ts` + `.storeos-root`
CSS değişkenlerinden gelir (madde 9). `globals.css` içindeki Store OS bloğunun
tamamen kapsanmış olduğunu `scripts/storeos/css-denetci.mjs` doğrular.

## Dosyalar

| Dosya | Ne | İstemci mi |
|---|---|---|
| `kabuk.tsx` | Yan menü + içerik alanı | hayır |
| `pano.tsx` | Panonun TEK istemci bileşeni; veriyi `usePano()`'dan alır | **evet** |
| `use-pano.ts` | İki kademeli anket (canlı 2 sn / yavaş 30 sn) + kademe birleştirme | **evet** |
| `temel.tsx` | Kart, örnek-veri etiketi, boş/hata/iskelet durumları, biçimlendiriciler | hayır |
| `kartlar.tsx` | KPI ızgarası, alarm/görev/kamera/personel listeleri | hayır |
| `grafikler.tsx` | Saf SVG çizgi grafiği, ısı haritası, dağılım çubuğu | hayır |

## Kural: bileşenler aptaldır

Hiçbir bileşen `fetch` etmez, depo tanımaz, `Date.now()` çağırmaz. Veri
`DashboardVerisi` (`src/lib/storeos/dashboard/tipler.ts`) olarak props ile gelir;
tek toplu uç nokta `/api/storeos/dashboard`'dır. Yeni bir kart eklemek istek
sayısını artırmaz — `DashboardVerisi`'ne alan eklemek yeterlidir.

`veriTipi` alanı veriden gelir ve `demo` olan her değer `<OrnekVeri />` etiketi
taşır (madde 11). Bileşen bu kararı kendi vermez.
