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
//
//  ── TOPLU YAZIM (17 Ağu 2026) ──────────────────────────────────────────────
//  Bir olay zinciri 6 denetim satırı üretiyor ve Airtable'da her satır AYRI bir
//  POST'tu. Depo katmanı kendini 4 istek/sn ile sınırladığı için bu 6 istek,
//  jürinin telefonuna mesaj gitmesini geciktiren en büyük tek kalemdi.
//  Çözüm: `denetimKuyrukla()` ile sarılan iş boyunca satırlar bellekte birikir,
//  iş bitince TEK POST ile yazılır (Airtable POST'u 10 kayıt alır).
//
//  BEDELİ — bilinçli kabul edildi: satırlar işin SONUNDA yazılır. Süreç işin
//  ortasında sert biçimde ölürse (SIGKILL, lambda timeout) o zincirin denetim
//  satırları kaybolur. Kabul gerekçesi: (a) `bosalt()` finally'de çalışır, yani
//  iş HATA FIRLATSA da satırlar yazılır; (b) demo ölçeğinde tek süreç var;
//  (c) alternatif olan 6 ayrı POST demonun ölçülen darboğazıydı.
//  Gerçek üründe doğru cevap kalıcı bir kuyruktur (Postgres/SQS).
//
//  Kuyruk EKLEME dışında bir yetki taşımaz — silme/güncelleme yolu yine yok.
// ════════════════════════════════════════════════════════════════════════════

import { AsyncLocalStorage } from 'node:async_hooks'

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
  gorevErtelendi:   'gorev.ertelendi',
  gorevDevredildi:  'gorev.devredildi',
  gorevYetkiRed:    'gorev.yetki_reddedildi',
  bildirimKuyruk:   'bildirim.kuyruga_alindi',
  bildirimGonderim: 'bildirim.gonderildi',
  bildirimYanit:    'bildirim.yanit',
  bildirimHata:     'bildirim.hata',
  bildirimCozulemedi: 'bildirim.cozulemedi',
  eskalasyon:       'eskalasyon.tetiklendi',
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

  // Kuyruk açıksa yazma, biriktir — `denetimKuyrukla` sonunda tek POST'la yazar.
  const kuyruk = DENETIM_KUYRUGU.getStore()
  if (kuyruk) {
    kuyruk.satirlar.push(satir)
    return
  }

  try {
    await d.denetim.yaz(satir)
  } catch (e) {
    console.error('[storeos] denetim kaydi yazilamadi', {
      aksiyon: g.aksiyon, entityId: g.entityId, hata: (e as Error).message,
    })
  }
}

// ─── Kuyruk ──────────────────────────────────────────────────────────────────

interface Kuyruk {
  satirlar: DenetimSatiri[]
}

const DENETIM_KUYRUGU = new AsyncLocalStorage<Kuyruk>()

/**
 * `is` boyunca üretilen denetim satırlarını biriktirir, bitince TEK toplu
 * yazımla gönderir. İç içe çağrılırsa dıştaki kuyruk kullanılır (satırlar en
 * dıştaki iş bitince yazılır) — çift boşaltma olmaz.
 *
 * Boşaltma `finally` içindedir: `is` hata fırlatsa bile o ana kadarki denetim
 * satırları yazılır. Hatanın kendisi yutulmaz, aynen yukarı gider.
 */
export async function denetimKuyrukla<T>(d: Depo, is: () => Promise<T>): Promise<T> {
  if (DENETIM_KUYRUGU.getStore()) return is()   // zaten kuyruk içindeyiz
  const k: Kuyruk = { satirlar: [] }
  try {
    return await DENETIM_KUYRUGU.run(k, is)
  } finally {
    await bosalt(d, k)
  }
}

/** Biriken satırları yazar. `denetimYaz` gibi hata FIRLATMAZ. */
async function bosalt(d: Depo, k: Kuyruk): Promise<void> {
  if (k.satirlar.length === 0) return
  const satirlar = k.satirlar.splice(0, k.satirlar.length)
  try {
    await d.denetim.yazCok(satirlar)
  } catch (e) {
    console.error('[storeos] denetim kuyrugu yazilamadi', {
      adet: satirlar.length,
      ilk: satirlar[0]?.['Aksiyon'],
      hata: (e as Error).message,
    })
  }
}

/** Test kolaylığı — sayacı sıfırlar, id'ler deterministik kalsın. */
export function _sayaciSifirla(): void {
  sayac = 0
}
