# _scratch — ham envanter notlari

BU DOSYA BICIMLENDIRILMEDI. Karar 10 geregi `ali-yetenek-envanteri.md` iptal
edildi, bulgular kaybolmasin diye buraya oldugu gibi dokuldu. Kimseye
gosterilmek icin degil. Ihale efor tahmininde referans olarak kullanilacak.
Tarih: 2026-07-29. Kaynak: 2026-07 denetimi, branch emlak-demo @ 82a607f.

---

## kapsam
- ana repo /Users/macair/ali-sales-ai-panel, branch emlak-demo (prod soyu), 115 commit, 169 TS/TSX ~= 23.4k satir
- ikinci repo /Users/macair/ali-kontrol-kulesi, Next 16, ~10 dosya, entegrasyon saglik ekrani
- backend/worker repo YOK. veri = Airtable REST, is akisi = n8n (VPS docker-compose, src/infra/n8n/)

## en kritik 3 guclu yan
1. multi-tenant gate gercek ve test edilmis — src/lib/tenant-guard.ts:9-36 (host->tenant exact map, prod'da client sinyali reddedilir) + birim testi tenant-guard.test.ts. her API route ayrica getTenantConfigFromRequest() cagiriyor.
2. kural tabanli aciklanabilir oneri motoru — src/lib/kampanya.ts (30k) segment->kaldirac->mesaj kural tablolari + guven skoru kirilimi; stok-sinyal.ts deterministik (Math.random yasak). Gratis'in kosul->aksiyon ihtiyacina en yakin iskelet.
3. calisan kanban + izolasyon + rapor katmani — dnd-kit, optimistic move + undo, satir-seviye "baskasinin kaydi" kontrolu (api/kanban/move/route.ts:57-60), i18n TR/EN.

## en kritik 3 eksik
1. GOREV MOTORU YOK. /gorevler /takvim /teklifler /policeler /yenilemeler /komisyonlar /ali-onerileri /ali-uyarilar — hepsi 13 satirlik "Yakinda" stub. tek state machine = kanban'in 7 asamasi ve KODA GOMULU (airtable.ts:41-51). SLA/deadline/recurring/evidence yok.
2. bildirim & whatsapp katmani panelde hic yok. kanal-agnostik motor yok, resend kurulu ama kullanilmiyor. whatsapp = n8n'de 360Dialog (BSP) — kanit sadece src/infra/n8n/wa-number-validation-node.js:5. interaktif buton, inbound webhook handler, 24 saat penceresi, template yonetimi: repoda sifir. webhook ALMA altyapisi (imza dogrulama/replay) hic yok.
3. gercek zamanlilik ve dayaniklilik yok. websocket/SSE yok, queue/event bus yok, idempotency/retry/DLQ yok. Airtable 429 dogrudan kullaniciya hata olarak donuyor (kanban/move:78). Airtable time-series icin yapisal olarak uygun degil (fetchAllRecords sayfa basina 220ms bekliyor, airtable.ts:102).

## diger onemli bulgular (konu | durum)
- hiyerarsi (org->bolge->sube) | YOK — sadece tenant -> duz temsilci listesi (tenants.ts:173). yeni seviye = sema + kod
- migration altyapisi | YOK — Airtable'da alan elle aciliyor
- RBAC | 4 rol + 13 ekran KODDA ENUM (yetki.ts:11-20,70-83). KisiBazliOverride tipi var, hic doldurulmuyor -> YARIM
- rol bazli menu | YOK — sidebar tenant modul flag'ine bakiyor, role degil (sidebar.tsx:511)
- audit log | YOK (aktivite logu is kaydi; ustelik admin SILEBILIYOR -> append-only degil)
- LLM | panelde dogrudan cagri yok; /api/ali-chat n8n'e POST (route.ts:58). tool calling X, RAG X, konusma gecmisi X, streaming X
- /api/ali-chat + /api/emlak-segment AUTH'SUZ | middleware /api/* i public yapiyor, bu iki route kendi kontrolunu yapmiyor
- rapor export | PDF/Excel/CSV kutuphanesi yok; "Disa Aktar" butonlari BAGLI DEGIL (musteriler-client.tsx:436)
- tema/white-label | renkler ~30-45 dosyada dosya-ici sabit (sidebar.tsx:22, page.tsx:26-44, ali-zeka.ts Z). IKI AYRI SIDEBAR implementasyonu. white-label = sadece logo+isim
- responsive | zayif — toplam 54 responsive utility; .emlak-shell sabit 256px grid, media query yok (globals.css:138) -> mobilde bozuk. mobil app yok
- video/RTSP/HLS/vision | SIFIR — tek eslesme broker materyal ikonu. bagimlilik yok
- upload/storage | YOK — S3/GCS/presigned/multipart hic yok
- CI/CD | YOK (.github yok). 5 adet tsx assertion scripti var, CI'da kosmuyor. API/UI/auth testi yok
- monitoring | Sentry yok, console.error. Kontrol Kulesi = manuel 7'li saglik pingi (health.ts)
- on-premise | bugun mumkun degil — Clerk + Airtable + Vercel sert SaaS bagimliligi

## uyari isaretleri (YARIM / borc)
- next.config.mjs: typescript: { ignoreBuildErrors: true } + IKI next.config dosyasi birden
- 20+ dosyada commitlenmemis degisiklik (i18n isi, 20 Tem — son commit 13 Tem)  [NOT: 2026-07-29'da i18n-wip branch'ine commitlendi + push edildi, e6e67dd]
- broker store BELLEK-ICI, serverless'ta sifirlanir (broker/store.ts:6-8); BROKER_DEMO_CLERK_ID yorumda var kodda yok -> getCurrentBroker() hep null doner
- takip edilen olu dosyalar: _middleware.ts, src/proxy 2.ts, src/.next 2/, kok components/+lib/ (Supabase prototipi), src/Ali-siteklasor (landing HTML src icinde)
- demodaki "isi"/talep/goruntulenme rakamlari SENTETIK — stok-sinyal.ts:7-9 kendi dosya basliginda "dogrulanmamis veri, mutabakat gerekir" diyor

## domain sizintisi (src/app+lib+components, 164 dosya — kelime/dosya sayisi)
broker 611/43 · temsilci 390/44 · stok 336/52 · firma 321/31 · emlak 247/42 · musteri 240/59 · proje 219/38 · kampanya 181/35 · brans 142/17 · daire 125/28 · vade 102/19 · komisyon 100/28 · sigorta 47/16 · police 20/8

cekirdek entity isimleri bile domain'e gomulu — Firma/Temsilci/Brans/Vade -> Gratis'te Magaza/Personel/Kategori/Vardiya. kaba tahmin: 50-60 dosyada rename + soyutlama.
=> BU, "kopyala import etme" izolasyon kuralinin gerekcesi. mevcut lib'i Gratis'e uyarlamak yeniden yazmakla ayni maliyet.

## sprint 0 demo akisinin durumu (adim | karsilik)
- dis olay girisi | YOK — webhook alma altyapisi sifir. sifirdan /api/olay
- panelde alarm karti | KISMEN — StatTile/InsightTile var, alarm listesi yok
- whatsapp interaktif buton | YOK — n8n'de 360Dialog var ama buton/handler yok
- buton yanitini yakalama | YOK
- gorev durumu degisimi | KISMEN — kanban PATCH var ama gorev entity'si yok
- panel gercek zamanli guncelleme | YOK — polling ile taklit edilir

---

## denetim sonrasi, Gun 1'de ek olarak bulunanlar (2026-07-29)

- Next 16'da gercek middleware dosyasi src/proxy.ts. kok _middleware.ts olu legacy. prompt'taki "middleware.ts" referansi yanlisti, duzeltildi (karar 11).
- src/proxy.ts:66-68 matcher zaten catch-all negative lookahead. /storeos ve /api/storeos ONCEDEN eslesiyor -> matcher degisikligine GEREK YOK. planlanan 3 istisnadan 1'i dustu.
- src/proxy.ts:4-9 isPublic: /login(.*) /register(.*) /api/(.*) /broker/kayit(.*). /api/* public olmasi Store OS icin ISTENEN davranis (route kendi auth'unu yapiyor).
- src/proxy.ts:45 her authed istekte requestHeaders.delete('x-tenant-id') — client tenant forge edemez.
- public/decks/*.html (9 Babacan sunumu) middleware matcher'indan MUAF (proxy.ts:68 'decks/') -> HER host'tan auth'suz servis ediliyor, Gratis host'u dahil. cozum: Vercel proje-seviyesi build command override `rm -rf public/decks && next build`. repo degismedi.
- src/app/layout.tsx:63 signInFallbackRedirectUrl="/" sabit -> Gratis kullanicisi giris sonrasi / -> tenant yok -> /login -> DONGU. temiz cozum /storeos/giris + proxy.ts isPublic'e bir satir = onay bekliyor.
- emlak-demo'da 18 push edilmemis commit vardi (Broker OS, ali-chat, 2 guvenlik commit'i dahil, 94d4ace cross-tenant x-tenant-id injection reddi). i18n-wip push'u ile GitHub'a dolayli yedeklendi ama emlak-demo hala origin'in gerisinde.
- tenant-guard lokal probe sonucu (tsx ile gercek fonksiyon cagrildi):
    gratis host + sinyal yok -> null
    gratis host + forge x-tenant-id=emlak_demo -> null
    gratis host + forge sigortan_biz -> null
    ham *.vercel.app + forge -> null
    kontrol: emlak.alisales.ai -> emlak_demo
  => izolasyon mekanizma seviyesinde dogru. sayfalar 307 -> /login (403/404 degil), API'ler 403.
- package.json onaylı istisna listesinde DEGIL -> Store OS icin npm script eklenemez, araclar dogrudan cagriliyor (node scripts/... / npx tsx scripts/...).
- .gitignore:34 `.env*` -> .env.example takip edilmiyor. kanonik kopya olarak docs/gratis/storeos-env.md onerildi, .gitignore'a dokunulmadi.
