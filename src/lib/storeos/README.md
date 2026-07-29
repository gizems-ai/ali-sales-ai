# Store OS — izolasyon sözleşmesi

Gratis ihale demosu. Bu ağaç mevcut sigorta/emlak panelinden **tamamen izoledir.**

## Kural: kopyala, import etme

Store OS kodu yalnızca şuralarda yaşar:

| Yol | İçerik |
|---|---|
| `src/app/storeos/` | Sayfalar |
| `src/app/api/storeos/` | API route'ları |
| `src/lib/storeos/` | İş mantığı |
| `src/components/storeos/` | Bileşenler |
| `scripts/storeos/` | CLI araçları (simülatör, seed, denetçi) |

Bu dosyalar **yalnızca** şunlardan import edebilir:

1. `node_modules` (bare specifier: `react`, `next/server`, `@clerk/nextjs`, …)
2. `@/lib/storeos/*`, `@/components/storeos/*`, `@/app/storeos/*`
3. Yukarıdaki köklerin içinde kalan göreli yollar

**Yasak:** `@/lib/airtable`, `@/lib/tenants`, `@/lib/yetki`, `@/components/panel/*` ve
benzeri her şey. İhtiyacın olan parçayı buraya **kopyala** ve domain'den arındır.
Kopyalanan her dosyanın başında `// Kaynak: <yol> — Store OS için kopyalandı,
senkronize değildir` satırı olmalıdır.

## Denetim

```bash
node scripts/storeos/import-denetci.mjs
```

Çıkış kodu 0 = temiz, 1 = ihlal var. Her gün sonunda çalıştırılır.

## Store OS dışına yapılan dokunuşlar (onaylı istisnalar)

| Dosya | Neden | Durum |
|---|---|---|
| `src/proxy.ts` | `/storeos` + `/api/storeos` matcher'ı | Gün 1 |
| `src/app/globals.css` | `.storeos-root` scope'lu blok | Gün 6 |
| `.env.example` | Yeni değişkenlerin belgelenmesi | Gün 1 |
| `src/app/api/ali-chat/route.ts` | Route-içi auth (mevcut açık) | Gün 9'a ertelendi |
| `src/app/api/emlak-segment/route.ts` | Route-içi auth (mevcut açık) | Gün 9'a ertelendi |

Bu listede olmayan hiçbir mevcut dosya değiştirilmez.
