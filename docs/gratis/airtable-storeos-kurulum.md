# Store OS — Airtable base kurulum talimatı

Bu doküman `src/lib/storeos/tipler.ts` ile birebir eşleşir. **Alan adı değişecekse
önce `tipler.ts` değişir**, sonra burası. Seed script'i (`scripts/storeos/seed.ts`)
de aynı kaynağı kullanır.

---

> ## ⚠ BU BÖLÜM ARTIK ELLE YAPILMIYOR — 17 Ağustos 2026
>
> Base **programatik olarak** kuruldu:
>
> ```
> npx -y tsx scripts/storeos/airtable-kur.ts            # kuru çalışma: ne kuracağını basar
> npx -y tsx scripts/storeos/airtable-kur.ts --uygula   # Meta API ile gerçekten kurar
> ```
>
> | | |
> |---|---|
> | **Base adı** | `Ali Store OS` (bu dokümandaki eski `GRATIS_STOREOS_DEMO` değil) |
> | **Base ID** | `appXHVi7l5zzxLiGg` |
> | **Kapsam** | 9 tablo · 110 alan · tek Meta API isteği |
> | **Doğrulama** | `sema-dogrula.ts` → ŞEMA TAMAM · `depo/uygunluk.test.ts --airtable` → 51/51 |
>
> Aşağıdaki tablolar **şemanın otoritesi olarak** duruyor (alan adı/tip değişecekse
> önce `tipler.ts`, sonra burası, sonra `airtable-kur.ts`). Elle kurulum adımları
> yalnız base'i sıfırdan yeniden yaratmak gerekirse geçerlidir.
>
> **TUZAK — `precision`:** aşağıdaki tablolarda "precision `1` (tam sayı)" yazan
> her yer **UI dilidir**. Meta API'de `precision` = ondalık basamak SAYISI, yani
> tam sayı için `precision: 0`'dır. `1` yazılırsa Airtable `12.0` gösterir.
> `airtable-kur.ts` doğru değeri (`0`) kullanır.

## 0. Başlamadan (elle kurulum — arşiv)

1. Airtable'da **yeni bir base** aç. Adı: `Ali Store OS`.
   Mevcut base'lerin (emlak `appGYQQR…`, sigorta `appjULA…`) hiçbirine dokunma.
2. Base açılınca Airtable otomatik `Table 1` oluşturur ve içine `Name`, `Notes`,
   `Assignee`, `Status` alanları koyar. **`Notes`, `Assignee`, `Status` alanlarını sil.**
   `Table 1`'i ilk tablomuz (`Magazalar`) olarak yeniden adlandır, `Name` alanını
   `Kod` yap. Kalan 8 tabloyu sıfırdan ekle.
3. **Tarih alanları:** her `Date` alanında `Include time` **açık**, format `24 hour`,
   ve `Use the same time zone for all collaborators` **açık** → `Europe/Istanbul`.
   Bu kapalı kalırsa API'den yazdığımız ISO değerleri UI'da kayık görünür.
4. **Zorunlu alan (required) işaretlemesi Airtable'da yoktur.** Doğrulama uygulama
   tarafında (`olay-sozlesmesi.ts`, Gün 2). Burada sadece tip doğru olsun.
5. Bitince: Base'in sağ üstünden **base ID**'yi (`app…` ile başlar) ve
   `airtable.com/create/tokens` üzerinden **dar kapsamlı bir Personal Access Token**
   al. Token kapsamı: `data.records:read`, `data.records:write`, `schema.bases:read` —
   **yalnız bu base seçili.** Diğer base'lere erişim verme.

Alan adları bilinçli olarak **aksansız ASCII**'dir (`Magaza`, `Kapanis`, `Aciklama`).
Gerekçe `tipler.ts` başında yazılı: aksanlı alan adları `filterByFormula`
URL-encode'unda mevcut panelde tekrarlayan kaçış hatalarına yol açtı.

---

## 1. `Magazalar`

| # | Alan | Airtable tipi | Ayar / seçenekler |
|---|---|---|---|
| 1 | `Kod` | Single line text | **birincil alan** — örn. `0178` |
| 2 | `Ad` | Single line text | `Izmir Forum Bornova` |
| 3 | `Bolge` | Single select | `Ege`, `Marmara`, `Ic Anadolu`, `Akdeniz` |
| 4 | `Sehir` | Single line text | |
| 5 | `Adres` | Long text | |
| 6 | `Acilis Saati` | Single line text | `HH:mm` — Duration değil, string |
| 7 | `Kapanis Saati` | Single line text | `HH:mm` |
| 8 | `Durum` | Single select | `online`, `warning`, `offline` |
| 9 | `Kasa Toplam` | Number | precision `1` (tam sayı) |
| 10 | `Aktif` | Checkbox | |

## 2. `Kameralar`

| # | Alan | Airtable tipi | Ayar / seçenekler |
|---|---|---|---|
| 1 | `Kamera ID` | Single line text | **birincil** — `0178-giris` |
| 2 | `Magaza Kodu` | Single line text | `Magazalar.Kod` değeri (link değil) |
| 3 | `Ad` | Single line text | |
| 4 | `Bolge Adi` | Single select | `Giris`, `Kasa Alani`, `Kozmetik Reyon`, `Depo` |
| 5 | `Durum` | Single select | `online`, `degraded`, `offline` |
| 6 | `Demo Video` | Single line text | `/storeos/demo/giris.mp4` |
| 7 | `Yetenekler` | Single line text | virgülle ayrık: `kisi_sayimi,kuyruk` |
| 8 | `Sira` | Number | precision `1` — grid sıralaması |

## 3. `Kullanicilar`

| # | Alan | Airtable tipi | Ayar / seçenekler |
|---|---|---|---|
| 1 | `Kullanici ID` | Single line text | **birincil** — `u-mudur-0178` |
| 2 | `Ad Soyad` | Single line text | |
| 3 | `Rol` | Single select | `magaza_muduru`, `bolge_muduru`, `personel`, `guvenlik`, `merkez` |
| 4 | `Magaza Kodu` | Single line text | |
| 5 | `Telefon` | Phone number | **E.164 zorunlu**: `+905XXXXXXXXX` |
| 6 | `Clerk User ID` | Single line text | Gratis Clerk instance'ının `user_…` id'si |
| 7 | `Aktif` | Checkbox | |
| 8 | `WA Oturum Acildi` | Date | include time — 24 saatlik pencerenin başlangıcı |

> `WA Oturum Acildi` demo günü kritik: kullanıcı WABA numarasına mesaj attığı an
> buraya yazılır, panel "pencere açık mı" bunu okuyarak söyler.

## 4. `Olaylar`

| # | Alan | Airtable tipi | Ayar / seçenekler |
|---|---|---|---|
| 1 | `Olay ID` | Single line text | **birincil + idempotency anahtarı** |
| 2 | `Magaza Kodu` | Single line text | |
| 3 | `Kamera ID` | Single line text | |
| 4 | `Olay Tipi` | Single line text | `queue.threshold_exceeded` — select DEĞİL, yeni tipler gelecek |
| 5 | `Olustu` | Date | include time — olayın gerçekleşme anı |
| 6 | `Alindi` | Date | include time — bizim kabul anımız |
| 7 | `Severity` | Single select | `info`, `low`, `medium`, `high`, `critical` |
| 8 | `Guven` | Number | precision `2` (0.00–1.00) |
| 9 | `Metadata JSON` | Long text | |
| 10 | `Snapshot URL` | URL | |
| 11 | `Klip URL` | URL | |
| 12 | `Kaynak Adapter` | Single line text | `generic` / `ornek-vendor` |
| 13 | `Islendi` | Checkbox | kural motoru işledi mi |
| 14 | `Eslesen Kural` | Single line text | |
| 15 | `Veri Tipi` | Single select | `gercek`, `demo` |

> **`Olay Tipi` neden Single select değil?** Vision partneri bize haber vermeden
> yeni tip gönderebilir. Select olsaydı `typecast` yeni seçenek yaratır ya da
> yazma patlardı. Text + uygulama tarafında whitelist doğrusu.

## 5. `Kurallar`

| # | Alan | Airtable tipi | Ayar / seçenekler |
|---|---|---|---|
| 1 | `Kural Adi` | Single line text | **birincil** |
| 2 | `Olay Tipi` | Single line text | |
| 3 | `Kosullar JSON` | Long text | `[{"alan":"metadata.kisi","operator":">=","deger":8}]` |
| 4 | `Severity` | Single select | `info`, `low`, `medium`, `high`, `critical` |
| 5 | `Gorev Basligi` | Single line text | şablon: `{magaza} kasa kuyrugu {deger} kisi` |
| 6 | `Gorev Aciklamasi` | Long text | şablon |
| 7 | `Hedef Rol` | Single select | 5 rol |
| 8 | `Oncelik` | Single select | `dusuk`, `normal`, `yuksek`, `kritik` |
| 9 | `SLA Dakika` | Number | precision `1` |
| 10 | `Eskalasyon Dakika` | Number | precision `1` |
| 11 | `Eskalasyon Rolu` | Single select | 5 rol |
| 12 | `Bildirim Kanali` | Single select | `whatsapp`, `panel`, `konsol` |
| 13 | `Kanit Gerekli` | Checkbox | |
| 14 | `Sira` | Number | precision `1` — küçük olan önce değerlendirilir |
| 15 | `Aktif` | Checkbox | |

## 6. `Gorevler`

| # | Alan | Airtable tipi | Ayar / seçenekler |
|---|---|---|---|
| 1 | `Gorev No` | Single line text | **birincil** — `G-000042` |
| 2 | `Baslik` | Single line text | |
| 3 | `Aciklama` | Long text | |
| 4 | `Magaza Kodu` | Single line text | |
| 5 | `Kaynak Olay ID` | Single line text | |
| 6 | `Kural` | Single line text | |
| 7 | `Gerekce` | Long text | hangi kural + hangi koşullar sağlandı |
| 8 | `Atanan Kullanici ID` | Single line text | |
| 9 | `Atanan Rol` | Single select | 5 rol |
| 10 | `Oncelik` | Single select | `dusuk`, `normal`, `yuksek`, `kritik` |
| 11 | `Durum` | Single select | `yeni`, `atandi`, `goruldu`, `basladi`, `beklemede`, `tamamlandi`, `onay_bekliyor`, `reddedildi`, `suresi_gecti`, `iptal` |
| 12 | `Olusturuldu` | Date | include time |
| 13 | `Son Teslim` | Date | include time |
| 14 | `Goruldu` | Date | include time |
| 15 | `Baslandi` | Date | include time |
| 16 | `Tamamlandi` | Date | include time |
| 17 | `Kanit Gerekli` | Checkbox | |
| 18 | `Kanit URL` | URL | |
| 19 | `Veri Tipi` | Single select | `gercek`, `demo` |

> 10 durumu **tek tek** ekle. `typecast: true` ile yazıyoruz; eksik bir seçenek
> Airtable'da sessizce yeni seçenek olarak yaratılır ve durum makinesi
> doğrulaması ile Airtable birbirinden kayar.

## 7. `Bildirimler`

| # | Alan | Airtable tipi | Ayar / seçenekler |
|---|---|---|---|
| 1 | `Bildirim ID` | Single line text | **birincil** |
| 2 | `Gorev No` | Single line text | |
| 3 | `Olay ID` | Single line text | |
| 4 | `Kanal` | Single select | `whatsapp`, `panel`, `konsol` |
| 5 | `Alici Kullanici ID` | Single line text | |
| 6 | `Alici Telefon` | Phone number | E.164 — görevin sahibinin numarası |
| 7 | `Gonderilen Telefon` | Phone number | E.164 — mesajın GERÇEKTEN gittiği numara; demo telefon kilidi açıkken 6'dan farklıdır |
| 8 | `Template` | Single line text | oturum penceresinde boş kalır |
| 9 | `Govde` | Long text | |
| 10 | `Gonderim Zamani` | Date | include time |
| 11 | `Durum` | Single select | `kuyrukta`, `gonderildi`, `teslim`, `okundu`, `yanitlandi`, `hata` |
| 12 | `Saglayici Mesaj ID` | Single line text | **360Dialog message id — inbound eşleşmesi bununla** |
| 13 | `Yanit` | Single select | `kabul`, `devret`, `ertele` |
| 14 | `Yanit Zamani` | Date | include time |
| 15 | `Hata` | Long text | |

> `Gonderilen Telefon` boşsa mesaj alıcının kendi numarasına gitmiştir. Gelen
> yanıtın numara kapısı önce bu alana, yoksa `Alici Telefon`'a bakar
> (`src/lib/storeos/inbound.ts`, kapı 4).

## 8. `DenetimKaydi` — APPEND-ONLY

| # | Alan | Airtable tipi | Ayar / seçenekler |
|---|---|---|---|
| 1 | `Kayit ID` | Single line text | **birincil** |
| 2 | `Zaman` | Date | include time |
| 3 | `Aktor` | Single line text | Clerk id \| `system` \| `partner:<ad>` |
| 4 | `Aktor Tipi` | Single select | `kullanici`, `system`, `partner` |
| 5 | `Aksiyon` | Single line text | `olay.kabul`, `gorev.durum`, `bildirim.gonder` |
| 6 | `Entity Tipi` | Single line text | `olay`, `gorev`, `bildirim`, `kural` |
| 7 | `Entity ID` | Single line text | |
| 8 | `Oncesi JSON` | Long text | |
| 9 | `Sonrasi JSON` | Long text | |
| 10 | `IP` | Single line text | |
| 11 | `Kaynak` | Single select | `api`, `panel`, `n8n`, `cron`, `seed` |

> **Airtable append-only'u zorlayamaz.** Kabul kriteri "kayıt silinemez"i biz
> kodda garanti ediyoruz: `denetim.ts` içinde yalnız `yaz()` fonksiyonu olacak,
> `guncelle`/`sil` hiç yazılmayacak. **Ek koruma senin elinde:** demo günü bu
> tablo için Airtable'da ayrı bir read-only paylaşım kullan, base'i jüriye
> açacaksan editor yetkisi verme. Bu sınırı dokümana açıkça yazacağız.

## 9. `Metrikler`

| # | Alan | Airtable tipi | Ayar / seçenekler |
|---|---|---|---|
| 1 | `Kayit ID` | Single line text | **birincil** |
| 2 | `Magaza Kodu` | Single line text | |
| 3 | `Metrik Tipi` | Single line text | `tipler.ts → METRIK_TIPLERI` |
| 4 | `Deger` | Number | precision `2` |
| 5 | `Birim` | Single select | `kisi`, `TL`, `sn`, `yuzde`, `adet`, `C`, `dk` |
| 6 | `Zaman` | Date | include time |
| 7 | `Kaynak` | Single select | `camera`, `pos`, `erp`, `sensor`, `manual` |
| 8 | `Veri Tipi` | Single select | `gercek`, `demo` |
| 9 | `Detay JSON` | Long text | saatlik seri / ısı haritası grid'i |

> `Veri Tipi` madde 11'in (dürüstlük kuralı) taşıyıcısıdır. UI her `demo` değerin
> yanına ince `örnek veri` işareti koyacak. **Bu alanı boş bırakma** — boş gelen
> metrik UI'da `demo` sayılacak (güvenli varsayılan).

---

## Kurulum sonrası

1. Base ID ve token'ı `.env.local`'e ekle:
   ```
   STOREOS_AIRTABLE_BASE_ID=app...
   STOREOS_AIRTABLE_API_KEY=pat...
   ```
2. Şemayı doğrula (yazmadan, sadece okur):
   ```bash
   npx -y tsx scripts/storeos/sema-dogrula.ts
   ```
3. Seed'i çalıştır:
   ```bash
   npx -y tsx scripts/storeos/seed.ts                   # ne yazacağını gösterir, yazmaz
   npx -y tsx scripts/storeos/seed.ts --sifirla --yaz   # ← PROVA ARASI KOMUT BUDUR
   ```

   > **`--yaz`'ı `--sifirla` olmadan İKİNCİ kez çalıştırma.** Referans tablolar
   > temizlenmeden üzerine eklenir; kurallar çiftlenir ve **her olay iki görev,
   > iki WhatsApp mesajı** üretir. Script artık bu durumda uyarı basıyor.

4. Depoyu canlı base'e karşı doğrula (bellek deposuyla aynı sözleşmeyi tuttuğunu
   kanıtlar; kendi test kayıtlarını siler):
   ```bash
   npx -y tsx src/lib/storeos/depo/uygunluk.test.ts --airtable
   ```

### `--sifirla` ne siler, ne silmez

| Tablo | Politika |
|---|---|
| `Metrikler`, `Gorevler`, `Olaylar` | yalnız `Veri Tipi='demo'` — `gercek` korunur |
| `Bildirimler` | **tamamı** — `Bildirim ID` deterministiktir (`b-<GorevNo>-<kademe>`); eski satır kalırsa ikinci provada mesaj HİÇ GİTMEZ |
| `Magazalar`, `Kameralar`, `Kullanicilar`, `Kurallar` | **tamamı** — `Veri Tipi` alanı yok, hepsi kurulum verisi; silinmezse `--yaz` çiftler |
| `DenetimKaydi` | **HİÇBİR ŞEY** — append-only, listede bilerek yok |

Her ikisi de 17 Ağustos'taki ilk canlı `--sifirla` koşusunda yakalandı:
o koşudan sonra `Kurallar` 6→12, `Magazalar` 1→2 olmuştu.
