# Gratis ihalesi sonrası backlog

Demo sırasında bilinçli olarak ertelenen işler. Demo kazanılırsa gerçek çekirdeğe
geçmeden önce kapatılacak.

| # | Konu | Kanıt | Neden ertelendi |
|---|---|---|---|
| 1 | `emlak_demo` tenant'ında metadata'sız her authenticated kullanıcı **admin** oluyor | `src/lib/yetki.ts:149-156` | Auth mantığına dokunmak 169 dosyalık regresyon riski. Store OS ayrı Clerk instance kullandığı için demo açısından risk kapalı. Ürünleşmede düzeltilecek. |
| 2 | `public/decks/*.html` (9 Babacan sunumu) **auth'suz servis ediliyor** ve middleware matcher'ından muaf | `src/proxy.ts:66-68` | Repo aynı olduğu için Gratis deployment'ından da erişilebilir. Demo için Vercel proje-seviyesi build komutuyla kırpılıyor (bkz. `vercel-clerk-kurulum.md`), kalıcı çözüm decks'i `public/` dışına almak. |
| 3 | `/broker/kayit` middleware'de public | `src/proxy.ts:8` | Gratis host'undan Babacan broker kayıt formu render olabilir. Veri sızıntısı değil, marka sızıntısı. Aynı build-komutu yöntemiyle veya route guard'la kapatılır. |
| 4 | `next.config.mjs` içinde `typescript.ignoreBuildErrors: true` + iki adet next.config dosyası | `next.config.mjs` | Store OS namespace'i ayrıca `tsc --noEmit` ile kontrol ediliyor; global bayrağa güvenilmiyor. |
| 5 | `emlak-demo` branch'inde **18 adet push edilmemiş commit** (Broker OS, ali-chat, iki güvenlik düzeltmesi dahil) | `git log origin/emlak-demo..emlak-demo` | Yalnız bu dizüstünde duruyor. `i18n-wip` push'u ile GitHub'a yedeklendi ama `emlak-demo` hâlâ geride. |
| 6 | `/api/ali-chat` ve `/api/emlak-segment` route-içi auth kontrolü yok | `src/app/api/ali-chat/route.ts:28` | Gün 9'a planlandı (karar 6). Kritik yolda değil ama demo öncesi kapatılacak. |
| 7 | `getCurrentBroker()` daima null döner — `BROKER_DEMO_CLERK_ID` yorumda geçiyor, kodda okunmuyor | `src/lib/broker/current.ts:10` | Store OS kapsamı dışı. |
| 8 | Store OS `DenetimKaydi` append-only'u yalnız kodda garanti | `src/lib/storeos/tipler.ts` | Airtable şema-seviyesi kısıt sunmuyor. Gerçek üründe append-only DB tablosu + DB izniyle çözülür. |
