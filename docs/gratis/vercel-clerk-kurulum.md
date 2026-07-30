# Store OS — Vercel projesi + Clerk instance kurulumu

Kurulumu **sen** yapacaksın. Her adımın sonunda doğrulama var; doğrulama
geçmeden sonrakine geçme.

Temel fikir: **aynı repo, ayrı Vercel projesi, ayrı Clerk instance, ayrı domain.**
Kodda hiçbir dallanma yok — izolasyon tamamen ortam değişkeni ve host seviyesinde.

---

## 1. Vercel projesi

1. Vercel → **Add New → Project** → aynı GitHub reposunu seç: `gizems-ai/ali-sales-ai`
   (Vercel "bu repo zaten bağlı" diyecek, **Create anyway** de.)
2. Proje adı: `ali-storeos`
3. **Settings → Git → Production Branch = `storeos-demo`**
   ⚠️ Varsayılan `main`'dir. Değiştirmezsen Gratis projesi emlak kodunu prod'a alır.
4. **Settings → Build & Development → Build Command → Override:**
   ```
   rm -rf public/decks && next build
   ```
   Bu, `public/decks/` altındaki 9 Babacan sunumunun Gratis domain'inden
   servis edilmesini engeller. Gerekçe: `src/proxy.ts:68` matcher'ı `decks/`
   yolunu auth middleware'inden **muaf tutuyor** — yani o dosyalar her host'tan
   auth'suz erişilebilir. Repo aynı olduğu için Gratis deployment'ı da onları
   içerir. Build komutu override'ı bunu **proje seviyesinde**, repoya
   dokunmadan çözer. (Kalıcı çözüm backlog #2.)
5. **Settings → Git → Ignored Build Step → Custom:**
   ```
   if [ "$VERCEL_GIT_COMMIT_REF" = "storeos-demo" ]; then exit 1; else exit 0; fi
   ```
   (Vercel'de `exit 1` = derle, `exit 0` = atla.) Bu olmadan Gratis projesi her
   `emlak-demo` push'unda da build alır.

### 1b. Ters yön — KARAR VERİLDİ: dokunma

`storeos-demo` branch'i GitHub'a gidince **mevcut `ali-sales-ai` Vercel projesi de**
bu branch için preview deployment üretir. O preview'da `VERCEL_ENV !== 'production'`
olduğu için `storeosHostuMu()` `true` döner ve `/storeos` açılabilir hale gelir.

Veri sızıntısı **yok** (Store OS env değişkenleri o projede tanımlı değil, Airtable
istemcisi ilk çağrıda hata verir), ama gereksiz build ve gereksiz yüzey.

**Karar (2026-07-30): hiçbir şey yapılmayacak.** Gürültü bedava, canlı projenin
build konfigürasyonunu kurcalamak değil. Preview'lar zararsız kalsın.

---

## 2. Domain

1. Vercel → `ali-storeos` → **Settings → Domains → Add**
2. Öneri: **`storeos.alisales.ai`**
   - Tire kullan, **alt çizgi kullanma** (Cloud API webhook alan adlarında alt
     çizgi ve port desteklenmiyor).
   - `PROD_HOST_MAP`'te (`src/lib/tenant-guard.ts:9-14`) **olmadığından emin ol** —
     olursa emlak/sigorta tenant'ı çözülür. Şu an listede değil, doğru.
3. DNS: `alisales.ai` sağlayıcında `CNAME storeos → cname.vercel-dns.com`
4. Domain bağlanınca **bana haber ver** — `src/lib/storeos/host-guard.ts:11`
   içindeki `STOREOS_PROD_HOSTLARI` listesine ekleyeceğim. Liste boş kaldığı
   sürece prod'da `/storeos` **404** döner (kasıtlı: yanlış domain'den asla açılmasın).

---

## 3. Clerk — ayrı instance

1. Clerk Dashboard → **Create application**
   - Ad: `Gratis Store OS`
   - Sign-in yöntemi: **yalnız Email + Password.** Google/OAuth açma —
     jüri hesaplarını biz açacağız, self-signup istemiyoruz.
2. **User & Authentication → Restrictions → Sign-up mode = `Restricted`**
   (emlak'ta da böyle yapılmıştı; davetsiz kayıt kapalı olsun.)
3. **API Keys** → `Publishable key` + `Secret key` → adım 4'teki env'lere.
4. Demo kullanıcılarını elle oluştur (jüri + sunucu + 1 yedek).
   Her kullanıcı için **`publicMetadata`**:
   ```json
   { "storeos_rol": "magaza_muduru", "magaza": "0178" }
   ```
   Rol değerleri: `magaza_muduru` · `bolge_muduru` · `personel` · `guvenlik` · `merkez`
   ⚠️ Anahtar adı **`storeos_rol`** — mevcut panelin okuduğu `rol` değil.
   Böylece bir kullanıcı yanlışlıkla iki sisteme de düşse rol karışmaz.
5. Kullanıcıların Clerk `user_…` id'lerini `Kullanicilar` tablosundaki
   `Clerk User ID` alanına yaz.

### Giriş sonrası yönlendirme — ÇÖZÜLDÜ (Gün 2)

`src/app/layout.tsx:63` içinde `signInFallbackRedirectUrl="/"` sabit. Yani Gratis
kullanıcısı giriş yapınca `/` (emlak dashboard'u) hedeflenir → orada tenant
çözülemez → `/login`'e geri döner → **döngü.**

Çözüm uygulandı: `src/proxy.ts`'in `isPublic` listesine `/storeos/giris(.*)`
eklendi (dördüncü onaylı istisna, tek satır). `/storeos/giris` Store OS'in kendi
Clerk `<SignIn>` sayfası ve `forceRedirectUrl="/storeos"` veriyor — root
layout'un `signInFallbackRedirectUrl` değeri ezildiği için döngü oluşmuyor.

**Jüriye verilecek bağlantı: `https://storeos.alisales.ai/storeos`**
Oturumsuz gelen `/storeos/giris`'e yönlenir, giriş yapar, `/storeos`'a düşer.

---

## 4. Ortam değişkenleri

`ali-storeos` projesinde, **Production + Preview + Development** üçü için:

| Değişken | Değer |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Gratis Clerk instance'ının **publishable** key'i |
| `CLERK_SECRET_KEY` | Gratis Clerk instance'ının **secret** key'i |
| `STOREOS_AIRTABLE_BASE_ID` | Yeni base'in `app…` id'si |
| `STOREOS_AIRTABLE_API_KEY` | Dar kapsamlı PAT |
| `STOREOS_INGEST_SECRET` | `openssl rand -hex 32` |
| `STOREOS_WA_INBOUND_TOKEN` | `openssl rand -hex 32` |
| `STOREOS_N8N_WA_WEBHOOK_URL` | `https://n8n.alisales.ai/webhook/storeos-wa-giden` |
| `STOREOS_KANAL` | `konsol` (gerçek hat bağlanınca `whatsapp`) |
| `STOREOS_HOST` | `storeos.alisales.ai` |
| `STOREOS_ADMIN_CLERK_IDS` | senin Clerk user id'in |

**Emlak/sigorta değişkenlerinin hiçbirini bu projeye ekleme** —
`AIRTABLE_TOKEN`, `DIALOG360_KEY`, `N8N_ALI_WEBHOOK_URL` burada olmamalı.
Yoklukları izolasyonun ikinci savunma hattı.

---

## 5. İzolasyon doğrulama testi

Deploy bittikten ve `STOREOS_PROD_HOSTLARI` doldurulduktan sonra çalıştır.
`H` = Gratis host'un.

```bash
H=https://storeos.alisales.ai

# A) Emlak panel sayfaları — oturumsuz
for p in / /musteriler /raporlar /satis-sureci /stok /firsatlar /broker; do
  printf '%-16s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code} → %{redirect_url}' "$H$p")"
done
# BEKLENEN: hepsi 307 → .../login   (middleware oturum yok diye kesiyor)

# B) Emlak API'leri — tenant çözülemediği için 403
for p in /api/musteriler /api/raporlar /api/kanban/move; do
  printf '%-22s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$H$p")"
done
# BEKLENEN: 403 (veya 405 — GET kabul etmeyen route'lar için)

# C) Deck sızıntısı kapandı mı
curl -s -o /dev/null -w '%{http_code}\n' "$H/decks/Babacan_Revenue_OS.html"
# BEKLENEN: 404.  200 gelirse build komutu override'ı uygulanmamıştır (adım 1.4).

# D) Store OS ayakta
curl -s -o /dev/null -w '%{http_code}\n' "$H/storeos"
# BEKLENEN: 307 → /login (oturumsuz).  404 gelirse STOREOS_PROD_HOSTLARI boştur.

# E) Ters yön — emlak prod'u etkilenmedi
curl -s -o /dev/null -w '%{http_code}\n' https://emlak.alisales.ai/storeos
# BEKLENEN: 404 (o projede STOREOS_HOST tanımlı değil, host listede yok)
```

**Oturum açtıktan sonra tekrar et.** Asıl test bu: giriş yapmış bir Gratis
kullanıcısı `/musteriler`'e gidince ne oluyor?

```
BEKLENEN: 307 → /login. Çünkü (panel)/layout.tsx:26-27 tenant çözemez
(host PROD_HOST_MAP'te yok, VERCEL_ENV=production) → redirect.
```

Mekanizma bugün lokal olarak doğrulandı — `tenantIdForRequest()` Gratis host'u
için `x-tenant-id` forge edilse bile `null` dönüyor (`src/lib/tenant-guard.ts:32-35`).
Canlı testin bunu üretimde teyit etmesi gerekiyor.
