# n8n — Store OS WhatsApp köprüsü

> **Bu dosyanın amacı: demo sonrası TEMİZLİK.** Store OS için n8n'de ne
> kurulduğu, hangi id ile durduğu ve nasıl geri alınacağı burada yazılıdır.
> Kurulum tarihi: **17 Ağustos 2026**.

Panel 360Dialog'a doğrudan çıkmaz. Hat:

```
panel ──POST──▶ storeos-wa-giden ──▶ 360Dialog ──▶ telefon
panel ◀──POST── storeos-wa-gelen ◀── echo bot ◀── 360Dialog ◀── buton
```

Gelen tarafın echo bot'tan geçmesinin sebebi §3'te.

---

## 1. `storeos-wa-giden` — panel → WhatsApp

| | |
|---|---|
| **Workflow id** | `9Q2oRWT9yONUUM1d` |
| **Webhook** | `POST https://n8n.alisales.ai/webhook/storeos-wa-giden` |
| **Yetki** | `x-storeos-token` header = `STOREOS_N8N_WA_TOKEN` |
| **Durum** | aktif |

Düğüm zinciri:

```
Webhook — panel
   └─▶ Kapı — token ──false──▶ 401 Yanıt
          └──true──▶ Tenant Config          (Airtable, SALT OKUR)
                └─▶ Gövde Hazırla           (izin listesi + 360Dialog gövdesi)
                      └─▶ Gönderilebilir mi? ──false──▶ 403 Yanıt
                            └──true──▶ 360Dialog Gönder
                                  └─▶ Yanıt Hazırla ─▶ 200 Yanıt
```

Bilinmesi gerekenler:

- **360Dialog anahtarının yeni bir kopyası ÜRETİLMEDİ.** `Tenant Config`
  düğümü Master Tenants base'inden (`appU51BpE3zDLumLV` / `tblicQ9wTqXyn5ZsH`,
  `page_id = 905324069594`) okur — echo bot'un okuduğu satırın aynısı.
  Salt okuma; kimlik bilgisi rotasyon planı bozulmadı.
- **İzin listesi `Gövde Hazırla` içinde sabit kodlu:** `['905303227450']`.
  Bu, panel tarafındaki demo telefon kilidinin ikinci kopyasıdır — panel
  baypas edilse bile buradan başka numaraya mesaj çıkamaz.
  Liste dışı numara → `403` + gövdede sebep; panel bunu `Durum=hata` yazar.
- **Sessiz başarı yok.** 360Dialog `messages[0].id` döndürmezse `200 Yanıt`
  HTTP **502** döner ve panel gönderimi başarısız sayar.

## 2. `storeos-wa-gelen` — WhatsApp → panel

| | |
|---|---|
| **Workflow id** | `eD5YGcgofgXl5N5R` |
| **Webhook** | `POST https://n8n.alisales.ai/webhook/storeos-wa-gelen` |
| **Yetki** | `x-storeos-token` header (giden ile aynı sır) |
| **Durum** | aktif |

```
Webhook — echo fan-out        (responseMode: onReceived → çağıran beklemez)
   └─▶ Kapı — token ──false──▶ (boş dal: sessizce düşer)
          └──true──▶ Ayar — Panel Ucu
                └─▶ Normalize
                      └─▶ İşlenecek mi? ──false──▶ Atlandı (no-op)
                            └──true──▶ Panel — inbound
```

- **`Ayar — Panel Ucu` panelin URL'ini tutan TEK yerdir.** Yerel geliştirmede
  bu bir cloudflared tüneli (`https://….trycloudflare.com/api/storeos/wa/inbound`)
  ve **tünel her yeniden başladığında değişir** — o zaman yalnız bu düğüm
  güncellenir. Prod'a çıkınca kalıcı host yazılacak.
- **`Normalize` tahmin değil.** Ham 360Dialog şekli 17 Ağustos'ta echo bot
  execution `53081`'den birebir okundu:

  ```json
  {"entry":[{"changes":[{"value":{"messages":[{
     "context": {"id": "wamid.…"},        ← GİDEN mesajın id'si
     "from": "905303227450",
     "id": "wamid.…",                     ← YANITIN kendi id'si
     "timestamp": "1786965840",
     "type": "interactive",
     "interactive": {"type":"button_reply",
       "button_reply":{"id":"so1:gorev:G-000001:kabul:b-G-000001-ilk",
                       "title":"Kabul Et"}}
  }]}}]}]}
  ```

  > **TUZAK — eşleşme anahtarı `context.id`'dir, `messages[0].id` değil.**
  > `Bildirimler.Saglayici Mesaj ID` alanında giden mesajın wamid'i durur.
  > Yanıtın kendi id'si oraya hiç yazılmaz; karıştırılırsa her buton yanıtı
  > `bildirim_yok` ile reddedilir.

- Statü callback'leri (`sent`/`delivered`/`read`) aynı webhook'a düşer ve
  içlerinde `messages` yoktur → `atla: true` ile no-op dalına gider. Panele
  gönderilmez.
- Panel'e `Authorization: Bearer <STOREOS_WA_INBOUND_TOKEN>` ile gidilir.
  Panel `202` dönerse gövde çözülemedi demektir; **tekrar denenmez**
  (route sözleşmesi: `src/app/api/storeos/wa/inbound/route.ts`).

## 3. Echo bot'a eklenen dallanma (GEÇİCİ)

**Neden gerekti:** 360Dialog'da WABA numarası başına **tek bir** inbound
webhook tanımlanabiliyor ve o webhook echo bot'a ait. Store OS için ikinci
bir webhook tanımlamak echo bot'un hattını koparırdı. Bu yüzden gelen mesaj
echo bot'a düşüyor ve oradan Store OS'e dallanıyor.

| | |
|---|---|
| **Workflow** | `360Dialog WhatsApp Echo Bot` — `50sSMwjHzon1TdRU` |
| **Eklenen** | 2 düğüm + `1. Webhook (360Dialog)` çıkışına 1 bağlantı |
| **Değişen** | mevcut 62 düğümün **hiçbiri** (JSON karşılaştırmasıyla doğrulandı) |
| **Yedek** | değişiklik öncesi JSON scratchpad'de `echo-ONCE.json` |

```
1. Webhook (360Dialog) ─┬─▶ If1                  (echo bot ana akışı)
                        ├─▶ Röle — #FIRSAT mı?   (LBC, 12 Ağu'dan beri canlı)
                        ├─▶ Statü — Var mı?
                        └─▶ Store OS mu?  ──true──▶ Store OS'e Devret   ← YENİ
```

Bu, 12 Ağustos'ta LBC Fırsat Rölesi için kullanılan dallanma deseninin
aynısıdır; yeni bir mimari değildir.

`Store OS mu?` **üç şartı birden** arar (AND):

1. `messages[0].from` = `905303227450` (demo telefonu)
2. `messages[0].type` = `interactive`
3. `messages[0].interactive.button_reply.id` `so1:` ile başlıyor

Üçü birden tutmazsa false dalı **boştur** — hiçbir şey olmaz. Gerçek müşteri
mesajları (Emrah, LBC, Fiscus…) bu kapıdan geçemez.

`Store OS'e Devret` **ateşle-unut**: `neverError` + 5 sn timeout +
`onError: continueRegularOutput`. Store OS tarafı çökse, tünel kapalı olsa
veya 500 dönse bile echo bot'un kendi akışı etkilenmez.

---

## 4. Demo sonrası temizlik

Sırayla:

1. **Echo bot'u eski haline getir** — `Store OS mu?` ve `Store OS'e Devret`
   düğümlerini sil, `1. Webhook (360Dialog)` bağlantısındaki `Store OS mu?`
   girişini kaldır. Ardından **`PUT → deactivate → activate`**: aktif bir
   workflow'da yalnız PUT, çalışan kopyayı tazelemez.
   `settings` gönderirken `binaryMode` alanını **çıkar** — public API şemasında
   yok, 400 döner (ve settings zaten MERGE edildiği için kayıtta korunur).
2. `storeos-wa-gelen` (`eD5YGcgofgXl5N5R`) sil.
3. `storeos-wa-giden` (`9Q2oRWT9yONUUM1d`) sil.
4. Çalışan cloudflared tünelini durdur.

Master Tenants base'ine, echo bot'un diğer düğümlerine, LBC rölesine ve
360Dialog anahtarına **hiç dokunulmadı** — geri alınacak bir şey yok.

## 5. Ortam değişkenleri (panel tarafı)

| Değişken | Rol |
|---|---|
| `STOREOS_N8N_WA_WEBHOOK_URL` | giden webhook adresi |
| `STOREOS_N8N_WA_TOKEN` | panel ↔ n8n paylaşılan sırrı (`x-storeos-token`) |
| `STOREOS_WA_INBOUND_TOKEN` | n8n → panel bearer'ı |
| `STOREOS_KANAL` | `whatsapp` olmadan gerçek gönderim yapılmaz |
| `STOREOS_DEMO_TELEFON` | kilidin hedefi; bkz. `bildirim-kanali.md` §1.1 |

Panel URL'i n8n tarafında **`Ayar — Panel Ucu`** düğümündedir, koda gömülü
değildir.
