# Store OS — Olay Alım Sözleşmesi (v1.0)

**Kime:** vision/analitik sağlayıcı entegrasyon ekibi
**Uç nokta sahibi:** Ali Sales AI — Store OS
**Durum:** Alan adları, tipler ve davranış **KİLİTLİ**. Değişiklik ancak iki taraflı mutabakatla.

> Bu doküman koddaki `src/lib/storeos/olay-sozlesmesi.ts` ile birebir eşleşir.
> Uyuşmazlık olursa **kod** esastır ve doküman düzeltilir.

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
  "metadata": { "registerId": "kasa-2", "queueLength": 7, "avgWaitSeconds": 252 },
  "snapshotUrl": "https://...",
  "clipUrl": "https://..."
}
```

| Alan | Zorunlu | Tip | Kural |
|---|---|---|---|
| `id` | ✅ | string | **Idempotency anahtarı.** Azami 128 karakter. Sağlayıcı tarafında benzersiz. |
| `storeCode` | ✅ | string | Mağaza kodu. |
| `eventType` | ✅ | string | Küçük harf, nokta ayraçlı, 2–5 parça. `^[a-z][a-z0-9]*(\.[a-z0-9_]+){1,4}$` |
| `occurredAt` | ✅ | string | ISO 8601, **timezone offset ZORUNLU**. `2026-08-14T14:35:21+03:00` veya `...Z`. Offsetsiz zaman **reddedilir**. |
| `severity` | ✅ | enum | `info` · `low` · `medium` · `high` · `critical` |
| `confidence` | ✅ | number | `0`–`1` arası. Yüzde göndermeyin. |
| `metadata` | ✅ | object | JSON nesnesi (dizi/null değil). Veri yoksa `{}`. Azami 32 KB. |
| `cameraId` | — | string | |
| `snapshotUrl` | — | string | `http`/`https` |
| `clipUrl` | — | string | `http`/`https` |

Tanımadığımız üst seviye alanlar **yok sayılır** (hata değil), yanıtta `uyarilar` olarak bildirilir.

---

## 3. Olay tipleri

### Faz 1 — kural yazıldı, görev üretebilir

| `eventType` | Beklenen `metadata` anahtarları |
|---|---|
| `store.person_count.updated` | `count`, `zoneId` |
| `store.queue.length_changed` | `registerId`, `queueLength`, `avgWaitSeconds` |
| `store.queue.threshold_exceeded` | `registerId`, `queueLength`, `avgWaitSeconds`, `threshold` |
| `store.occupancy.updated` | `occupancy`, `capacity`, `occupancyRate` |
| `store.dwell_time.updated` | `zoneId`, `avgDwellSeconds` |
| `store.zone.person_count` | `zoneId`, `count` |
| `store.camera.offline` | `lastSeenAt`, `reason` |
| `store.camera.degraded` | `reason`, `frameRate` |

### Faz 2 — tip tanımlı, **kural yok**

Olay kabul edilir, kaydedilir, denetime düşer; **görev/bildirim üretmez.**

`store.shelf.stock_low` (`zoneId`,`shelfId`,`fillRate`) · `store.planogram.non_compliant` (`zoneId`,`shelfId`,`deviationRate`) · `store.safety.event_detected` (`zoneId`,`hazardType`) · `store.security.event_detected` (`zoneId`,`incidentType`) · `store.heatmap.snapshot` (`rows`,`cols`,`cells`)

### Listede olmayan tipler

**Reddedilmez.** Kabul edilir, kaydedilir, kurala eşleşmez. Böylece sağlayıcı yeni bir tip yayına aldığında entegrasyon kırılmaz. Yanıtta uyarı olarak bildirilir.

> ⚠️ **AÇIK MADDE — metadata anahtar adları.**
> Yukarıdaki `metadata` anahtar adları bizim tarafımızda kural motorunun okuduğu adlardır ve
> ilk entegrasyon dokümanında yer almıyordu. Sağlayıcı farklı adlar kullanıyorsa
> **isim değiştirmeyin** — bize bildirin, adapter tarafında eşleriz (bkz. §7).

---

## 4. İmza — `X-StoreOS-Signature`

Algoritma **HMAC-SHA256**, paylaşılan sır (`STOREOS_INGEST_SECRET`). **Ham gövde** imzalanır — JSON'u yeniden serileştirmeyin, gönderdiğiniz baytları imzalayın.

### Biçim A — tercih edilen (replay korumalı)

```
X-StoreOS-Signature: t=<unix_saniye>,v1=<hex>
imzalanan metin   : `${unix_saniye}.${ham_govde}`
```

Zaman damgası **±300 saniye** toleransın dışındaysa istek `401` alır.

### Biçim B — geriye uyum

```
X-StoreOS-Signature: <64 karakter hex>      (veya sha256=<hex>)
imzalanan metin   : ham_govde
```

Kabul edilir, ancak **replay koruması yoktur** — aynı gövde aynı imzayla süresiz tekrar gönderilebilir. Idempotency bunu pratikte zararsızlaştırır, kriptografik koruma değildir. **Yeni entegrasyonlar Biçim A kullanmalıdır.**

> ⚠️ **SÖZLEŞME EKİ:** Biçim A ilk dokümanda yoktu. Başlık adı ve algoritma değişmediği
> için **kırıcı değişiklik değildir**; mevcut Biçim B çalışmaya devam eder.

Örnek (Node.js):
```js
const govde = JSON.stringify(olaylar)
const t = Math.floor(Date.now() / 1000)
const v1 = crypto.createHmac('sha256', SIR).update(`${t}.${govde}`).digest('hex')
// başlık: `t=${t},v1=${v1}`  ·  gövde: govde  (aynı string!)
```

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
| `202` | En az bir olay kabul edildi | Hayır |
| `200` | Tümü yinelenen | Hayır |
| `400` | Gövde bozuk / tüm olaylar doğrulamayı geçemedi | **Hayır** — sebep gövdede, düzeltip gönderin |
| `401` | İmza eksik/geçersiz/zaman aşımı | Hayır — sır veya saat sorunu |
| `413` | Gövde 1 MB üstü | Hayır — bölün |
| `500` | Bizim tarafımızda hata | **Evet** — yanıtta `tekrarDenenebilir: true` |

Yanıt gövdesi:
```json
{
  "kabul": 1, "yinelenen": 0, "reddedilen": 1, "adapter": "generic",
  "sonuclar": [
    { "durum": "kabul", "olayId": "evt_1", "kuralOzeti": "1 kural eşleşti: Kasa kuyrugu esigi.",
      "uretilenGorevler": ["G-000001"] },
    { "durum": "reddedildi", "hatalar": [
      { "alan": "[1].occurredAt", "sebep": "ISO 8601 ve TIMEZONE OFFSET zorunlu. …" }
    ]}
  ]
}
```

**Her ret, alan adı + sebep taşır.** Dizi gönderiminde alan yolu `[index].alan` biçimindedir. Kısmi başarı normaldir: bozuk olay diğerlerini düşürmez.

---

## 7. Farklı şema gönderiyorsanız — adapter

Kanonik biçime çeviremiyorsanız **çevirmeyin.** Kendi ham biçiminizi gönderin, dönüşümü biz yazalım; `X-StoreOS-Adapter` başlığıyla seçilir.

`src/lib/storeos/adapters/ornek-vendor.ts` bunun çalışan örneğidir: farklı alan adları (`event_uuid`, `site.code`, `kind`), 1–5 severity ölçeği, yüzde cinsinden güven, epoch-ms zaman ve iç içe `payload` kullanan hayali bir sağlayıcı **tek dosyayla** bağlanır. Adapter çıktısı yine bu dokümandaki doğrulamadan geçer.

Bilinmeyen bir adapter adı gönderilirse istek **reddedilir** — sessizce `generic`'e düşmez.

---

## 8. Test

Sunucu ayakta olmadan zincirin tamamı yerelde koşar:

```bash
npx -y tsx scripts/storeos/olay-simulatoru.ts hepsi --tekrar
npx -y tsx scripts/storeos/olay-simulatoru.ts kuyruk-artisi --vendor
npx -y tsx scripts/storeos/olay-simulatoru.ts kuyruk-artisi --bozuk
```

HTTP moduna geçmek için `--url=https://<host>` ekleyin.

---

## 9. Açık maddeler

| # | Konu | Kimde |
|---|---|---|
| 1 | `metadata` anahtar adlarının sağlayıcı tarafında karşılığı | sağlayıcı |
| 2 | Biçim A imzaya geçiş takvimi | sağlayıcı |
| 3 | Prod host + `STOREOS_INGEST_SECRET` teslimi | Ali Sales AI |
| 4 | Gerçek örnek payload (adapter'ı tahminle değil örnekle yazıyoruz) | sağlayıcı |
