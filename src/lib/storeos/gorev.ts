// ════════════════════════════════════════════════════════════════════════════
//  Store OS — GÖREV DURUM MAKİNESİ
//
//  Geçiş tablosu TEK YERDE (GECISLER). Kod başka hiçbir yerde durum
//  karşılaştırması yapıp kendi kararını vermez; herkes `gecisYap()` çağırır.
//
//  Ana hat:   yeni → atandi → goruldu → basladi → beklemede → tamamlandi
//  Yan dallar: onay_bekliyor · reddedildi · suresi_gecti · iptal
// ════════════════════════════════════════════════════════════════════════════

import type { Depo } from './depo'
import { DENETIM_AKSIYONLARI, denetimYaz } from './denetim'
import type { GorevDurumu, Gorev, Kural, Oncelik, Rol } from './tipler'
import type { VisionEvent } from './olay-sozlesmesi'
import type { KuralKarari } from './kural-motoru'

// ─── Geçiş tablosu ───────────────────────────────────────────────────────────

/**
 * Kaynak durum → izin verilen hedef durumlar.
 * Listede olmayan her geçiş REDDEDİLİR (whitelist, blacklist değil).
 */
export const GECISLER: Record<GorevDurumu, readonly GorevDurumu[]> = {
  yeni:          ['atandi', 'iptal', 'suresi_gecti'],
  atandi:        ['goruldu', 'basladi', 'reddedildi', 'atandi', 'iptal', 'suresi_gecti'],
  goruldu:       ['basladi', 'reddedildi', 'atandi', 'iptal', 'suresi_gecti'],
  basladi:       ['beklemede', 'onay_bekliyor', 'tamamlandi', 'iptal', 'suresi_gecti'],
  beklemede:     ['basladi', 'onay_bekliyor', 'tamamlandi', 'iptal', 'suresi_gecti'],
  onay_bekliyor: ['tamamlandi', 'reddedildi', 'basladi', 'iptal', 'suresi_gecti'],

  // ── Uç durumlar ──
  tamamlandi:    [],                     // nihai
  reddedildi:    ['atandi', 'iptal'],    // başkasına atanabilir
  suresi_gecti:  ['atandi', 'basladi', 'iptal', 'tamamlandi'],
  iptal:         [],                     // nihai
}

export const NIHAI_DURUMLAR: readonly GorevDurumu[] = ['tamamlandi', 'iptal']

export function nihaiMi(durum: GorevDurumu): boolean {
  return NIHAI_DURUMLAR.includes(durum)
}

export function gecisGecerliMi(kaynak: GorevDurumu, hedef: GorevDurumu): boolean {
  return (GECISLER[kaynak] ?? []).includes(hedef)
}

/** Geçiş reddedilirse insan-okur sebep. API 409 gövdesine bu yazılır. */
export function gecisSebebi(kaynak: GorevDurumu, hedef: GorevDurumu): string | null {
  if (gecisGecerliMi(kaynak, hedef)) return null
  if (kaynak === hedef) return `Görev zaten '${kaynak}' durumunda.`
  if (nihaiMi(kaynak)) return `'${kaynak}' nihai bir durum; görev artık değiştirilemez.`
  const izinli = GECISLER[kaynak] ?? []
  return `'${kaynak}' → '${hedef}' geçişine izin yok. İzin verilenler: ${izinli.join(', ') || '(yok)'}.`
}

// ─── Durum değişimi ──────────────────────────────────────────────────────────

export interface GecisGirdi {
  gorevNo: string
  hedef: GorevDurumu
  aktor: string
  aktorTipi: 'kullanici' | 'system' | 'partner'
  kaynak: 'api' | 'panel' | 'n8n' | 'cron' | 'simulator'
  /** 'Başkasına ata' akışı — atanan kullanıcıyı da değiştirir. */
  yeniAtanan?: string
  not?: string
  /** Test edilebilirlik. */
  simdi?: string
}

export type GecisSonucu =
  | { basarili: true; gorev: Gorev }
  | { basarili: false; sebep: string; kod: 'bulunamadi' | 'gecersiz_gecis' }

/** Durum → hangi zaman damgası alanına yazılır. */
const ZAMAN_ALANI: Partial<Record<GorevDurumu, keyof Gorev>> = {
  goruldu: 'Goruldu',
  basladi: 'Baslandi',
  tamamlandi: 'Tamamlandi',
}

export async function gecisYap(d: Depo, g: GecisGirdi): Promise<GecisSonucu> {
  const mevcut = await d.gorevler.getir(g.gorevNo)
  if (!mevcut) {
    return { basarili: false, kod: 'bulunamadi', sebep: `Görev bulunamadı: ${g.gorevNo}` }
  }

  const sebep = gecisSebebi(mevcut['Durum'], g.hedef)
  if (sebep) {
    // Reddedilen geçiş de denetime yazılır — "kim neyi denedi" izi kalsın.
    await denetimYaz(d, {
      aktor: g.aktor, aktorTipi: g.aktorTipi,
      aksiyon: DENETIM_AKSIYONLARI.gorevGecisRed,
      entityTipi: 'gorev', entityId: g.gorevNo,
      oncesi: { durum: mevcut['Durum'] },
      sonrasi: { istenenDurum: g.hedef, red: sebep },
      kaynak: g.kaynak, zaman: g.simdi,
    })
    return { basarili: false, kod: 'gecersiz_gecis', sebep }
  }

  const simdi = g.simdi ?? new Date().toISOString()
  const degisiklik: Partial<Gorev> = { 'Durum': g.hedef }
  const zamanAlani = ZAMAN_ALANI[g.hedef]
  if (zamanAlani) (degisiklik as Record<string, unknown>)[zamanAlani] = simdi
  if (g.yeniAtanan) degisiklik['Atanan Kullanici ID'] = g.yeniAtanan

  const yeni = await d.gorevler.guncelle(g.gorevNo, degisiklik)

  await denetimYaz(d, {
    aktor: g.aktor, aktorTipi: g.aktorTipi,
    aksiyon: DENETIM_AKSIYONLARI.gorevDurum,
    entityTipi: 'gorev', entityId: g.gorevNo,
    oncesi: { durum: mevcut['Durum'], atanan: mevcut['Atanan Kullanici ID'] },
    sonrasi: { durum: g.hedef, atanan: yeni['Atanan Kullanici ID'], not: g.not },
    kaynak: g.kaynak, zaman: simdi,
  })

  return { basarili: true, gorev: yeni }
}

// ─── Kuraldan görev üretimi ──────────────────────────────────────────────────

/**
 * Şablon doldurma: '{metadata.queueLength}' → olaydaki değer.
 * Desteklenen kökler: metadata.* · severity · confidence · storeCode ·
 * cameraId · eventType, ayrıca {magaza} ve {kamera} kısayolları.
 * Bulunamayan yer tutucu OLDUĞU GİBİ bırakılmaz; '—' yazılır (demoda
 * '{metadata.foo}' görünmesi kabul edilemez).
 */
export function sablonDoldur(sablon: string, olay: VisionEvent, magazaAdi?: string): string {
  return sablon.replace(/\{([a-zA-Z0-9_.]+)\}/g, (_esles, yol: string) => {
    if (yol === 'magaza') return magazaAdi ?? olay.storeCode
    if (yol === 'kamera') return olay.cameraId ?? '—'
    const deger = olaydanOku(olay, yol)
    if (deger === undefined || deger === null) return '—'
    return String(deger)
  })
}

/** Nokta yolundan olay alanı okur. Kural motoru da bunu kullanır. */
export function olaydanOku(olay: VisionEvent, yol: string): unknown {
  const parcalar = yol.split('.')
  let mevcut: unknown = olay
  for (const p of parcalar) {
    if (mevcut === null || mevcut === undefined) return undefined
    if (typeof mevcut !== 'object') return undefined
    mevcut = (mevcut as Record<string, unknown>)[p]
  }
  return mevcut
}

export interface GorevUretGirdi {
  olay: VisionEvent
  kural: Kural
  karar: KuralKarari
  magazaAdi?: string
  atananKullaniciId?: string
  simdi?: string
}

export async function kuraldanGorevUret(d: Depo, g: GorevUretGirdi): Promise<Gorev | null> {
  // IDEMPOTENCY İKİNCİ HAT: aynı olay + aynı kural = tek görev.
  // İlk hat olay id'sidir (route'ta); bu, kural motorunun yeniden koşturulması
  // durumunda ikinci görevin oluşmasını engeller.
  if (await d.gorevler.olayVeKuraldanVarMi(g.olay.id, g.kural['Kural Adi'])) return null

  const simdi = g.simdi ?? new Date().toISOString()
  const gorevNo = await d.gorevler.sonrakiNumara()
  const slaDk = Number(g.kural['SLA Dakika']) || 30
  const sonTeslim = new Date(new Date(simdi).getTime() + slaDk * 60_000).toISOString()

  const gorev: Gorev = {
    'Gorev No': gorevNo,
    'Baslik': sablonDoldur(g.kural['Gorev Basligi'], g.olay, g.magazaAdi),
    'Aciklama': sablonDoldur(g.kural['Gorev Aciklamasi'], g.olay, g.magazaAdi),
    'Magaza Kodu': g.olay.storeCode,
    'Kaynak Olay ID': g.olay.id,
    'Kural': g.kural['Kural Adi'],
    'Gerekce': g.karar.gerekceMetni,
    'Atanan Rol': g.kural['Hedef Rol'] as Rol,
    'Oncelik': g.kural['Oncelik'] as Oncelik,
    'Durum': 'yeni',
    'Olusturuldu': simdi,
    'Son Teslim': sonTeslim,
    'Kanit Gerekli': !!g.kural['Kanit Gerekli'],
    'Veri Tipi': 'demo',
  }
  if (g.atananKullaniciId) gorev['Atanan Kullanici ID'] = g.atananKullaniciId

  const olusan = await d.gorevler.olustur(gorev)

  await denetimYaz(d, {
    aktor: 'system', aktorTipi: 'system',
    aksiyon: DENETIM_AKSIYONLARI.gorevOlusturuldu,
    entityTipi: 'gorev', entityId: gorevNo,
    sonrasi: {
      kural: g.kural['Kural Adi'],
      olayId: g.olay.id,
      gerekce: g.karar.gerekceMetni,
      atananRol: gorev['Atanan Rol'],
      sonTeslim,
    },
    kaynak: 'api', zaman: simdi,
  })

  // Atanan kullanıcı belliyse görev doğrudan 'atandi'ya geçer — durum makinesi
  // üzerinden, elle alan set ederek değil.
  if (g.atananKullaniciId) {
    const gecis = await gecisYap(d, {
      gorevNo, hedef: 'atandi', aktor: 'system', aktorTipi: 'system',
      kaynak: 'api', simdi,
    })
    if (gecis.basarili) return gecis.gorev
  }

  return olusan
}
