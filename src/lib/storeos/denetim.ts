// ════════════════════════════════════════════════════════════════════════════
//  Store OS — DENETİM KAYDI (append-only)
//
//  KURAL: Bu dosyada güncelleme veya silme fonksiyonu YOKTUR ve YAZILMAYACAKTIR.
//  Kabul kriteri 5 — "zincirin her adımı denetim kaydında görünür, kayıtlar
//  silinemez". Airtable şema seviyesinde append-only zorlayamadığı için garanti
//  budur: silme yolu kodda hiç var olmaz.
//
//  Bu dosyaya `sil`, `guncelle`, `temizle`, `duzelt` adlı bir fonksiyon eklemek
//  kabul kriterini ihlal eder. Eklemeden önce sözleşmeyi değiştirin.
// ════════════════════════════════════════════════════════════════════════════

import type { Depo } from './depo'
import type { AktorTipi, DenetimSatiri } from './tipler'

/** Denetim aksiyonları — serbest string yerine sabit liste (rapor filtrelenebilsin). */
export const DENETIM_AKSIYONLARI = {
  olayKabul:        'olay.kabul',
  olayYinelenen:    'olay.yinelenen',
  olayReddedildi:   'olay.reddedildi',
  olayImzaHatasi:   'olay.imza_hatasi',
  kuralEslesti:     'kural.eslesti',
  kuralEslesmedi:   'kural.eslesmedi',
  gorevOlusturuldu: 'gorev.olusturuldu',
  gorevDurum:       'gorev.durum',
  gorevGecisRed:    'gorev.gecis_reddedildi',
  bildirimKuyruk:   'bildirim.kuyruga_alindi',
  bildirimGonderim: 'bildirim.gonderildi',
  bildirimYanit:    'bildirim.yanit',
  bildirimHata:     'bildirim.hata',
} as const

export type DenetimAksiyonu = (typeof DENETIM_AKSIYONLARI)[keyof typeof DENETIM_AKSIYONLARI]

export interface DenetimGirdi {
  aktor: string
  aktorTipi: AktorTipi
  aksiyon: DenetimAksiyonu
  entityTipi: 'olay' | 'gorev' | 'bildirim' | 'kural'
  entityId: string
  oncesi?: unknown
  sonrasi?: unknown
  ip?: string
  kaynak: 'api' | 'panel' | 'n8n' | 'cron' | 'seed' | 'simulator'
  /** Test edilebilirlik: verilmezse `new Date()`. */
  zaman?: string
}

let sayac = 0

/** Kayıt id'si — zaman + artan sayaç. Math.random YOK. */
function kayitId(zaman: string): string {
  sayac = (sayac + 1) % 1_000_000
  const damga = zaman.replace(/[-:.TZ+]/g, '').slice(0, 17)
  return `d-${damga}-${String(sayac).padStart(6, '0')}`
}

function kisalt(x: unknown): string | undefined {
  if (x === undefined) return undefined
  try {
    const s = JSON.stringify(x)
    // Airtable long-text alanı pratikte 100k; 8k'da kesiyoruz — denetim kaydı
    // kanıt içindir, arşiv değil.
    return s.length > 8000 ? `${s.slice(0, 8000)}…[kirpildi]` : s
  } catch {
    return '"[serilestirilemedi]"'
  }
}

/**
 * Tek yazma yolu. Hata FIRLATMAZ — denetim yazımı başarısız diye asıl iş
 * akışı çökmemeli. Başarısızlık console.error ile görünür kalır.
 * (Gerçek üründe bu bir kuyruğa düşer; demo için bilinçli sadelik.)
 */
export async function denetimYaz(d: Depo, g: DenetimGirdi): Promise<void> {
  const zaman = g.zaman ?? new Date().toISOString()
  const satir: DenetimSatiri = {
    'Kayit ID': kayitId(zaman),
    'Zaman': zaman,
    'Aktor': g.aktor,
    'Aktor Tipi': g.aktorTipi,
    'Aksiyon': g.aksiyon,
    'Entity Tipi': g.entityTipi,
    'Entity ID': g.entityId,
    'Kaynak': g.kaynak,
  }
  const oncesi = kisalt(g.oncesi)
  const sonrasi = kisalt(g.sonrasi)
  if (oncesi !== undefined) satir['Oncesi JSON'] = oncesi
  if (sonrasi !== undefined) satir['Sonrasi JSON'] = sonrasi
  if (g.ip) satir['IP'] = g.ip

  try {
    await d.denetim.yaz(satir)
  } catch (e) {
    console.error('[storeos] denetim kaydi yazilamadi', {
      aksiyon: g.aksiyon, entityId: g.entityId, hata: (e as Error).message,
    })
  }
}

/** Test kolaylığı — sayacı sıfırlar, id'ler deterministik kalsın. */
export function _sayaciSifirla(): void {
  sayac = 0
}
