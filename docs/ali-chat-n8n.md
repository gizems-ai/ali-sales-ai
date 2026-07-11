# Ali Sohbet — n8n Webhook Sözleşmesi

Bu doküman Gizem'in kuracağı n8n workflow'u için teslimat: **(a)** payload şeması,
**(b)** birleşik sistem prompt metni, **(c)** örnek istek/cevap çifti.

Panel tarafı hazır: `POST /api/ali-chat` soruyu alır, **deterministik retrieval**
çalıştırır, aşağıdaki payload'ı `N8N_ALI_WEBHOOK_URL`'e gönderir ve dönen editöryel
metni UI'a verir. LLM **yalnız cümle kurar** — rakamlar `veriPaketi`'nden gelir.

## Kurulum (hızlı — elle node dizme yok)

Aşağıdaki 4 adım workflow'u sıfırdan kurar. Node yapısını elle dizmen gerekmez —
`docs/ali-chat-workflow.json` import edilebilir formatta hazır (3 node bağlı).

1. **Import from File** → `docs/ali-chat-workflow.json` (n8n: sağ üst ⋯ → *Import from File*).
   Webhook → OpenAI → Respond to Webhook zinciri bağlı gelir; webhook path `ali-chat`,
   respond modu "Using Respond to Webhook node" ayarlı. Prompt ve model map'li, hardcode yok.
2. **OpenAI node'una credential bağla** — node'u aç, *Credential to connect with* alanında
   OpenAI API anahtarını seç/oluştur. (Anahtar JSON'da YOK; bilerek boş bırakıldı.)
   Not: Model dropdown'da `gpt-4o-mini` seçili görünmezse listeden tekrar seç.
3. **Workflow'u aktive et** (sağ üst *Active* toggle) → Webhook node'undaki **Production URL**'i
   kopyala (biçim: `https://<n8n-host>/webhook/ali-chat`).
4. **Vercel'de env tanımla** — proje **emlak-crm** (`prj_bAk6U3nzchTXuD9JEjd8EZu0d0Vg`),
   Settings → Environment Variables:
   `N8N_ALI_WEBHOOK_URL = <kopyalanan Production URL>` → **Production + Preview** işaretle → kaydet → redeploy.

Doğrulama: panelde "Ali ile sohbet et" → bir demo sorusu sor (ör. *"Şu an yayında olan
kampanyalar hangileri?"*). Cevap gelirse zincir çalışıyor. Boş/fallback gelirse: OpenAI
credential'ını ve Respond node'unun `cevap` alanını kontrol et.

## 0. Vercel env

```
N8N_ALI_WEBHOOK_URL = https://n8n.alisales.ai/webhook/ali-chat
```

Tanımsız/erişilemez olduğunda panel kırılmaz; kullanıcı kibar fallback görür
("Şu an cevap veremiyorum — birazdan tekrar dener misin?"). Timeout: **15 sn**.

## 1. Önerilen node yapısı

```
Webhook (POST)  →  OpenAI (gpt-4o-mini, temperature 0.3, max_tokens ~450)  →  Respond to Webhook
```

- **System message:** payload'daki `sistemPrompt` alanını olduğu gibi kullan.
- **User message:** `soru` + `veriPaketi` (JSON'u string olarak göm). Öneri:

  ```
  Satışçının sorusu: {{ $json.body.soru }}

  Kullanabileceğin TEK veri (bunun dışında sayı üretme):
  {{ JSON.stringify($json.body.veriPaketi, null, 2) }}
  ```

- **Respond to Webhook:** `{ "cevap": "<LLM metni>" }` döndür. Panel `cevap`,
  `answer`, `text`, `output`, `message`, `reply` anahtarlarını da tolere eder.

## 2. Payload şeması (panel → n8n)

```jsonc
{
  "soru": "string",                    // kullanıcının ham sorusu
  "vertical": "emlak",                 // dikey (sigorta için şablon hazır)
  "persona": "Vatandaşlık",            // aktif müşteri personası veya "genel"
  "sistemPrompt": "string",            // core + emlak + YAPMA (birleşik) — system msg
  "veriPaketi": {                      // DETERMİNİSTİK retrieval çıktısı
    "intent": "stok|kampanya|musteri|eslestirme|kapsam_disi",
    "bulundu": true,
    "notlar": ["string"],              // ör. eşleştirme örnek veri uyarısı
    "filtre": { "proje": "Lagoon", "tip": "2+1", "sadeceSatilabilir": true },
    "stok": {
      "filtreOzeti": "Lagoon · 2+1 · satılabilir",
      "toplamEslesen": 12,
      "gosterilen": 8,
      "birimler": [
        { "id": "C-204", "proje": "Lagoon", "ilce": "5. Levent", "blok": "C",
          "daireNo": 204, "tip": "2+1", "brutM2": 137.17, "grup": "B",
          "emsal": "emsalde", "fiyatUSD": 420000, "fiyatTL": 21000000, "durum": "BOŞ" }
      ],
      "projeDagilimi": { "Lagoon": 12 },
      "tipDagilimi": { "2+1": 12 },
      "grupDagilimi": { "B": 9, "C": 3 },
      "fiyatUSDAralik": { "min": 380000, "max": 520000 }
    },
    "kampanya": {
      "yayindaSayisi": 2,
      "kampanyalar": [
        { "id": "seed-2gun-komisyon", "baslik": "2 Günde Komisyon",
          "teklifOzeti": "…", "kaldirac": ["komisyon","referans"],
          "hedefProje": "Lagoon", "hedefGruplar": ["C","D"],
          "bagliBirimSayisi": 34, "ornekBirimIds": ["C-204"], "yayinTarihi": "2026-07-01T09:00:00.000Z" }
      ]
    },
    "musteri": {
      "kaynak": "ornek_fixture",
      "toplam": 12,
      "musteriler": [
        { "id": "m03", "ad": "Karim Al-Rashid", "persona": "Vatandaşlık",
          "ozet": "…", "butceTL": 20000000, "konusmaOnerisi": "…", "itirazlar": ["…"] }
      ]
    },
    "eslestirme": {
      "kaynak": "ornek_fixture",
      "musteri": { "id": "m03", "ad": "Karim Al-Rashid", "persona": "Vatandaşlık", "…": "…" },
      "eslesmeler": [
        { "birimId": "B118", "birimOzet": "B118 · 4+1 · 190 m² · Güney cephe · deniz · 19,8M ₺",
          "skorEtiketi": "Çok güçlü eşleşme",     // HAM SKOR YOK — editöryel etiket
          "nedenler": ["Vatandaşlık eşiğini karşılıyor", "…"],
          "olasiItirazlar": [{ "itiraz": "Fiyat yüksek", "yanit": "…" }] }
      ]
    }
  }
}
```

> `veriPaketi` alanlarından yalnız ilgili `intent`'e ait olan(lar) dolu gelir.
> `kapsam_disi` sorular n8n'e **hiç gitmez** — panel dürüst cevabı kendi döner.

## 3. Sistem prompt

`sistemPrompt` alanı repodaki üç dosyadan birleştirilir (kaynak tek yer):
`src/lib/ali-persona/core.ts` + `src/lib/ali-persona/emlak.ts` + YAPMA listesi
(`src/lib/ali-persona/index.ts`). n8n'de **elle prompt yazma** — payload'daki
metni system message olarak kullan; prompt repo'da versiyonlanır. (Sigortan'a
kopyalarken `core` aynı kalır, yalnız dikey dosyası değişir.)

## 4. Örnek istek/cevap çifti

**İstek** (`soru`: "Karim Al-Rashid için hangi daireler uygun?", intent `eslestirme`)
→ payload'da `eslestirme` paketi + `notlar: ["Eşleştirme örnek stok üzerinde…"]`.

**Beklenen cevap** (`{ "cevap": "…" }`):

> Karim vatandaşlık + oturum peşinde, deniz manzarası ve prestij onun için önemli —
> örnek portföy üzerinden bakınca en güçlü eşleşme B118: 4+1, güney cephe, panoramik
> deniz ve vatandaşlık eşiğini rahat karşılıyor. Fiyat itirazı gelirse indirime
> gitme; m² başına deniz cepheli emsallerin altında olmasını ve prim hikâyesini öne
> çıkar. Bir sonraki adımın: ona bu daireyi "aile + vatandaşlık + prestij" çerçevesiyle
> anlatan kısa bir mesaj hazırlamak. (Not: eşleştirme şu an örnek stok üzerinde;
> 507 gerçek envantere bağlanması sıradaki iş.)

Dikkat: cevaptaki tüm somut veriler (B118, 4+1, güney, deniz) paketten gelir; LLM
yeni fiyat/oran/skor **uydurmaz**.
