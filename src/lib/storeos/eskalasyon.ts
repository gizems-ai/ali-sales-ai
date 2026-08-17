// ════════════════════════════════════════════════════════════════════════════
//  Store OS — ESKALASYON
//
//  Soru tek: "süresi geçmiş görevler var mı, varsa bir üst basamağa haber
//  verildi mi?" Cron ya da demo kontrol panelindeki düğme bunu çağırır.
//
//  ── KADEME MERDİVENİ ──────────────────────────────────────────────────────
//  Ölçüm noktası GÖREVİN SON TESLİMİ'dir (görevin doğuşu değil). Son teslim
//  kuralın 'SLA Dakika' alanından gelir.
//
//    gecikme   kademe        alıcı                  ne demek
//    ────────  ────────────  ─────────────────────  ─────────────────────────
//     0 dk     (yok)         mağaza müdürü          görev zaten onda; ilk
//                                                   bildirim doğuşta gitti
//     5 dk     hatirlatma    aynı alıcı             "hâlâ bekliyor"
//    10 dk     bolge         bolge_muduru           bir üst basamak
//    20 dk     merkez        merkez                 en üst basamak
//
//  ── IDEMPOTENCY ───────────────────────────────────────────────────────────
//  Anahtar `b-<GorevNo>-<kademe>` (bkz. bildirim.ts). Cron beş dakikada bir
//  koşsa da 40 dakika geciken bir görev için 'merkez' bildirimi BİR KEZ gider.
//  Ayrı bir "eskalasyon geçmişi" tablosu tutmuyoruz; bildirim kaydının kendisi
//  o geçmiştir. Tek kaynak, tek yarış penceresi.
//
//  ── DURUM DEĞİŞTİRMEZ ─────────────────────────────────────────────────────
//  Eskalasyon görevi 'suresi_gecti'ye ÇEVİRMEZ. Gecikme zaten 'Son Teslim'den
//  hesaplanabilir; durumu değiştirmek "kimse ilgilenmiyor" ile "sistem işaret
//  koydu"yu birbirine karıştırır ve kabul butonunu kullanan kişinin gördüğü
//  durumu altından çeker (iyimser kilit boşuna 409 üretir).
// ════════════════════════════════════════════════════════════════════════════

import { aliciBul, bildirimGonder, bildirimIdUret } from './bildirim'
import type { Kademe } from './bildirim'
import type { Depo } from './depo'
import { DENETIM_AKSIYONLARI, denetimYaz } from './denetim'
import { nihaiMi } from './gorev'
import type { KanalArayuzu } from './kanal/tipler'
import type { Gorev, Kullanici, Rol } from './tipler'

export interface KademeTanimi {
  kademe: Kademe
  /** Son teslimden kaç dakika sonra tetiklenir. */
  gecikmeDakika: number
  /** null = görevin mevcut alıcısı (hatırlatma). */
  rol: Rol | null
  aciklama: string
}

export const KADEME_MERDIVENI: readonly KademeTanimi[] = [
  { kademe: 'hatirlatma', gecikmeDakika: 5,  rol: null,           aciklama: 'Aynı kişiye hatırlatma' },
  { kademe: 'bolge',      gecikmeDakika: 10, rol: 'bolge_muduru', aciklama: 'Bölge müdürüne eskalasyon' },
  { kademe: 'merkez',     gecikmeDakika: 20, rol: 'merkez',       aciklama: 'Merkeze eskalasyon' },
]

export interface EskalasyonGirdi {
  depo: Depo
  kanal: KanalArayuzu
  magazaKodu?: string
  simdi?: string
}

export interface EskalasyonSatiri {
  gorevNo: string
  kademe: Kademe
  gecikmeDk: number
  sonuc: 'gonderildi' | 'zaten_var' | 'alici_yok' | 'hata'
  alici?: string
  not?: string
}

export interface EskalasyonRaporu {
  bakilan: number
  geciken: number
  tetiklenen: EskalasyonSatiri[]
  simdi: string
}

export async function eskalasyonKontrol(g: EskalasyonGirdi): Promise<EskalasyonRaporu> {
  const d = g.depo
  const simdi = g.simdi ?? new Date().toISOString()
  const simdiMs = Date.parse(simdi)

  const gorevler = await d.gorevler.listele(
    g.magazaKodu ? { magazaKodu: g.magazaKodu } : undefined,
  )

  const tetiklenen: EskalasyonSatiri[] = []
  let geciken = 0

  for (const gorev of gorevler) {
    if (nihaiMi(gorev['Durum'])) continue

    const gecikmeDk = Math.floor((simdiMs - Date.parse(gorev['Son Teslim'])) / 60_000)
    if (gecikmeDk < KADEME_MERDIVENI[0].gecikmeDakika) continue
    geciken++

    // Hak edilen TÜM kademeler denenir, yalnız en üstteki değil. 25 dakika
    // gecikmiş bir görevde cron ilk kez koşuyorsa hatırlatma da bölge de
    // merkez de gitmelidir; idempotency kapısı zaten tekrarı engelliyor.
    for (const k of KADEME_MERDIVENI) {
      if (gecikmeDk < k.gecikmeDakika) break
      const satir = await kademeyiTetikle(d, g.kanal, gorev, k, gecikmeDk, simdi)
      if (satir) tetiklenen.push(satir)
    }
  }

  await denetimYaz(d, {
    aktor: 'system', aktorTipi: 'system',
    aksiyon: DENETIM_AKSIYONLARI.eskalasyon,
    entityTipi: 'gorev', entityId: g.magazaKodu ?? 'tumu',
    sonrasi: {
      bakilan: gorevler.length, geciken,
      yeniGonderim: tetiklenen.filter(t => t.sonuc === 'gonderildi').length,
      atlanan: tetiklenen.filter(t => t.sonuc === 'zaten_var').length,
    },
    kaynak: 'cron', zaman: simdi,
  })

  return { bakilan: gorevler.length, geciken, tetiklenen, simdi }
}

async function kademeyiTetikle(
  d: Depo, kanal: KanalArayuzu, gorev: Gorev,
  k: KademeTanimi, gecikmeDk: number, simdi: string,
): Promise<EskalasyonSatiri | null> {
  const temel = { gorevNo: gorev['Gorev No'], kademe: k.kademe, gecikmeDk }

  // Ucuz ön kontrol: kayıt zaten varsa alıcı aramaya bile gerek yok.
  // Gerçek garanti yine `olusturIlkKez` — bu yalnız gereksiz iş yapmamak için.
  const mevcut = await d.bildirimler.getir(bildirimIdUret(gorev['Gorev No'], k.kademe))
  if (mevcut) return { ...temel, sonuc: 'zaten_var', alici: mevcut['Alici Kullanici ID'] }

  const alici: Kullanici | null = k.rol
    ? await d.referans.rolIcinKullanici(gorev['Magaza Kodu'], k.rol)
    : await aliciBul(d, gorev)

  if (!alici) {
    const not = k.rol
      ? `'${k.rol}' rolünde aktif kullanıcı yok (mağaza ${gorev['Magaza Kodu']}).`
      : `Görevin alıcısı bulunamadı.`
    await denetimYaz(d, {
      aktor: 'system', aktorTipi: 'system',
      aksiyon: DENETIM_AKSIYONLARI.bildirimHata,
      entityTipi: 'gorev', entityId: gorev['Gorev No'],
      sonrasi: { kademe: k.kademe, sebep: not }, kaynak: 'cron', zaman: simdi,
    })
    return { ...temel, sonuc: 'alici_yok', not }
  }

  const sonuc = await bildirimGonder({
    depo: d, kanal, gorev, alici, kademe: k.kademe, aktor: 'eskalasyon', simdi,
  })

  if (sonuc.durum === 'gonderildi') {
    await denetimYaz(d, {
      aktor: 'system', aktorTipi: 'system',
      aksiyon: DENETIM_AKSIYONLARI.eskalasyon,
      entityTipi: 'gorev', entityId: gorev['Gorev No'],
      sonrasi: {
        kademe: k.kademe, aciklama: k.aciklama, gecikmeDk,
        alici: alici['Kullanici ID'], rol: alici['Rol'],
      },
      kaynak: 'cron', zaman: simdi,
    })
  }

  return {
    ...temel,
    sonuc: sonuc.durum === 'alici_yok' ? 'alici_yok' : sonuc.durum,
    alici: alici['Kullanici ID'],
    not: sonuc.durum === 'hata' ? sonuc.hata : undefined,
  }
}
