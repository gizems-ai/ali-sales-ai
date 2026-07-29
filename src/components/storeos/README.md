# src/components/storeos/

Store OS bileşenleri. Gün 6'da doldurulacak (tema + kartlar + KPI + grid).

İzolasyon kuralı: buradaki hiçbir dosya `@/components/ui/*`, `@/components/panel/*`
veya başka bir panel bileşenini import edemez. Ortak görünen bir şeye ihtiyaç
olursa **kopyalanır**. Bkz. `src/lib/storeos/README.md`.

Renkler bileşene gömülmez — hepsi `src/lib/storeos/tema.ts` + `.storeos-root`
CSS değişkenlerinden gelir (madde 9).
