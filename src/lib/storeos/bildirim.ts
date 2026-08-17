// ════════════════════════════════════════════════════════════════════════════
//  Store OS — BİLDİRİM ÜRETİMİ VE GÖNDERİMİ
//
//  Zincirdeki halka:  görev doğdu → BİLDİRİM → kanal → telefon
//
//  ── IDEMPOTENCY (kabul kriteri) ───────────────────────────────────────────
//  `Bildirim ID` DETERMİNİSTİK:  b-<GorevNo>-<kademe>
//  Böylece "bu görev için bu bildirim gitti mi?" sorusu, hiçbir yerde ekstra
//  durum tutmadan cevaplanır. Aynı kural iki kez tetiklenirse (ör. partner
//  aynı olayı tekrar gönderdi, ya da eskalasyon cron'u iki kez koştu)
//  kullanıcı İKİ MESAJ ALMAZ.
//
//  Anahtar neden `kademe` içeriyor: aynı görev için birden fazla MEŞRU mesaj
//  vardır (ilk bildirim, 5 dk hatırlatma, bölge müdürüne eskalasyon). Bunlar
//  ayrı kademelerdir; tekrar değil. Anahtar sadece görev numarası olsaydı
//  eskalasyon hiç gönderilemezdi.
//
//  ── GÖNDERİM BAŞARISIZLIĞI ────────────────────────────────────────────────
//  Bildirim kaydı gönderimden ÖNCE yazılır. n8n düşerse kayıt 'hata'
//  durumunda kalır ve panelde görünür — "mesaj gitti sanılıp gitmemiş olması"
//  sessiz kalmaz. Gönderim hatası zinciri KIRMAZ: görev zaten oluştu.
// ════════════════════════════════════════════════════════════════════════════

import type { Depo } from './depo'
import { DENETIM_AKSIYONLARI, denetimYaz } from './denetim'
import { BUTON_ETIKETLERI, butonIdUret } from './kanal/buton'
import { BUTON_AKSIYONLARI } from './kanal/tipler'
import type { ButonAksiyonu, GidenButon, KanalArayuzu } from './kanal/tipler'
import type { Bildirim, Gorev, Kullanici, Kanal } from './tipler'

// ─── Kademeler ───────────────────────────────────────────────────────────────

/**
 * Bir görev için gönderilebilecek MEŞRU mesaj türleri. Idempotency anahtarının
 * ikinci parçası budur. Yeni kademe eklemek = yeni bir meşru mesaj tanımlamak.
 */
export const KADEMELER = ['ilk', 'hatirlatma', 'bolge', 'merkez', 'devir'] as const
export type Kademe = (typeof KADEMELER)[number]

const KADEME_ONEKI: Record<Kademe, string> = {
  ilk:        '',
  hatirlatma: '⏰ HATIRLATMA — ',
  bolge:      '⬆️ ESKALASYON (bölge) — ',
  merkez:     '⬆️⬆️ ESKALASYON (merkez) — ',
  devir:      '↪️ SANA DEVREDİLDİ — ',
}

export function bildirimIdUret(gorevNo: string, kademe: Kademe): string {
  return `b-${gorevNo}-${kademe}`
}

// ─── Mesaj gövdesi ───────────────────────────────────────────────────────────

/**
 * Tek satırlık kural: mesaj GÖREVİ anlatır, olayı değil. Alıcı ne yapması
 * gerektiğini ilk satırda görmeli; gerekçe altta kalır.
 */
export function mesajGovdesi(g: Gorev, kademe: Kademe, simdi: string): string {
  const kalanDk = Math.round((Date.parse(g['Son Teslim']) - Date.parse(simdi)) / 60_000)
  const sure = kalanDk >= 0 ? `${kalanDk} dk içinde` : `${Math.abs(kalanDk)} dk GECİKMİŞ`
  return [
    `${KADEME_ONEKI[kademe]}${g['Baslik']}`,
    '',
    g['Aciklama'],
    '',
    `Görev: ${g['Gorev No']}  ·  Öncelik: ${g['Oncelik']}  ·  ${sure}`,
    `Gerekçe: ${g['Gerekce']}`,
  ].join('\n')
}

function butonlar(gorevNo: string, bildirimId: string): GidenButon[] {
  return BUTON_AKSIYONLARI.map((a: ButonAksiyonu) => ({
    id: butonIdUret({ gorevNo, aksiyon: a, bildirimId }),
    etiket: BUTON_ETIKETLERI[a],
  }))
}

// ─── Gönderim ────────────────────────────────────────────────────────────────

export interface BildirimGirdi {
  depo: Depo
  kanal: KanalArayuzu
  gorev: Gorev
  alici: Kullanici
  kademe: Kademe
  /** Kuralın 'Bildirim Kanali' alanı — kayıtta hangi kanalın hedeflendiği. */
  kanalAdi?: Kanal
  aktor?: string
  simdi?: string
}

export type BildirimSonucu =
  | { durum: 'gonderildi'; bildirim: Bildirim }
  | { durum: 'zaten_var';  bildirim: Bildirim }
  | { durum: 'hata';       bildirim: Bildirim; hata: string; tekrarDenenebilir: boolean }
  | { durum: 'alici_yok';  sebep: string }

export async function bildirimGonder(g: BildirimGirdi): Promise<BildirimSonucu> {
  const d = g.depo
  const simdi = g.simdi ?? new Date().toISOString()
  const gorevNo = g.gorev['Gorev No']
  const bildirimId = bildirimIdUret(gorevNo, g.kademe)

  const telefon = g.alici['Telefon']?.trim()
  if (!telefon) {
    // Sessizce atlamıyoruz: alıcısı olmayan bildirim bir yapılandırma hatasıdır
    // ve demoda fark edilmesi gerekir.
    const sebep = `Alıcının telefonu yok: ${g.alici['Kullanici ID']}`
    await denetimYaz(d, {
      aktor: g.aktor ?? 'system', aktorTipi: 'system',
      aksiyon: DENETIM_AKSIYONLARI.bildirimHata,
      entityTipi: 'bildirim', entityId: bildirimId,
      sonrasi: { sebep, gorevNo }, kaynak: 'api', zaman: simdi,
    })
    return { durum: 'alici_yok', sebep }
  }

  const govde = mesajGovdesi(g.gorev, g.kademe, simdi)
  const taslak: Bildirim = {
    'Bildirim ID': bildirimId,
    'Gorev No': gorevNo,
    'Kanal': g.kanalAdi ?? g.kanal.ad,
    'Alici Kullanici ID': g.alici['Kullanici ID'],
    'Alici Telefon': telefon,
    'Govde': govde,
    'Gonderim Zamani': simdi,
    'Durum': 'kuyrukta',
  }
  if (g.gorev['Kaynak Olay ID']) taslak['Olay ID'] = g.gorev['Kaynak Olay ID']

  // ── IDEMPOTENCY KAPISI ──
  const { ilkKez, bildirim } = await d.bildirimler.olusturIlkKez(taslak)
  if (!ilkKez) {
    await denetimYaz(d, {
      aktor: g.aktor ?? 'system', aktorTipi: 'system',
      aksiyon: DENETIM_AKSIYONLARI.bildirimKuyruk,
      entityTipi: 'bildirim', entityId: bildirimId,
      sonrasi: {
        not: 'Bu görev + kademe için bildirim zaten üretilmişti. İkinci mesaj GÖNDERİLMEDİ.',
        mevcutDurum: bildirim['Durum'],
      },
      kaynak: 'api', zaman: simdi,
    })
    return { durum: 'zaten_var', bildirim }
  }

  await denetimYaz(d, {
    aktor: g.aktor ?? 'system', aktorTipi: 'system',
    aksiyon: DENETIM_AKSIYONLARI.bildirimKuyruk,
    entityTipi: 'bildirim', entityId: bildirimId,
    sonrasi: {
      gorevNo, kademe: g.kademe, kanal: taslak['Kanal'],
      alici: g.alici['Kullanici ID'], telefon,
    },
    kaynak: 'api', zaman: simdi,
  })

  // ── Kanala ver ──
  const sonuc = await g.kanal.gonder({
    bildirimId,
    aliciTelefon: telefon,
    aliciAd: g.alici['Ad Soyad'],
    govde,
    butonlar: butonlar(gorevNo, bildirimId),
    gorevNo,
  })

  if (!sonuc.basarili) {
    const guncel = await d.bildirimler.guncelle(bildirimId, {
      'Durum': 'hata',
      'Hata': sonuc.hata.slice(0, 500),
    })
    await denetimYaz(d, {
      aktor: g.aktor ?? 'system', aktorTipi: 'system',
      aksiyon: DENETIM_AKSIYONLARI.bildirimHata,
      entityTipi: 'bildirim', entityId: bildirimId,
      sonrasi: { hata: sonuc.hata, tekrarDenenebilir: sonuc.tekrarDenenebilir, kanal: g.kanal.ad },
      kaynak: 'api', zaman: simdi,
    })
    return { durum: 'hata', bildirim: guncel, hata: sonuc.hata, tekrarDenenebilir: sonuc.tekrarDenenebilir }
  }

  const guncel = await d.bildirimler.guncelle(bildirimId, {
    'Durum': 'gonderildi',
    'Saglayici Mesaj ID': sonuc.saglayiciMesajId,
  })
  await denetimYaz(d, {
    aktor: g.aktor ?? 'system', aktorTipi: 'system',
    aksiyon: DENETIM_AKSIYONLARI.bildirimGonderim,
    entityTipi: 'bildirim', entityId: bildirimId,
    sonrasi: {
      gorevNo, kanal: g.kanal.ad, saglayiciMesajId: sonuc.saglayiciMesajId,
      not: sonuc.not,
    },
    kaynak: 'api', zaman: simdi,
  })
  return { durum: 'gonderildi', bildirim: guncel }
}

// ─── Görev doğduğunda ────────────────────────────────────────────────────────

/**
 * Olay alım hattı bunu çağırır. Atanan kullanıcı yoksa role göre bulur; o da
 * yoksa bildirim üretilmez ve sebebi denetime düşer.
 *
 * `kural['Bildirim Kanali']` = 'panel' olan kurallar mesaj GÖNDERMEZ ama
 * bildirim kaydı yine de üretilir: panelde "bu görev için haber verildi mi?"
 * sorusunun cevabı tek yerden okunsun diye.
 */
export async function gorevIcinIlkBildirim(a: {
  depo: Depo
  kanal: KanalArayuzu
  gorev: Gorev
  hedefKanal: Kanal
  simdi?: string
}): Promise<BildirimSonucu> {
  const d = a.depo
  const simdi = a.simdi ?? new Date().toISOString()

  const alici = await aliciBul(d, a.gorev)
  if (!alici) {
    const sebep = `'${a.gorev['Atanan Rol']}' rolünde aktif kullanıcı yok (mağaza ${a.gorev['Magaza Kodu']}).`
    await denetimYaz(d, {
      aktor: 'system', aktorTipi: 'system',
      aksiyon: DENETIM_AKSIYONLARI.bildirimHata,
      entityTipi: 'gorev', entityId: a.gorev['Gorev No'],
      sonrasi: { sebep }, kaynak: 'api', zaman: simdi,
    })
    return { durum: 'alici_yok', sebep }
  }

  // 'panel' kanallı kurallarda telefona mesaj çıkmaz; kayıt yine de düşer.
  const kanalUygulamasi = a.hedefKanal === 'panel' ? sessizKanal(a.kanal) : a.kanal

  return bildirimGonder({
    depo: d, kanal: kanalUygulamasi, gorev: a.gorev, alici,
    kademe: 'ilk', kanalAdi: a.hedefKanal, simdi,
  })
}

export async function aliciBul(d: Depo, gorev: Gorev): Promise<Kullanici | null> {
  const atananId = gorev['Atanan Kullanici ID']
  if (atananId) {
    const hepsi = await d.referans.kullanicilar(gorev['Magaza Kodu'])
    const bulunan = hepsi.find(k => k['Kullanici ID'] === atananId)
    if (bulunan) return bulunan
  }
  return d.referans.rolIcinKullanici(gorev['Magaza Kodu'], gorev['Atanan Rol'])
}

/**
 * 'panel' kanallı kural: kayıt üretilir, mesaj çıkmaz. Sarmalayıcı, gerçek
 * kanalın `gelenCoz`'unu korur — panelden gelen bir yanıt yolu ileride
 * eklenirse aynı çözümleyici kullanılsın.
 */
function sessizKanal(temel: KanalArayuzu): KanalArayuzu {
  return {
    ad: 'panel',
    gonder: async (m) => ({
      basarili: true,
      saglayiciMesajId: `panel-${m.bildirimId}`,
      not: 'Kuralın bildirim kanalı "panel" — telefona mesaj gönderilmedi.',
    }),
    gelenCoz: (ham) => temel.gelenCoz(ham),
  }
}
