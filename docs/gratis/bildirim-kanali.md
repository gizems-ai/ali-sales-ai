# Store OS — Bildirim Kanalı Sözleşmesi

**Sürüm:** 1.0 · **Tarih:** 2026-08-14 · **Durum:** panel tarafı yazıldı ve test edildi, n8n tarafı KURULMADI

Bu belge panelin dış dünyayla bildirim alışverişini tanımlar. İki gövde bizim
kararımızdır (panel ↔ n8n); 360Dialog'un ham gövdesi **bu belgenin kapsamı
dışındadır** ve panel onu hiç görmez.

```
panel ──POST──▶ n8n webhook ──▶ 360Dialog ──▶ telefon
panel ◀──POST── n8n webhook ◀── 360Dialog ◀── buton
```

**Neden n8n arada:** 360Dialog anahtarı zaten n8n'de yaşıyor ve orada rotasyon
ediliyor; panele ikinci kopya koymak sır yüzeyini büyütür. Şablon onayı, 24 saat
penceresi ve numara formatı gibi sağlayıcıya özgü işler n8n'de kalır.

---

## 1. Kanal seçimi

| `STOREOS_KANAL` | Davranış |
|---|---|
| `konsol` (varsayılan) | Mesaj gövdesi ve butonlar konsola basılır. Kayıt tam üretilir. |
| `whatsapp` | `STOREOS_N8N_WA_WEBHOOK_URL`'e POST atılır. |

**Sessiz düşüş yok.** `STOREOS_KANAL=whatsapp` ama webhook URL'i tanımsızsa
kanal konsola DÜŞMEZ; gönderim başarısız olur, bildirim kaydı `Durum='hata'`
olarak kalır ve panelde görünür. Gerekçe: "mesaj gitti sanılan" bir demo, hiç
gitmemesinden daha pahalıdır.

### 1.1 Demo telefon kilidi — güvenlik kapısı

`src/lib/storeos/kanal/telefon-kilidi.ts`

Demo süresince **hiçbir mesajın gerçek bir Gratis çalışanına gitmemesi** için
giden numara `STOREOS_DEMO_TELEFON`'a kilitlenir. Bu bir bağlantı kolaylığı
değil, güvenlik kapısıdır: seed'e gerçek numaralar girildiği gün kilidi
kaldırmayı unutmak, yanlış kişiye mesaj göndermekle sonuçlanmamalı.

| Durum | Davranış |
|---|---|
| Kilit açık (varsayılan), hedef geçerli | Mesaj `STOREOS_DEMO_TELEFON`'a gider |
| Kilit açık, hedef boş/E.164 değil | **Dışarı çıkan kanalda gönderim reddedilir** (fail-closed, `tekrarDenenebilir=false`) |
| Kilit açık, hedef boş, kanal `konsol`/`panel` | Gönderim sürer, `console.warn` basılır (mesaj süreçten çıkmıyor) |
| Kilit kapalı | Numara aynen geçer |

**Varsayılan AÇIK.** Env hiç tanımlanmasa da açıktır. Kapatmanın tek yolu:

```
STOREOS_TELEFON_KILIDI=kapali-gercek-alicilara-gonder
```

`false` / `0` / `kapali` / `off` kilidi **kapatmaz** — kazayla kapanabilen bir
bayrak, kapı değildir.

**İki katman (defense in depth).**

1. `bildirim.ts` gönderimden önce etkin numarayı çözer (`hedefiCoz`) — böylece
   kayıt ve denetim gerçeği söyler.
2. `kanal/index.ts` her kanalı `kilitle()` ile sarar — `bildirim.ts`'i atlayan
   ileride yazılacak bir çağıran da sızdıramaz.

Kanal arayüzündeki `disaCikar: boolean` alanı bunu tipe bağlar: yeni bir kanal
eklendiğinde "bu mesaj süreçten çıkıyor mu" sorusu cevaplanmak zorundadır.

**Ezme görünür.** Kilit devredeyken:

- Bildirim kaydına `Gonderilen Telefon` yazılır (`Alici Telefon` görevin
  sahibinin numarası olarak kalır — semantik bozulmaz).
- Denetimdeki `bildirim.gonderildi` satırının `not` alanı:
  `demo telefon kilidi: hedef ezildi <istenen> → <etkin>`
- Denetim satırının `Sonrasi JSON` alanında `gonderilenTelefon` + `kilit: 'demo-telefon'`
- Gönderim logunda, kanala verilmeden hemen önce `[storeos:kilit] ...` satırı basılır.

**Gelen yönü etkiler.** 4. kapı (numara doğrulaması) artık
`Gonderilen Telefon ?? Alici Telefon` ile karşılaştırır. Kilit açıkken yanıt
demo telefonundan gelir; bu değişiklik olmadan her yanıt `telefon_uyusmuyor`
ile reddedilirdi. Kapı **gevşemedi** — üçüncü bir numaradan gelen yanıt hâlâ
reddediliyor (`zincir.test.ts` bölüm 9).

Testler: `npx -y tsx src/lib/storeos/kanal/telefon-kilidi.test.ts` (birim) ve
`zincir.test.ts` bölüm 9 (uçtan uca).

---

## 2. Giden gövde (panel → n8n)

`POST <STOREOS_N8N_WA_WEBHOOK_URL>` · `content-type: application/json`

```json
{
  "bildirimId": "b-G-000001-ilk",
  "gorevNo": "G-000001",
  "telefon": "+905551112233",
  "ad": "Magaza Muduru",
  "metin": "Kasa kuyrugu 7 kisiye ulasti — ek kasa ac\n\n…",
  "template": null,
  "butonlar": [
    { "id": "so1:gorev:G-000001:kabul:b-G-000001-ilk",  "etiket": "Kabul Et" },
    { "id": "so1:gorev:G-000001:devret:b-G-000001-ilk", "etiket": "Başkasına Ata" },
    { "id": "so1:gorev:G-000001:ertele:b-G-000001-ilk", "etiket": "5 Dakika Ertele" }
  ]
}
```

| Alan | Not |
|---|---|
| `bildirimId` | Idempotency anahtarı. n8n aynı id'yi ikinci kez görürse atlayabilir. |
| `template` | `null` = 24 saat penceresi içinde serbest mesaj. Şablon adı verilirse n8n onaylı şablonu kullanır. |
| `butonlar` | En fazla 3 — WhatsApp interaktif buton sınırı. |

**Beklenen yanıt:** 2xx. Gövdede `mesajId` · `messageId` · `id` · `wamid`
alanlarından biri varsa sağlayıcı mesaj id'si olarak alınır. Hiçbiri yoksa panel
`n8n-<bildirimId>` yerel id'sine düşer ve bunu denetim kaydında `not` ile açıkça
söyler — **uydurulmuş sağlayıcı id'si, gelen yön eşleşmesini sessizce bozar.**

Hata yorumu: `>= 500` → tekrar denenebilir, `4xx` → gövdemiz yanlış.
Zaman aşımı 10 sn.

---

## 3. Buton kimliği (ileri-geri çözümleme)

```
so1:gorev:<GorevNo>:<aksiyon>:<bildirimId>
```

WhatsApp butondan bize geri **yalnız `id`'yi** gönderir; hangi görev için
basıldığını başka hiçbir şey söylemez. Bu yüzden görev numarası ve aksiyon
id'nin içinde taşınır.

| Parça | Değer | Gerekçe |
|---|---|---|
| `so1` | sürüm öneki | Biçim değişirse eski butonlar sessizce yanlış yorumlanmasın. `so2` geldiğinde `so1` hâlâ çözülür. |
| `gorev` | entity tipi | İleride `kural` / `vardiya` gelebilir. |
| aksiyon | `kabul` · `devret` · `ertele` | Buton etiketleri: Kabul Et · Başkasına Ata · 5 Dakika Ertele |
| `bildirimId` | `b-<GorevNo>-<kademe>` | Aynı görev için birden fazla mesaj gitmişse (eskalasyon) hangisine basıldığı belli olur. |

* Ayraç `:` — Görev No ve Bildirim ID içinde geçmez; üretimde doğrulanır.
* Sınır 256 karakter (WhatsApp). Aşarsa **hata fırlatılır**; sessiz kırpma,
  çözülemeyen id üretip yanıtı çöpe atmak demektir.
* `butonIdCoz` çözemezse `null` döner. **Kısmen tanıdık bir id tahminle
  tamamlanmaz** — yanlış görevi kapatmaktansa "çözülemedi" diye denetime yazmak
  iyidir.

Testler: `src/lib/storeos/zincir.test.ts` §1 (ileri-geri + 9 bozuk girdi).

---

## 4. Gelen gövde (n8n → panel)

`POST /api/storeos/wa/inbound` · `Authorization: Bearer <STOREOS_WA_INBOUND_TOKEN>`

```json
{
  "mesajId": "wamid.HBgM…",
  "butonId": "so1:gorev:G-000001:kabul:b-G-000001-ilk",
  "metin": null,
  "telefon": "+905551112233",
  "zaman": "2026-08-14T14:02:00+03:00"
}
```

| Alan | Zorunlu | Not |
|---|---|---|
| `mesajId` | ✅ | Giden gönderimde n8n'in döndürdüğü sağlayıcı mesaj id'si. Eşleşme bununla kurulur. |
| `butonId` | — | Yoksa/tanınmıyorsa serbest metin sayılır, görev durumu DEĞİŞMEZ. |
| `metin` | — | Serbest metin yanıtı. |
| `telefon` | ✅ | Gönderen numara. Bildirimin alıcısı değilse yanıt reddedilir. |
| `zaman` | — | Yoksa sunucu saati. |

**360Dialog'un ham gövdesi buraya gelmez.** Normalizasyon n8n'de yapılır.
Gerçek payload elimize geçtiğinde değişecek tek dosya
`src/lib/storeos/kanal/whatsapp.ts` içindeki `gelenCoz`'dur; iş mantığı ve
testler değişmez.

### Durum kodları

| Kod | Anlamı |
|---|---|
| 200 | Yanıt işlendi (`uygulandi` / `yinelenen` / `metin`) |
| 202 | **Çözülemedi ama kabul edildi**, denetime yazıldı — n8n TEKRAR DENEMESİN |
| 400 | Gövde JSON değil |
| 401 | Bearer token eksik/yanlış |
| 500 | Sunucu yapılandırması eksik |

202 kararı bilinçli: çözülemeyen bir yanıt tekrar gönderilince de çözülemez;
4xx dönmek n8n'de sonsuz retry kuyruğu yaratır.

### Doğrulama zinciri

Görev değişmeden önce **altı kapı**:

1. Buton id çözülüyor mu? → yoksa serbest metin
2. Sağlayıcı mesaj id'si tanınıyor mu? → `bildirim_yok`
3. Buton **o** bildirime mi ait? → `bildirim_uyusmuyor`
4. Gönderen numara beklenen numara mı? → `telefon_uyusmuyor`
   (beklenen = `Gonderilen Telefon ?? Alici Telefon`; bkz. 1.1 demo telefon kilidi)
5. Bu bildirime daha önce yanıt verilmiş mi? → `yinelenen`
6. Görev geçişi geçerli mi? → `gecis_reddedildi`

3. adım neden ayrı: buton id'si ve sağlayıcı mesaj id'si aynı yanıtta gelir;
ikisinin **aynı** bildirimi işaret ettiğini doğrulamazsak eski bir mesajın
butonuna basılıp yeni bir bildirimin kaydına yazılabilir.

### Aksiyonların karşılığı

| Buton | Yapılan |
|---|---|
| Kabul Et | Görev `basladi`ya geçer (durum makinesi üzerinden) |
| Başkasına Ata | Kuralın `Eskalasyon Rolu`'ndeki kişiye atanır + ona `devir` bildirimi gider |
| 5 Dakika Ertele | **Durum değişmez**, `Son Teslim` 5 dk ötelenir |

Erteleme neden durum değiştirmiyor: `beklemede` "iş başlamış ama duruyor"
demektir; ertelemede iş henüz başlamamıştır. Durumu değiştirmek paneli ve
eskalasyon sayaçlarını yanlış bilgilendirirdi. Bedeli: erteleme durum sütununda
görünmez — karşılığı denetimdeki `gorev.ertelendi` satırı ve yeni `Son Teslim`.

---

## 5. Bildirim kaydı ve idempotency

`Bildirim ID` **deterministiktir**: `b-<GorevNo>-<kademe>`

Kademeler: `ilk` · `hatirlatma` · `bolge` · `merkez` · `devir`

Anahtar neden kademe içeriyor: aynı görev için birden fazla **meşru** mesaj
vardır. Anahtar yalnız görev numarası olsaydı eskalasyon hiç gönderilemezdi.

* Kural iki kez tetiklenirse kullanıcı **iki mesaj almaz**.
* Kayıt gönderimden **önce** yazılır: n8n düşerse kayıt `hata` durumunda kalır
  ve panelde görünür.
* Airtable uygulamasında gerçek garanti için `Bildirim ID` alanına **UNIQUE**
  kısıtı gerekir (bkz. `airtable-storeos-kurulum.md`); kod tarafındaki
  `olusturIlkKez` okuma-sonra-yazma yapar.

---

## 6. Eskalasyon merdiveni

`POST /api/storeos/escalation/kontrol`
(cron: `Authorization: Bearer <STOREOS_CRON_TOKEN>` · panel: Clerk oturumu)

Ölçüm noktası **görevin son teslimi**dir.

| Gecikme | Kademe | Alıcı |
|---|---|---|
| 0 dk | — | mağaza müdürü (ilk bildirim görev doğduğunda gitti) |
| 5 dk | `hatirlatma` | aynı alıcı |
| 10 dk | `bolge` | `bolge_muduru` |
| 20 dk | `merkez` | `merkez` |

* **Idempotent:** aynı görev + aynı kademe iki kez tetiklenmez. Uç noktayı arka
  arkaya çağırmak zararsızdır; demo düğmesine iki kez basmak ikinci mesajı
  doğurmaz.
* Hak edilen **tüm** kademeler tek koşuda gider (cron ilk kez 25 dk gecikmede
  koşarsa üçü birden).
* Görev durumu **değiştirilmez** (`suresi_gecti`'ye çevrilmez): gecikme zaten
  `Son Teslim`'den hesaplanır, durumu değiştirmek kabul butonunu kullanan
  kişinin gördüğü durumu altından çeker.
* Nihai durumdaki görevler (`tamamlandi` · `iptal`) atlanır.

---

## 7. n8n tarafında yapılacaklar (BU BELGE YAZILDIĞINDA YAPILMADI)

Ali production n8n'ine dokunulmadı — onay bekliyor.

1. `storeos-wa-giden` webhook workflow'u: yukarıdaki giden gövdeyi alır,
   360Dialog interactive-button mesajına çevirir, yanıtta `{ "mesajId": "<wamid>" }` döner.
2. `storeos-wa-gelen` workflow'u: 360Dialog webhook'unu dinler, §4 gövdesine
   normalize eder, bearer token ile `/api/storeos/wa/inbound`'a POST eder.
3. `.env`: `STOREOS_KANAL=whatsapp` · `STOREOS_N8N_WA_WEBHOOK_URL` ·
   `STOREOS_WA_INBOUND_TOKEN` · (isteğe bağlı) `STOREOS_CRON_TOKEN`.
4. Gerçek E.164 telefon numaraları — `Kullanicilar.Telefon` şu an `+9000000000X`
   placeholder.

---

## 8. Zinciri tek komutla koşturmak

```bash
npx -y tsx scripts/storeos/zincir-demo.ts
```

HTTP, Airtable ve telefon gerektirmez. 12 halkayı sırayla koşar ve herhangi biri
kırmızıysa çıkış kodu 1 döner. `node scripts/storeos/kontroller.mjs` bunu son
adım olarak çalıştırır.
