// ════════════════════════════════════════════════════════════════════════════
//  Store OS — GELEN YANIT İŞLEME
//
//  Zincirin kapanış halkası:
//     buton basıldı → GelenYanit → bildirim eşleşti → görev değişti → denetim
//
//  KANALDAN BAĞIMSIZ. Girdisi `GelenYanit`; onu kimin ürettiği (gerçek n8n
//  köprüsü mü, `sahte-inbound.ts` mi) buranın umurunda değil. Gerçek payload
//  geldiğinde değişecek dosya `kanal/whatsapp.ts`'tir, bu dosya değil.
//
//  ── DOĞRULAMA ZİNCİRİ (hepsi geçmeden görev değişmez) ─────────────────────
//   1. Buton id çözülüyor mu?            → yoksa serbest metin muamelesi
//   2. Sağlayıcı mesaj id'si tanınıyor mu? → yoksa 'bildirim_yok'
//   3. Buton, O bildirime mi ait?         → değilse 'bildirim_uyusmuyor'
//   4. Gönderen numara alıcı mı?          → değilse 'telefon_uyusmuyor'
//   5. Bu bildirime daha önce yanıt verilmiş mi? → verilmişse 'yinelenen'
//   6. Görev geçişi geçerli mi?           → değilse geçiş reddi
//
//  3. adım neden ayrı: buton id'si de sağlayıcı mesaj id'si de aynı yanıtta
//  geliyor. İkisinin AYNI bildirimi işaret ettiğini doğrulamazsak, eski bir
//  mesajın butonuna basılıp yeni bir bildirimin kaydına yazılabilir.
// ════════════════════════════════════════════════════════════════════════════

import { bildirimGonder, aliciBul } from './bildirim'
import type { Depo } from './depo'
import { DENETIM_AKSIYONLARI, denetimKuyrukla, denetimYaz } from './denetim'
import { gecisYap, gorevErtele } from './gorev'
import { butonIdCoz } from './kanal/buton'
import type { GelenYanit, KanalArayuzu } from './kanal/tipler'
import type { Gorev, Rol } from './tipler'
import { telefonEslesmesi } from './yetki'

export type YanitSonucu =
  | { durum: 'uygulandi'; gorevNo: string; aksiyon: string; yeniDurum: string; gorev: Gorev }
  | { durum: 'yinelenen'; gorevNo: string; not: string }
  | { durum: 'metin'; not: string }
  | { durum: 'reddedildi'; kod: RedKodu; sebep: string }

export type RedKodu =
  | 'buton_cozulemedi'
  | 'bildirim_yok'
  | 'bildirim_uyusmuyor'
  | 'telefon_uyusmuyor'
  | 'gorev_yok'
  | 'gecis_reddedildi'

export interface YanitGirdi {
  depo: Depo
  kanal: KanalArayuzu
  yanit: GelenYanit
  kaynak?: 'n8n' | 'panel' | 'simulator'
  simdi?: string
}

/** Denetim satırları biriktirilip tek yazımla gider — bkz. `denetim.ts`. */
export function yanitiIsle(g: YanitGirdi): Promise<YanitSonucu> {
  return denetimKuyrukla(g.depo, () => yanitiIsleIc(g))
}

async function yanitiIsleIc(g: YanitGirdi): Promise<YanitSonucu> {
  const d = g.depo
  const simdi = g.simdi ?? g.yanit.zaman ?? new Date().toISOString()
  const kaynak = g.kaynak ?? 'n8n'
  const aktor = g.yanit.gonderenTelefon || 'bilinmeyen-numara'

  // ── 1. Buton mu, metin mi? ──
  const kimlik = g.yanit.butonId ? butonIdCoz(g.yanit.butonId) : null
  if (!kimlik) {
    // Serbest metin yanıtı görev durumunu DEĞİŞTİRMEZ. Bunu "anlamadım" diye
    // sessizce yutmak yerine denetime yazıyoruz: müşteri "cevap yazdım, bir
    // şey olmadı" derse izi burada.
    await denetimYaz(d, {
      aktor, aktorTipi: 'kullanici',
      aksiyon: DENETIM_AKSIYONLARI.bildirimCozulemedi,
      entityTipi: 'bildirim', entityId: g.yanit.saglayiciMesajId,
      sonrasi: {
        butonId: g.yanit.butonId, metin: g.yanit.metin?.slice(0, 500),
        not: g.yanit.butonId
          ? 'Buton id çözülemedi; görev durumu değiştirilmedi.'
          : 'Serbest metin yanıtı; görev durumu değiştirilmedi.',
      },
      kaynak, zaman: simdi,
    })
    return g.yanit.butonId
      ? { durum: 'reddedildi', kod: 'buton_cozulemedi', sebep: `Buton kimliği çözülemedi: ${g.yanit.butonId}` }
      : { durum: 'metin', not: 'Serbest metin yanıtı kaydedildi; görev durumu değişmedi.' }
  }

  // ── 2-3. Bildirim eşleşmesi ──
  const bildirim = await d.bildirimler.saglayiciMesajIdIle(g.yanit.saglayiciMesajId)
  if (!bildirim) {
    await denetimYaz(d, {
      aktor, aktorTipi: 'kullanici', aksiyon: DENETIM_AKSIYONLARI.bildirimCozulemedi,
      entityTipi: 'bildirim', entityId: g.yanit.saglayiciMesajId,
      sonrasi: { sebep: 'Bu sağlayıcı mesaj id ile eşleşen bildirim yok.', butonId: g.yanit.butonId },
      kaynak, zaman: simdi,
    })
    return {
      durum: 'reddedildi', kod: 'bildirim_yok',
      sebep: `Sağlayıcı mesaj id eşleşmedi: ${g.yanit.saglayiciMesajId}`,
    }
  }

  if (bildirim['Bildirim ID'] !== kimlik.bildirimId) {
    await denetimYaz(d, {
      aktor, aktorTipi: 'kullanici', aksiyon: DENETIM_AKSIYONLARI.bildirimCozulemedi,
      entityTipi: 'bildirim', entityId: bildirim['Bildirim ID'],
      sonrasi: {
        sebep: 'Butondaki bildirim id ile eşleşen kayıt farklı.',
        butondaki: kimlik.bildirimId, kayittaki: bildirim['Bildirim ID'],
      },
      kaynak, zaman: simdi,
    })
    return {
      durum: 'reddedildi', kod: 'bildirim_uyusmuyor',
      sebep: `Buton '${kimlik.bildirimId}' bildirimine ait, mesaj '${bildirim['Bildirim ID']}' bildirimine.`,
    }
  }

  // ── 4. Kimlik: gönderen numara ──
  // Mesajın FİİLEN gittiği numarayla karşılaştırıyoruz. Demo telefon kilidi
  // açıkken mesaj demo numarasına gider ve yanıt da oradan gelir; 'Alici
  // Telefon' ise görevin sahibinin (placeholder olabilen) numarasıdır.
  // Kilit kapalıyken ikisi zaten aynıdır — tek kod yolu, iki mod.
  const beklenenTelefon = bildirim['Gonderilen Telefon'] ?? bildirim['Alici Telefon']
  if (g.yanit.gonderenTelefon && !telefonEslesmesi(beklenenTelefon, g.yanit.gonderenTelefon)) {
    await denetimYaz(d, {
      aktor, aktorTipi: 'kullanici', aksiyon: DENETIM_AKSIYONLARI.gorevYetkiRed,
      entityTipi: 'gorev', entityId: kimlik.gorevNo,
      sonrasi: {
        sebep: 'Yanıtı gönderen numara bildirimin alıcısı değil.',
        bildirimId: bildirim['Bildirim ID'],
      },
      kaynak, zaman: simdi,
    })
    return {
      durum: 'reddedildi', kod: 'telefon_uyusmuyor',
      sebep: 'Yanıtı gönderen numara bu bildirimin alıcısı değil.',
    }
  }

  // ── 5. Inbound idempotency ──
  // Aynı mesaja ikinci kez basılması (n8n tekrarı ya da kullanıcının ikinci
  // dokunuşu) görevi ikinci kez değiştirmez.
  if (bildirim['Yanit']) {
    await denetimYaz(d, {
      aktor, aktorTipi: 'kullanici', aksiyon: DENETIM_AKSIYONLARI.bildirimYanit,
      entityTipi: 'bildirim', entityId: bildirim['Bildirim ID'],
      sonrasi: {
        not: 'Bu bildirime daha önce yanıt verilmişti. Görev tekrar değiştirilmedi.',
        oncekiYanit: bildirim['Yanit'], yeniDeneme: kimlik.aksiyon,
      },
      kaynak, zaman: simdi,
    })
    return {
      durum: 'yinelenen', gorevNo: kimlik.gorevNo,
      not: `Bu bildirime daha önce '${bildirim['Yanit']}' yanıtı verilmişti.`,
    }
  }

  const gorev = await d.gorevler.getir(kimlik.gorevNo)
  if (!gorev) {
    return { durum: 'reddedildi', kod: 'gorev_yok', sebep: `Görev bulunamadı: ${kimlik.gorevNo}` }
  }

  // Yanıt kaydı, aksiyon uygulanmadan ÖNCE işaretlenir: aksiyon sırasında
  // hata olsa bile "kullanıcı yanıtladı" bilgisi kaybolmasın.
  await d.bildirimler.guncelle(bildirim['Bildirim ID'], {
    'Durum': 'yanitlandi',
    'Yanit': kimlik.aksiyon,
    'Yanit Zamani': simdi,
  })
  await denetimYaz(d, {
    aktor, aktorTipi: 'kullanici', aksiyon: DENETIM_AKSIYONLARI.bildirimYanit,
    entityTipi: 'bildirim', entityId: bildirim['Bildirim ID'],
    sonrasi: { aksiyon: kimlik.aksiyon, gorevNo: kimlik.gorevNo, telefon: g.yanit.gonderenTelefon },
    kaynak, zaman: simdi,
  })

  // ── 6. Aksiyon ──
  switch (kimlik.aksiyon) {
    case 'kabul':
      return uygula(d, gorev, 'basladi', aktor, kaynak, simdi, 'kabul')

    case 'ertele': {
      const e = await gorevErtele(d, {
        gorevNo: gorev['Gorev No'], aktor, aktorTipi: 'kullanici', kaynak, simdi,
      })
      if (!e.basarili) return { durum: 'reddedildi', kod: 'gecis_reddedildi', sebep: e.sebep }
      return {
        durum: 'uygulandi', gorevNo: gorev['Gorev No'], aksiyon: 'ertele',
        yeniDurum: e.gorev['Durum'], gorev: e.gorev,
      }
    }

    case 'devret':
      return devret(d, g.kanal, gorev, aktor, kaynak, simdi)
  }
}

async function uygula(
  d: Depo, gorev: Gorev, hedef: Parameters<typeof gecisYap>[1]['hedef'],
  aktor: string, kaynak: 'n8n' | 'panel' | 'simulator', simdi: string, aksiyon: string,
): Promise<YanitSonucu> {
  const g = await gecisYap(d, {
    gorevNo: gorev['Gorev No'], hedef, aktor, aktorTipi: 'kullanici', kaynak, simdi,
  })
  if (!g.basarili) return { durum: 'reddedildi', kod: 'gecis_reddedildi', sebep: g.sebep }
  return {
    durum: 'uygulandi', gorevNo: gorev['Gorev No'], aksiyon,
    yeniDurum: g.gorev['Durum'], gorev: g.gorev,
  }
}

/**
 * 'Başkasına Ata' — hedef, kuralın ESKALASYON ROLÜ'dür.
 * Neden kural: devir keyfi bir seçim değil, kuralın önceden ilan ettiği bir üst
 * basamak. Panelde kişi seçtirmek Gün 5 kapsamı dışında; kural yoksa ya da
 * o rolde kimse yoksa devir yapılmaz ve sebebi denetime yazılır.
 */
async function devret(
  d: Depo, kanal: KanalArayuzu, gorev: Gorev,
  aktor: string, kaynak: 'n8n' | 'panel' | 'simulator', simdi: string,
): Promise<YanitSonucu> {
  const hedefRol = await eskalasyonRolu(d, gorev)
  const yeniKisi = hedefRol
    ? await d.referans.rolIcinKullanici(gorev['Magaza Kodu'], hedefRol)
    : null

  if (!yeniKisi || yeniKisi['Kullanici ID'] === gorev['Atanan Kullanici ID']) {
    const sebep = hedefRol
      ? `'${hedefRol}' rolünde devredilecek başka aktif kullanıcı yok.`
      : `Görevin kuralı bulunamadı; devir hedefi belirlenemedi.`
    await denetimYaz(d, {
      aktor, aktorTipi: 'kullanici', aksiyon: DENETIM_AKSIYONLARI.gorevDevredildi,
      entityTipi: 'gorev', entityId: gorev['Gorev No'],
      sonrasi: { basarili: false, sebep }, kaynak, zaman: simdi,
    })
    return { durum: 'reddedildi', kod: 'gecis_reddedildi', sebep }
  }

  const gecis = await gecisYap(d, {
    gorevNo: gorev['Gorev No'], hedef: 'atandi',
    yeniAtanan: yeniKisi['Kullanici ID'],
    not: `Devredildi: ${gorev['Atanan Kullanici ID'] ?? '(atanmamış)'} → ${yeniKisi['Kullanici ID']}`,
    aktor, aktorTipi: 'kullanici', kaynak, simdi,
  })
  if (!gecis.basarili) return { durum: 'reddedildi', kod: 'gecis_reddedildi', sebep: gecis.sebep }

  await denetimYaz(d, {
    aktor, aktorTipi: 'kullanici', aksiyon: DENETIM_AKSIYONLARI.gorevDevredildi,
    entityTipi: 'gorev', entityId: gorev['Gorev No'],
    oncesi: { atanan: gorev['Atanan Kullanici ID'] },
    sonrasi: { basarili: true, atanan: yeniKisi['Kullanici ID'], rol: yeniKisi['Rol'] },
    kaynak, zaman: simdi,
  })

  // Yeni sorumluya haber ver. Ayrı kademe ('devir') olduğu için idempotency
  // anahtarı ilk bildirimle çakışmaz.
  const alici = await aliciBul(d, gecis.gorev)
  if (alici) {
    await bildirimGonder({
      depo: d, kanal, gorev: gecis.gorev, alici, kademe: 'devir', aktor, simdi,
    })
  }

  return {
    durum: 'uygulandi', gorevNo: gorev['Gorev No'], aksiyon: 'devret',
    yeniDurum: gecis.gorev['Durum'], gorev: gecis.gorev,
  }
}

async function eskalasyonRolu(d: Depo, gorev: Gorev): Promise<Rol | null> {
  const kuralAdi = gorev['Kural']
  if (!kuralAdi) return null
  const kurallar = await d.kurallar.hepsi()
  const k = kurallar.find(x => x['Kural Adi'] === kuralAdi)
  return (k?.['Eskalasyon Rolu'] as Rol | undefined) ?? null
}
