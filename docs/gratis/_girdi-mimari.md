# _girdi — `store-os-mimari.md` için ham madde listesi

> Bu dosya **taslak girdi**, nihai doküman değil. `store-os-mimari.md`'yi sen yazacaksın;
> burada yalnız kararlar, gerekçeleri ve geri alma koşulları var. Gün ilerledikçe eklenir.
> Ekran/anlatı yok — sadece "ne, neden, ne zaman tersine döner".

---

## 1. Katmanlar

```
partner (vision)                 panel (Clerk oturumu)
      │                                 │
      ▼                                 ▼
POST /api/storeos/olay          /storeos/(korumali)/*
      │  HMAC-SHA256                    │  Clerk
      ▼                                 │
  adapters/*  ───► olay-sozlesmesi.ts ◄─┘        (tek doğrulama kapısı)
      │
      ▼
  olay-alim.ts   ── zincirin tek gövdesi, HTTP'den bağımsız
      │
      ├──► depo/  (arayüz) ──► bellek.ts | airtable.ts        (ileride: postgres.ts)
      ├──► kural-motoru.ts   (saf, I/O yok, Math.random yok)
      ├──► gorev.ts          (tek geçiş tablosu)
      └──► denetim.ts        (append-only)
```

**Kural:** iş mantığı depoyu tanır, Airtable'ı tanımaz. Sağlayıcı değişimi = arayüzün yeni bir uygulaması.

---

## 2. Kararlar ve gerekçeleri

### 2.1 Airtable'da linked record yerine düz metin anahtar
- **Karar:** `Gorev.Kaynak Olay ID`, `Kural`, `Atanan Kullanici ID` — linked record değil, **string**.
- **Gerekçe:** Airtable'ın linked-record yazımı hedef kaydın `rec…` id'sini gerektirir → her yazım öncesi ekstra okuma → seed ve alım hattında 2–3× istek, 5 req/s sınırında darboğaz. Ayrıca unique constraint olmadığı için linked record referans bütünlüğü de garanti etmiyor; maliyeti var, karşılığı yok.
- **Not (kararla birlikte kayda geçer):** *demo kısıtı, Postgres'e geçişte tersine döner.* Postgres'te bunlar foreign key olur; ilişki bütünlüğü veritabanı seviyesinde zorlanır ve bu karar geçersizleşir.
- **Geri alma koşulu:** kalıcı veri tabanına geçiş.

### 2.2 Denetim tablosu append-only — arayüz seviyesinde
- **Karar:** `DenetimDeposu` arayüzünde `guncelle`/`sil` **yok** ve eklenmeyecek.
- **Gerekçe:** Airtable şema seviyesinde silmeyi engelleyemiyor. Tek gerçek garanti, kodun bu arayüzü aşamaması. `AirtableDeposu.sifirla()` bilinçli olarak **fırlatır**; sıfırlama yalnız `seed.ts --sifirla` üzerinden ve yalnız `Veri Tipi='demo'` kayıtlarda.
- **Geri alma koşulu:** yok. Kalıcı kural.

### 2.3 Bilinmeyen olay tipi kabul edilir, reddedilmez
- **Karar:** sözleşmede olmayan `eventType` → 202 + uyarı, kurala eşleşmez.
- **Gerekçe:** sağlayıcı yeni bir tip yayına aldığında entegrasyon kırılmasın. Ret, veri kaybı ve karşılıklı hata ayıklama demek; kabul, sadece kuralsız bir kayıt demek.
- **Karşı görüş (kayda geçsin):** çöp veri sızabilir. Kabul edildi çünkü her kayıt `Veri Tipi` ve `Kaynak Adapter` ile işaretli, denetimden geri izlenebilir.

### 2.4 İmzada `t=<unix>,v1=<hex>` biçimi
- **Karar:** ilan edilen düz-hex imzaya ek olarak zaman damgalı biçim desteklenir; tolerans 300 sn.
- **Gerekçe:** ilan edilen sözleşmede **replay koruması yoktu**. Düz hex imza aynı gövde için süresiz geçerli. Başlık adı ve algoritma aynı kaldığı için bu bir **ek**, kırıcı değişiklik değil.
- **Geri alma koşulu:** yok; ileride `hamBicimeIzinVer=false` ile eski biçim kapatılır (anahtar hazır).

### 2.5 Idempotency iki hatlı
- **Karar:** (1) `olaylar.yazIlkKez(id)`, (2) `gorevler.olayVeKuraldanVarMi(olayId, kuralAdi)`.
- **Gerekçe:** ilk hat partnerin tekrarını, ikinci hat kural motorunun yeniden koşturulmasını karşılar.
- **Bilinen kısıt:** Airtable'da `yazIlkKez` **atomik değil** (oku-sonra-yaz). Eşzamanlı iki istek aynı id ile gelirse iki kayıt oluşabilir. Demo trafiğinde gerçekleşmez; Postgres'te unique index ile tamamen kapanır.

### 2.6 Bellek deposu varsayılan
- **Karar:** `STOREOS_DEPO` ayarlı değilse ve Airtable kimlik bilgileri yoksa **bellek**.
- **Gerekçe:** zincirin tamamı sıfır dış bağımlılıkla koşuyor; prova ve kontrol script'leri ağ istemiyor.
- **Bilinen kısıt:** Vercel lambda'ları arasında paylaşılmaz — aynı tuzak `src/lib/broker/store.ts`'te de var. Bellek deposu **yalnız yerel/CI içindir**, prod demoda Airtable kullanılacak.

### 2.7 Kurallar tek kaynaktan
- **Karar:** `depo/bellek.ts → varsayilanKurallar()` tek kural kaynağı; `scripts/storeos/seed.ts` onu Airtable'a yazar.
- **Gerekçe:** Gün 2'de tam olarak bu ayrışma yaşandı — seed `queue.threshold_exceeded` + `metadata.kisi` yazarken bellek deposu kilitli sözleşmenin `store.queue.threshold_exceeded` + `metadata.queueLength` adlarını kullanıyordu. İki kaynak = iki farklı demo.

### 2.8 Faz 2 tipleri kuralsız
- **Karar:** raf/planogram/ISG/güvenlik/heatmap tipleri **tanımlı**, kural **yok**.
- **Gerekçe:** kapsam kararı — jüriye "tip tanımlı, kural yazılmadı" demek dürüst; "kural var ama çalışmıyor" değil.

### 2.9 `/storeos/giris` ayrı giriş sayfası + `(korumali)` route grubu
- **Karar:** dış layout yalnız host guard uygular; oturum zorunluluğu `(korumali)/layout.tsx`'te.
- **Gerekçe:** giriş sayfası da `/storeos` ağacının altında; dış layout oturum isteseydi giriş sayfası kendi kendini reddederdi. Route grubu URL'i değiştirmez (`/storeos` yine `/storeos`).
- **Bağlı istisna:** `src/proxy.ts` içinde `/storeos/giris(.*)` public — kök layout'un `signInFallbackRedirectUrl="/"` döngüsünü kırmak için (4. onaylı istisna).

### 2.10 Determinizm
- **Karar:** karar yollarında `Math.random` yok; seed ve simülatör FNV-1a tabanlı tohumlu üreteç kullanır.
- **Gerekçe:** prova iki kez üst üste aynı çıktıyı vermeli (kabul kriteri 8).

---

## 3. İzolasyon

- Store OS dosyaları yalnız `node_modules`, `src/lib/storeos/*`, `src/components/storeos/*` import eder.
- Kopyalanan her dosyanın ilk satırı: `// Kaynak: <yol> — Store OS için kopyalandı, senkronize değildir`
- Denetleyici: `node scripts/storeos/import-denetci.mjs` (günlük koşuda).
- Ağaç dışında **onaylı** dokunulan dosyalar: `src/app/globals.css` (yalnız `.storeos-root` bloğu) · `src/proxy.ts` (tek satır public route) · `.env.example` · `.gitignore` (`!.env.example`).

---

## 4. Henüz yazılmamış (girdi geldikçe)

| Konu | Ne bekliyor |
|---|---|
| `depo/airtable.ts` canlı doğrulama | base id + API key |
| `kanal/whatsapp.ts` inbound parser | 360Dialog gerçek payload örneği |
| `STOREOS_PROD_HOSTLARI` | domain + Vercel projesi |
| Bildirim → görev geçişi (buton yanıtı) | Gün 5 |
