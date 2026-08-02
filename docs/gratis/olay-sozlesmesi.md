# Store OS — Olay Alım Sözleşmesi (v1.1)

**Kime:** vision/analitik sağlayıcı entegrasyon ekibi
**Uç nokta sahibi:** Ali Sales AI — Store OS
**Durum:** Alan adları, tipler ve davranış **KİLİTLİ**. Değişiklik ancak iki taraflı mutabakatla.

> Bu doküman koddaki `src/lib/storeos/olay-sozlesmesi.ts` ile birebir eşleşir.
> Uyuşmazlık olursa **kod** esastır ve doküman düzeltilir.
> Doküman içindeki her örnek payload, doğrulama testinden geçirilmiş gerçek örnektir.

### v1.0 → v1.1 değişiklikleri

| # | Değişiklik | Kırıcı mı? |
|---|---|---|
| 1 | `metadata` anahtar adları netleşti (§3) — v1.0'daki tablo taslaktı, bu tablo esastır | Evet, sağlayıcı tarafında ad kontrolü gerekir |
| 2 | İmza: **tek biçim** `t=…,v1=…` (§4). Düz hex kaldırıldı | Evet — ama hiçbir entegrasyon düz hex kullanmıyordu |
| 3 | Yanıta makine-okunur `warnings` dizisi eklendi (§6) | Hayır, ekleme |
| 4 | Dizi gönderiminde **kısmi kabul** davranışı yazıya geçti (§6.2) | Hayır, davranış aynıydı |

---

## 1. Uç nokta

```
POST https://<host>/api/storeos/olay
Content-Type: application/json
X-StoreOS-Signature: <imza>      (zorunlu)
X-StoreOS-Adapter:   <adapter>   (opsiyonel, varsayılan: generic)
```

- Tekil nesne **veya** nesne dizisi kabul edilir.
- Azami gövde: **1 MB**. Üstü `413` döner; toplu gönderimi bölün.
- Teslimat modeli: **at-least-once**. Tekrar göndermek güvenlidir (bkz. §5).
- `GET` → `405`.

---

## 2. Kanonik olay

```json
{
  "id": "evt_5f1c8a2b",
  "storeCode": "0178",
  "cameraId": "cam-kasa-01",
  "eventType": "store.queue.threshold_exceeded",
  "occurredAt": "2026-08-14T14:35:21+03:00",
  "severity": "high",
  "confidence": 0.91,
  "metadata": {
    "registerId": "kasa-2",
    "queueLength": 7,
    "avgWaitSeconds": 252,
    "maxWaitSeconds": 180
  },
  "snapshotUrl": "https://...",
  "clipUrl": "https://..."
}
```

| Alan | Zorunlu | Tip | Kural |
|---|---|---|---|
| `id` | ✅ | string | **Idempotency anahtarı.** Azami 128 karakter. Sağlayıcı tarafında benzersiz. Baş/son boşluk temizlenir. |
| `storeCode` | ✅ | string | Mağaza kodu. |
| `eventType` | ✅ | string | Küçük harf, nokta ayraçlı, 2–5 parça. `^[a-z][a-z0-9]*(\.[a-z0-9_]+){1,4}$` |
| `occurredAt` | ✅ | string | ISO 8601, **timezone offset ZORUNLU**. `2026-08-14T14:35:21+03:00` veya `...Z`. Offsetsiz zaman **reddedilir**. |
| `severity` | ✅ | enum | `info` · `low` · `medium` · `high` · `critical` (küçük harf, normalize edilmez) |
| `confidence` | ✅ | number | `0`–`1` arası **sayı**. Yüzde göndermeyin; `"0.9"` gibi string kabul edilmez. |
| `metadata` | ✅ | object | JSON nesnesi (dizi/null/string değil). Veri yoksa `{}`. Azami 32 KB. |
| `cameraId` | — | string | Verilirse boş olamaz. |
| `snapshotUrl` | — | string | `http`/`https` |
| `clipUrl` | — | string | `http`/`https` |

Tanımadığımız üst seviye alanlar **yok sayılır** (hata değil); yanıtta `warnings: ["sozlesme_disi_alan"]` olarak bildirilir ve kaydedilen olaya sızmaz.

---

## 3. Olay tipleri ve `metadata` anahtarları

Aşağıdaki anahtar adları **esastır**. Kural motoru bu adları okur.
Anahtar adı farklıysa **kendi tarafınızda değiştirmeyin** — bize bildirin, adapter'da eşleriz (§7). Ad uydurmak, olayın sessizce hiçbir kurala eşleşmemesine yol açar.

Eksik anahtar olayı **reddetmez**; yanıtta `warnings: ["eksik_metadata_anahtari"]` döner ve hangi anahtarların eksik olduğu tek tek yazılır.

### Faz 1 — kural yazıldı, görev üretebilir

| `eventType` | `metadata` anahtarları |
|---|---|
| `store.person_count.updated` | `count`, `zoneId`, `periodSeconds` |
| `store.queue.length_changed` | `registerId`, `queueLength`, `avgWaitSeconds` |
| `store.queue.threshold_exceeded` | `registerId`, `queueLength`, `avgWaitSeconds`, `maxWaitSeconds` |
| `store.occupancy.updated` | `personCount`, `densityLevel` |
| `store.dwell_time.updated` | `zoneId`, `avgDwellSeconds` |
| `store.zone.person_count` | `zoneId`, `count` |
| `store.camera.offline` | `lastSeenAt`, `reason` |
| `store.camera.degraded` | `issue` |

### Faz 2 — tip tanımlı, **kural yok**

Olay kabul edilir, kaydedilir, denetime düşer; **görev/bildirim üretmez.** Sözleşme bugünden sabittir ki faz 2'de kod değil yalnız kural eklensin.

| `eventType` | `metadata` anahtarları |
|---|---|
| `store.shelf.stock_low` | `zoneId`, `shelfId`, `fillRatePercent`, `missingFacings` |
| `store.planogram.non_compliant` | `zoneId`, `shelfId`, `issueType`, `expectedSku`, `detectedSku` |
| `store.safety.event_detected` | `issueType`, `zoneId` |
| `store.security.event_detected` | `issueType`, `zoneId` |
| `store.heatmap.snapshot` | `gridWidth`, `gridHeight`, `values`, `periodMinutes` |

### Enum değerleri

Doğrulama bunları **zorlamaz** (bilinmeyen değer olayı reddetmez), fakat kural koşulları ve panel etiketleri bu listelere yaslanır. Liste dışı değer → kural eşleşmez.

| Tip | Anahtar | Değerler |
|---|---|---|
| `store.occupancy.updated` | `densityLevel` | `low` · `medium` · `high` |
| `store.camera.degraded` | `issue` | `blur` · `obstructed` · `low_light` · `tampered` |
| `store.safety.event_detected` | `issueType` | `wet_floor` · `blocked_exit` · `improper_stacking` · `obstruction` |
| `store.security.event_detected` | `issueType` | `abandoned_object` · `unauthorized_zone` · `tampering` |

### Listede olmayan tipler

**Reddedilmez.** Kabul edilir, kaydedilir, kurala eşleşmez — böylece yeni bir tip yayına aldığınızda entegrasyon kırılmaz. Ancak sessiz de kalmayız: yanıtta `warnings: ["bilinmeyen_olay_tipi"]` döner. `store.queu.length_changed` gibi bir yazım hatası `202` alır ama bu uyarıyla birlikte gelir — **`warnings` boş değilse alarma bağlayın.**

### Birim notları

- `fillRatePercent` **yüzdedir** (`22`), oran değil (`0.22`).
- `confidence` **orandır** (`0.91`), yüzde değil (`91`).
- `*Seconds` / `*Minutes` alanları tam sayı saniye/dakikadır.
- `lastSeenAt` de tam ISO 8601 + offset biçimindedir.

---

## 3.1 Faz 1 — tip başına örnek payload

Sekiz Faz 1 tipinin tamamı, tek tek gönderilebilir hâlde:

```json
{
  "id": "evt_pc_0001",
  "storeCode": "0178",
  "cameraId": "cam-giris-01",
  "eventType": "store.person_count.updated",
  "occurredAt": "2026-08-14T14:00:00+03:00",
  "severity": "info",
  "confidence": 0.97,
  "metadata": { "count": 34, "zoneId": "giris", "periodSeconds": 300 }
}
```

```json
{
  "id": "evt_ql_0001",
  "storeCode": "0178",
  "cameraId": "cam-kasa-01",
  "eventType": "store.queue.length_changed",
  "occurredAt": "2026-08-14T14:31:05+03:00",
  "severity": "medium",
  "confidence": 0.88,
  "metadata": { "registerId": "kasa-2", "queueLength": 5, "avgWaitSeconds": 264 }
}
```

```json
{
  "id": "evt_qt_0001",
  "storeCode": "0178",
  "cameraId": "cam-kasa-01",
  "eventType": "store.queue.threshold_exceeded",
  "occurredAt": "2026-08-14T14:35:21+03:00",
  "severity": "high",
  "confidence": 0.91,
  "metadata": {
    "registerId": "kasa-2",
    "queueLength": 7,
    "avgWaitSeconds": 252,
    "maxWaitSeconds": 180
  },
  "snapshotUrl": "https://cdn.saglayici.example/0178/kasa-2/20260814143521.jpg"
}
```

```json
{
  "id": "evt_oc_0001",
  "storeCode": "0178",
  "eventType": "store.occupancy.updated",
  "occurredAt": "2026-08-14T14:35:00+03:00",
  "severity": "medium",
  "confidence": 0.93,
  "metadata": { "personCount": 118, "densityLevel": "high" }
}
```

```json
{
  "id": "evt_dw_0001",
  "storeCode": "0178",
  "cameraId": "cam-kozmetik-02",
  "eventType": "store.dwell_time.updated",
  "occurredAt": "2026-08-14T14:20:00+03:00",
  "severity": "low",
  "confidence": 0.81,
  "metadata": { "zoneId": "kozmetik", "avgDwellSeconds": 187 }
}
```

```json
{
  "id": "evt_zc_0001",
  "storeCode": "0178",
  "cameraId": "cam-parfum-01",
  "eventType": "store.zone.person_count",
  "occurredAt": "2026-08-14T14:25:00+03:00",
  "severity": "info",
  "confidence": 0.9,
  "metadata": { "zoneId": "parfumeri", "count": 12 }
}
```

```json
{
  "id": "evt_co_0001",
  "storeCode": "0178",
  "cameraId": "cam-depo-01",
  "eventType": "store.camera.offline",
  "occurredAt": "2026-08-14T14:40:02+03:00",
  "severity": "high",
  "confidence": 1,
  "metadata": { "lastSeenAt": "2026-08-14T14:37:58+03:00", "reason": "rtsp_timeout" }
}
```

```json
{
  "id": "evt_cd_0001",
  "storeCode": "0178",
  "cameraId": "cam-kasa-03",
  "eventType": "store.camera.degraded",
  "occurredAt": "2026-08-14T14:41:10+03:00",
  "severity": "medium",
  "confidence": 0.86,
  "metadata": { "issue": "obstructed" }
}
```

---

## 4. İmza — `X-StoreOS-Signature`

Algoritma **HMAC-SHA256**, paylaşılan sır (`STOREOS_INGEST_SECRET`).
**Ham gövde** imzalanır — JSON'u yeniden serileştirmeyin, gönderdiğiniz baytları imzalayın. Bir boşluk farkı bile imzayı düşürür.

### Tek kabul edilen biçim

```
X-StoreOS-Signature: t=<unix_saniye>,v1=<64_karakter_hex>
imzalanan metin    : `${unix_saniye}.${ham_govde}`
```

- Zaman damgası **±300 saniye** toleransın dışındaysa istek `401` alır → sunucu saatinizi NTP'ye bağlayın.
- `v1` büyük/küçük harf hex fark etmez.
- **Düz hex (`<hex>` / `sha256=<hex>`) kabul edilmez.** v1.0'da geriye uyum için duruyordu; zaman damgasını imzaya dahil etmediği için replay penceresini kalıcı olarak bypass etmeye açıktı, kaldırıldı.

### Hesaplama — Node.js

```js
import crypto from 'node:crypto'

// 1) Gövdeyi BİR KEZ üret ve o string'i hem imzala hem gönder.
const govde = JSON.stringify(olaylar)

// 2) Zaman damgası: unix SANİYE (milisaniye değil).
const t = Math.floor(Date.now() / 1000)

// 3) İmzalanan metin: `${t}.${govde}` — araya nokta, başka bir şey yok.
const v1 = crypto.createHmac('sha256', process.env.STOREOS_INGEST_SECRET)
                 .update(`${t}.${govde}`, 'utf8')
                 .digest('hex')

await fetch(`${TABAN}/api/storeos/olay`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-StoreOS-Signature': `t=${t},v1=${v1}`,
  },
  body: govde,          // ← aynı string. Yeniden stringify ETMEYİN.
})
```

### Hesaplama — Python

```python
import hmac, hashlib, json, time, requests

govde = json.dumps(olaylar, separators=(",", ":"))     # gönderilecek string
t = int(time.time())
v1 = hmac.new(SIR.encode(), f"{t}.{govde}".encode(), hashlib.sha256).hexdigest()

requests.post(
    f"{TABAN}/api/storeos/olay",
    data=govde.encode(),                               # ← aynı baytlar
    headers={
        "Content-Type": "application/json",
        "X-StoreOS-Signature": f"t={t},v1={v1}",
    },
)
```

### Doğrulama örneği (kendi tarafınızda test için)

```
sır    : test-sirri-123
gövde  : {"id":"evt_1","storeCode":"0178"}
t      : 1800000000
başlık : t=1800000000,v1=<HMAC-SHA256("1800000000.{\"id\":\"evt_1\",\"storeCode\":\"0178\"}")>
```

Aynı hesabı `src/lib/storeos/imza.test.ts` koşturur; uyuşmazlıkta o dosya referanstır.

---

## 5. Idempotency

`id` tekrar gelirse:
- **yeni kayıt oluşmaz**
- **yeni görev oluşmaz**
- **yeni bildirim gitmez**
- olay `olay.yinelenen` olarak denetime yazılır
- yanıt `200` (hata değil)

Gövde değişse bile `id` aynıysa **ilk kayıt korunur** — son yazan kazanmaz. Aynı paket içinde tekrarlanan `id` de yakalanır.

---

## 6. Yanıtlar

| Kod | Anlam | Tekrar denenmeli mi? |
|---|---|---|
| `202` | En az bir olay kabul edildi (kısmi başarı dahil) | Hayır |
| `200` | Hiçbiri kabul edilmedi, hiçbiri reddedilmedi → tümü yinelenen | Hayır |
| `400` | Hiçbiri kabul edilmedi ve en az biri reddedildi | **Hayır** — sebep gövdede, düzeltip gönderin |
| `401` | İmza eksik/geçersiz/tolerans dışı | Hayır — sır veya saat sorunu |
| `413` | Gövde 1 MB üstü | Hayır — bölün |
| `500` | Bizim tarafımızda hata | **Evet** — yanıtta `tekrarDenenebilir: true` |

Yanıt gövdesi:

```json
{
  "kabul": 1,
  "yinelenen": 0,
  "reddedilen": 1,
  "adapter": "generic",
  "warnings": ["eksik_metadata_anahtari"],
  "sonuclar": [
    {
      "durum": "kabul",
      "olayId": "evt_1",
      "uyarilar": ["'store.queue.threshold_exceeded' için beklenen metadata anahtarları eksik: maxWaitSeconds. …"],
      "uyariKodlari": ["eksik_metadata_anahtari"],
      "kuralOzeti": "1 kural eşleşti: Kasa kuyrugu esigi.",
      "uretilenGorevler": ["G-000001"]
    },
    {
      "durum": "reddedildi",
      "hatalar": [
        { "alan": "[1].occurredAt", "sebep": "ISO 8601 ve TIMEZONE OFFSET zorunlu. …" }
      ]
    }
  ]
}
```

### 6.1 `warnings` — sessiz kırılmaya karşı

`warnings`, gövdedeki tüm olayların uyarı kodlarının tekilleştirilmiş birleşimidir. Kodlar makine okunurdur ve **sabittir**:

| Kod | Anlamı | Ne yapmalı |
|---|---|---|
| `bilinmeyen_olay_tipi` | Tip listede yok — kabul edildi, hiçbir kurala eşleşmeyecek | Yazım hatası mı, yeni tip mi? Yeni tipse bize haber verin |
| `eksik_metadata_anahtari` | Beklenen metadata anahtarlarından bazıları yok | Anahtar adlarını §3 ile karşılaştırın |
| `sozlesme_disi_alan` | Tanımadığımız üst seviye alan yok sayıldı | Zararsız; alan gerekiyorsa sözleşmeye eklenmeli |

İnsan okunur karşılıkları eleman bazında `sonuclar[].uyarilar` içindedir.
**`warnings` boş değilse alarma bağlayın.** `202` alıp haftalarca hiçbir görev üretilmemesinin tipik sebebi budur.

### 6.2 Dizi gönderiminde kısmi kabul (davranış kararı)

Dizideki **bozuk eleman diğerlerini düşürmez.** Geçerli elemanlar işlenir, bozuk olan reddedilir, yanıt `202` döner.

Gerekçe: dizideki elemanlar bağımsız fiziksel olaylardır, tek bir işlem (transaction) değil. 200 olayın 199'unu tek bir alan hatası yüzünden çöpe atmak mağazayı kör bırakır; üstelik tekrar gönderdiğinizde o 199 zaten kabul edilmiş olacağı için (idempotency) "hepsini reddet" davranışı yeniden denemeyle de düzelmez, sadece gecikme üretir.

Bunun bedeli: `202` alıp bir kısmının düştüğünü fark etmeyebilirsiniz. Karşılığı şudur ve sözleşmenin parçasıdır:
- `reddedilen` sayacı yanıtta döner → **`reddedilen > 0` durumunu alarma bağlayın,**
- `sonuclar[]` her elemanın durumunu ayrı ayrı verir,
- dizi gönderiminde hata yolu `[index].alan` biçimindedir,
- her ret ayrıca denetim kaydına yazılır (silinemez).

**Her ret, alan adı + sebep taşır.** Bir olayda birden çok alan bozuksa hepsi **tek yanıtta** döner — ilk hatada durmayız, tek turda düzeltebilirsiniz.

---

## 7. Farklı şema gönderiyorsanız — adapter

Kanonik biçime çeviremiyorsanız **çevirmeyin.** Kendi ham biçiminizi gönderin, dönüşümü biz yazalım; `X-StoreOS-Adapter` başlığıyla seçilir.

`src/lib/storeos/adapters/ornek-vendor.ts` bunun çalışan örneğidir: farklı alan adları (`event_uuid`, `site.code`, `kind`), 1–5 severity ölçeği, yüzde cinsinden güven, epoch-ms zaman ve iç içe `payload` kullanan hayali bir sağlayıcı **tek dosyayla** bağlanır. Adapter çıktısı yine bu dokümandaki doğrulamadan geçer — adapter kendi çıktısına güvenmez.

Bilinmeyen bir adapter adı gönderilirse istek **reddedilir** — sessizce `generic`'e düşmez.

---

## 8. Test

Sunucu ayakta olmadan zincirin tamamı yerelde koşar:

```bash
npx -y tsx scripts/storeos/olay-simulatoru.ts hepsi --tekrar
npx -y tsx scripts/storeos/olay-simulatoru.ts kuyruk-artisi --vendor
npx -y tsx scripts/storeos/olay-simulatoru.ts kuyruk-artisi --bozuk
```

HTTP moduna geçmek için `--url=https://<host>` ekleyin — imza gerçek başlıkla gönderilir.

Sözleşmenin kendi kontrolleri:

```bash
node scripts/storeos/kontroller.mjs
```

---

## 9. Açık maddeler

| # | Konu | Kimde |
|---|---|---|
| 1 | Prod host + `STOREOS_INGEST_SECRET` teslimi | Ali Sales AI |
| 2 | Gerçek örnek payload — adapter'ı tahminle değil örnekle yazıyoruz | sağlayıcı |
| 3 | Faz 1 tiplerinin gönderim sıklığı ve tipik hacim (req/dk) | sağlayıcı |
