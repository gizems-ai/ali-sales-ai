// ════════════════════════════════════════════════════════════════════════════
//  Store OS — depo seçici.
//  İş mantığı YALNIZ `depo()` çağırır; hangi uygulamanın döndüğünü bilmez.
//  Airtable'a geçiş = tek env değişkeni (STOREOS_DEPO=airtable).
// ════════════════════════════════════════════════════════════════════════════

import { env } from '../env'
import { AirtableDeposu } from './airtable'
import { bellekDeposu } from './bellek'
import type { Depo } from './tipler'

export type { Depo } from './tipler'

const KUTU = globalThis as unknown as { __storeosAirtableDepo?: AirtableDeposu }

export function depo(): Depo {
  if (env.depo === 'airtable') {
    if (!KUTU.__storeosAirtableDepo) KUTU.__storeosAirtableDepo = new AirtableDeposu()
    return KUTU.__storeosAirtableDepo
  }
  return bellekDeposu()
}

/** Testler ve zincir demosu için: depoyu açıkça bellek olarak zorla. */
export function bellekDeposunuZorla(): Depo {
  return bellekDeposu()
}
