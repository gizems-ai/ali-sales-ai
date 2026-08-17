// ════════════════════════════════════════════════════════════════════════════
//  Store OS — DEPO HAZIRLIĞI
//
//  `depo()` senkrondur ve öyle kalmalı. Ama depo BOŞ doğar: pano ilk
//  açıldığında alarm da görev de yoktur, sağlık skoru 100 ve gerekçesi "ceza
//  kalemi yok" yazar (madde C). Bu modül aradaki tek adımı yapar — depoyu
//  döndürmeden önce açılış tohumunu BİR KEZ koşturur.
//
//  Neden ayrı dosya: `depo/index.ts` içine konsaydı depo katmanı olay alım
//  hattını (kural motoru, bildirim, kanal) import etmiş olurdu; katman yönü
//  ters döner ve döngü riski doğardı. Yön burada korunuyor: hazırlık → alım
//  → depo. Depo kimseyi tanımaz.
//
//  ── AIRTABLE DEPOSU DA TOHUMLANIR ─────────────────────────────────────────
//  İlk sürümde tohum yalnız bellek deposunda koşuyordu. Prod'da
//  STOREOS_DEPO=airtable olduğu için jüri URL'i yine BOŞ açılıyordu — yani
//  madde C prodda hiç çözülmemişti. Artık her iki depoda da koşar. Yazılan
//  base Store OS'e AYRILMIŞ base'dir; emlak/sigorta base'lerine dokunulmaz.
//
//  Güvenlik sınırları değişmedi:
//   · Olay ID'leri sabit → ikinci koşuda "yinelenen", kayıt çoğalmaz.
//   · `panoyuTohumla` kanalı AÇIKÇA konsol seçer → prodda STOREOS_KANAL
//     'whatsapp' olsa bile tohumdan tek bir WhatsApp mesajı çıkmaz.
//   · Kapatmak için: STOREOS_DEMO_TOHUMU=kapali
// ════════════════════════════════════════════════════════════════════════════

import { panoyuTohumla } from './demo-tohum'
import { depo } from './depo'
import type { Depo } from './depo'
import { env } from './env'

/**
 * Söz `globalThis`te tutulur: Next dev sunucusu modülleri hot-reload'da
 * yeniden değerlendirir, modül seviyesi `let` sıfırlanır ve tohum tekrar
 * koşardı. (Tohum idempotent olduğu için zararsız olurdu, ama gereksiz.)
 */
const KUTU = globalThis as unknown as { __storeosTohumSozu?: Promise<unknown> }

export async function depoHazir(): Promise<Depo> {
  const d = depo()
  if (env.demoTohumu === false) return d
  if (!KUTU.__storeosTohumSozu) {
    KUTU.__storeosTohumSozu = panoyuTohumla(d).catch(e => {
      // Tohum düşerse panel yine açılmalı — boş, ama ayakta.
      console.error('[storeos] acilis tohumu basarisiz:', e instanceof Error ? e.message : e)
    })
  }
  await KUTU.__storeosTohumSozu
  return d
}
