// ════════════════════════════════════════════════════════════════════════════
//  Store OS — OLAY ALIM HATTI
//
//  Zincirin tek gövdesi:
//    ham payload → adapter → doğrulama → idempotency → kayıt → kural motoru
//                → görev → BİLDİRİM → kanal → denetim
//
//  HTTP'den BAĞIMSIZ. Route bunu çağırır, simülatör de doğrudan çağırabilir.
//  Böylece zincir sunucu ayakta olmadan da uçtan uca koşturulabiliyor.
// ════════════════════════════════════════════════════════════════════════════

import { adapterSec } from './adapters'
import { gorevIcinIlkBildirim } from './bildirim'
import type { Depo } from './depo'
import { DENETIM_AKSIYONLARI, denetimKuyrukla, denetimYaz } from './denetim'
import { kuraldanGorevUret } from './gorev'
import { kanal as varsayilanKanal } from './kanal'
import type { KanalArayuzu } from './kanal/tipler'
import { degerlendir } from './kural-motoru'
import { govdeyiDiziyeCevir } from './olay-sozlesmesi'
import type { AlanHatasi, UyariKodu, VisionEvent } from './olay-sozlesmesi'
import type { Kanal, OlayKaydi } from './tipler'

export type OlaySonucDurumu = 'kabul' | 'yinelenen' | 'reddedildi'

export interface OlaySonucu {
  durum: OlaySonucDurumu
  /** Reddedilende olmayabilir. */
  olayId?: string
  hatalar?: AlanHatasi[]
  /** İnsan okuyacak uyarı metinleri. */
  uyarilar?: string[]
  /** Makine okuyacak uyarı kodları. Yanıttaki `warnings` bunlardan doğar. */
  uyariKodlari?: UyariKodu[]
  /** Kural motoru özeti — "neden görev çıktı / çıkmadı". */
  kuralOzeti?: string
  uretilenGorevler?: string[]
  /** Görev başına bildirim sonucu — "mesaj gitti mi?" tek bakışta. */
  bildirimler?: { gorevNo: string; durum: string; bildirimId?: string; not?: string }[]
}

export interface AlimSonucu {
  kabul: number
  yinelenen: number
  reddedilen: number
  adapter: string
  /**
   * Gövdedeki TÜM olayların uyarı kodlarının tekilleştirilmiş birleşimi.
   * 200/202 alan ama sessizce hiçbir şey tetiklemeyen partner'ın (ör. olay
   * tipini yanlış yazan) bunu fark etmesi için yanıt gövdesine konur.
   */
  uyariKodlari: UyariKodu[]
  sonuclar: OlaySonucu[]
}

export interface AlimGirdi {
  depo: Depo
  /** JSON.parse edilmiş gövde (tekil nesne veya dizi). */
  govde: unknown
  /** X-StoreOS-Adapter başlığı. */
  adapterAdi?: string | null
  aktor: string
  aktorTipi: 'partner' | 'system' | 'kullanici'
  kaynak: 'api' | 'simulator' | 'panel'
  ip?: string
  /** Test edilebilirlik: alım zamanı. */
  simdi?: string
  /**
   * Bildirimin çıkacağı kanal. Verilmezse env'den seçilir (STOREOS_KANAL).
   * Testler ve zincir demosu burayı doldurarak gerçek HTTP'ye çıkmadan
   * uçtan uca koşabiliyor.
   */
  kanal?: KanalArayuzu
}

function olayaKayit(olay: VisionEvent, adapterAdi: string, alindi: string): OlayKaydi {
  const k: OlayKaydi = {
    'Olay ID': olay.id,
    'Magaza Kodu': olay.storeCode,
    'Olay Tipi': olay.eventType,
    'Olustu': olay.occurredAt,
    'Alindi': alindi,
    'Severity': olay.severity,
    'Guven': olay.confidence,
    'Metadata JSON': JSON.stringify(olay.metadata),
    'Kaynak Adapter': adapterAdi,
    'Islendi': false,
    'Veri Tipi': 'demo',
  }
  if (olay.cameraId) k['Kamera ID'] = olay.cameraId
  if (olay.snapshotUrl) k['Snapshot URL'] = olay.snapshotUrl
  if (olay.clipUrl) k['Klip URL'] = olay.clipUrl
  return k
}

/**
 * Zincirin giriş kapısı. Denetim satırları bu iş boyunca biriktirilir ve
 * sonunda TEK yazımla gönderilir — bkz. `denetim.ts` toplu yazım notu.
 */
export function olaylariAl(g: AlimGirdi): Promise<AlimSonucu> {
  return denetimKuyrukla(g.depo, () => olaylariAlIc(g))
}

async function olaylariAlIc(g: AlimGirdi): Promise<AlimSonucu> {
  const d = g.depo
  const ogeler = govdeyiDiziyeCevir(g.govde)
  const secim = adapterSec(g.adapterAdi, ogeler[0])

  if ('hata' in secim) {
    return {
      kabul: 0, yinelenen: 0, reddedilen: ogeler.length, adapter: 'bilinmiyor',
      uyariKodlari: [],
      sonuclar: ogeler.map(() => ({
        durum: 'reddedildi' as const,
        hatalar: [{ alan: 'X-StoreOS-Adapter', sebep: secim.hata }],
      })),
    }
  }

  const adapter = secim.adapter
  const kanalUygulamasi = g.kanal ?? varsayilanKanal()
  const sonuclar: OlaySonucu[] = []
  const tumUyariKodlari = new Set<UyariKodu>()
  let kabul = 0, yinelenen = 0, reddedilen = 0

  for (const [i, ham] of ogeler.entries()) {
    const onek = ogeler.length > 1 ? `[${i}].` : ''
    const cevrim = adapter.cevir(ham, onek)

    // ── 1. Doğrulama ──
    if (!cevrim.basarili) {
      reddedilen++
      sonuclar.push({ durum: 'reddedildi', hatalar: cevrim.hatalar })
      const kimlik = (typeof ham === 'object' && ham !== null && 'id' in ham)
        ? String((ham as Record<string, unknown>).id) : `(idsiz-${i})`
      await denetimYaz(d, {
        aktor: g.aktor, aktorTipi: g.aktorTipi,
        aksiyon: DENETIM_AKSIYONLARI.olayReddedildi,
        entityTipi: 'olay', entityId: kimlik,
        sonrasi: { adapter: adapter.ad, hatalar: cevrim.hatalar },
        ip: g.ip, kaynak: g.kaynak, zaman: g.simdi,
      })
      continue
    }

    const olay = cevrim.olay
    cevrim.uyariKodlari.forEach(k => tumUyariKodlari.add(k))
    const alindi = g.simdi ?? new Date().toISOString()

    // ── 2. Idempotency ──
    const ilkKez = await d.olaylar.yazIlkKez(olayaKayit(olay, adapter.ad, alindi))
    if (!ilkKez) {
      yinelenen++
      sonuclar.push({
        durum: 'yinelenen', olayId: olay.id,
        uyarilar: cevrim.uyarilar, uyariKodlari: cevrim.uyariKodlari,
      })
      await denetimYaz(d, {
        aktor: g.aktor, aktorTipi: g.aktorTipi,
        aksiyon: DENETIM_AKSIYONLARI.olayYinelenen,
        entityTipi: 'olay', entityId: olay.id,
        sonrasi: { not: 'Aynı Olay ID daha önce kabul edildi. Yeni kayıt/görev/bildirim üretilmedi.' },
        ip: g.ip, kaynak: g.kaynak, zaman: alindi,
      })
      continue
    }

    kabul++
    await denetimYaz(d, {
      aktor: g.aktor, aktorTipi: g.aktorTipi,
      aksiyon: DENETIM_AKSIYONLARI.olayKabul,
      entityTipi: 'olay', entityId: olay.id,
      sonrasi: {
        tip: olay.eventType, magaza: olay.storeCode, severity: olay.severity,
        guven: olay.confidence, adapter: adapter.ad,
      },
      ip: g.ip, kaynak: g.kaynak, zaman: alindi,
    })

    // ── 3. Kural motoru ──
    const kurallar = await d.kurallar.aktifKurallar(olay.eventType)
    const motor = degerlendir(olay, kurallar)

    await denetimYaz(d, {
      aktor: 'system', aktorTipi: 'system',
      aksiyon: motor.eslesenler.length ? DENETIM_AKSIYONLARI.kuralEslesti : DENETIM_AKSIYONLARI.kuralEslesmedi,
      entityTipi: 'olay', entityId: olay.id,
      sonrasi: {
        ozet: motor.ozet,
        kararlar: motor.tumKararlar.map(k => ({ kural: k.kuralAdi, eslesti: k.eslesti, gerekce: k.gerekceMetni })),
      },
      kaynak: g.kaynak, zaman: alindi,
    })

    // ── 4. Görev üretimi ──
    const magaza = await d.referans.magaza(olay.storeCode)
    const uretilen: string[] = []
    const bildirimler: NonNullable<OlaySonucu['bildirimler']> = []
    for (const { kural, karar } of motor.eslesenler) {
      const atanan = await d.referans.rolIcinKullanici(olay.storeCode, kural['Hedef Rol'])
      const gorev = await kuraldanGorevUret(d, {
        olay, kural, karar,
        magazaAdi: magaza?.['Ad'],
        atananKullaniciId: atanan?.['Kullanici ID'],
        simdi: alindi,
      })
      if (!gorev) continue
      uretilen.push(gorev['Gorev No'])

      // ── 5. Bildirim ──
      // Gönderim hatası zinciri KIRMAZ: görev zaten oluştu ve panelde duruyor.
      // Hata bildirim kaydında 'hata' olarak kalır, sessizce yutulmaz.
      const bs = await gorevIcinIlkBildirim({
        depo: d, kanal: kanalUygulamasi, gorev,
        hedefKanal: (kural['Bildirim Kanali'] ?? 'panel') as Kanal,
        simdi: alindi,
      })
      bildirimler.push(
        bs.durum === 'alici_yok'
          ? { gorevNo: gorev['Gorev No'], durum: bs.durum, not: bs.sebep }
          : {
              gorevNo: gorev['Gorev No'], durum: bs.durum,
              bildirimId: bs.bildirim['Bildirim ID'],
              not: bs.durum === 'hata' ? bs.hata : undefined,
            },
      )
    }

    await d.olaylar.isaretle(olay.id, {
      'Islendi': true,
      'Eslesen Kural': motor.eslesenler.map(e => e.kural['Kural Adi']).join(', ') || '',
    })

    sonuclar.push({
      durum: 'kabul',
      olayId: olay.id,
      uyarilar: cevrim.uyarilar,
      uyariKodlari: cevrim.uyariKodlari,
      kuralOzeti: motor.ozet,
      uretilenGorevler: uretilen,
      bildirimler,
    })
  }

  return {
    kabul, yinelenen, reddedilen, adapter: adapter.ad,
    uyariKodlari: [...tumUyariKodlari],
    sonuclar,
  }
}
