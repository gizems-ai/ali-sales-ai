// ════════════════════════════════════════════════════════════════════════════
//  Store OS — BUTON KİMLİĞİ (ileri-geri çözümleme)
//
//  WhatsApp interaktif butonu bize geri yalnız `id`'sini gönderir; hangi görev
//  için basıldığını başka hiçbir şey söylemez. Bu yüzden görev numarası ve
//  aksiyon id'nin İÇİNDE taşınır.
//
//  BİÇİM:  so1:gorev:<GorevNo>:<aksiyon>:<bildirimId>
//
//   · `so1`      — sürüm öneki. Biçim değişirse eski butonlar sessizce yanlış
//                  yorumlanmasın diye; `so2` geldiğinde `so1` hâlâ çözülür.
//   · `gorev`    — entity tipi. İleride 'kural' / 'vardiya' gelebilir.
//   · aksiyon    — kabul | devret | ertele
//   · bildirimId — hangi mesaja basıldığı. Aynı görev için iki bildirim
//                  gitmişse (ör. eskalasyon) hangisinin yanıtlandığı belli olur.
//
//  SINIR: WhatsApp buton id'si 256 karakter. Alanlarımız kısa; yine de
//  `butonIdUret` sınırı aşarsa HATA FIRLATIR — sessizce kırpmak, çözülemeyen
//  bir id üretip yanıtı çöpe atmak demektir.
//
//  AYRAÇ ':' — Gorev No ('G-000042') ve Bildirim ID ('b-G-000042-k0') içinde
//  iki nokta geçmez. `uret` bunu yine de doğrular: veri ayraç içeriyorsa
//  üretim aşamasında patlar, çözümleme aşamasında değil.
// ════════════════════════════════════════════════════════════════════════════

import { butonAksiyonuMu } from './tipler'
import type { ButonAksiyonu } from './tipler'

const SURUM = 'so1'
const AYRAC = ':'
const AZAMI_UZUNLUK = 256

export interface ButonKimligi {
  gorevNo: string
  aksiyon: ButonAksiyonu
  bildirimId: string
}

export function butonIdUret(k: ButonKimligi): string {
  for (const [ad, deger] of [['gorevNo', k.gorevNo], ['bildirimId', k.bildirimId]] as const) {
    if (!deger) throw new Error(`[storeos] buton id: ${ad} boş olamaz`)
    if (deger.includes(AYRAC)) {
      throw new Error(`[storeos] buton id: ${ad} ayraç '${AYRAC}' içeremez: ${deger}`)
    }
  }
  const id = [SURUM, 'gorev', k.gorevNo, k.aksiyon, k.bildirimId].join(AYRAC)
  if (id.length > AZAMI_UZUNLUK) {
    throw new Error(`[storeos] buton id ${id.length} karakter, sınır ${AZAMI_UZUNLUK}: ${id}`)
  }
  return id
}

/**
 * Çözemezse `null`. Kısmen tanıdık bir id'yi tahminle tamamlamak YOK —
 * yanlış görevi kapatmaktansa yanıtı "çözülemedi" diye denetime yazmak iyidir.
 */
export function butonIdCoz(id: unknown): ButonKimligi | null {
  if (typeof id !== 'string') return null
  const p = id.split(AYRAC)
  if (p.length !== 5) return null
  const [surum, entity, gorevNo, aksiyon, bildirimId] = p
  if (surum !== SURUM) return null
  if (entity !== 'gorev') return null
  if (!gorevNo || !bildirimId) return null
  if (!butonAksiyonuMu(aksiyon)) return null
  return { gorevNo, aksiyon, bildirimId }
}

/** Kullanıcının gördüğü etiketler. WhatsApp sınırı 20 karakter. */
export const BUTON_ETIKETLERI: Record<ButonAksiyonu, string> = {
  kabul:  'Kabul Et',
  devret: 'Başkasına Ata',
  ertele: '5 Dakika Ertele',
}
