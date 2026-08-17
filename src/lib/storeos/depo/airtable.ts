// ════════════════════════════════════════════════════════════════════════════
//  Store OS — AIRTABLE DEPOSU
//
//  ✔ DURUM: CANLI BASE'E KARŞI DOĞRULANDI — 17 Ağustos 2026, `Ali Store OS`
//    (appXHVi7l5zzxLiGg). `depo/uygunluk.test.ts --airtable` bu uygulamayı
//    bellek deposuyla AYNI 51 iddiaya soktu; hepsi geçti. Ayrıca gerçek zincir
//    (olay→kural→görev→bildirim→buton yanıtı) bu depoyla uçtan uca koştu.
//
//  Bilinen açık noktalar (kabul edilmiş, demo kapsamı dışına ertelendi):
//   · yazIlkKez() Airtable'da ATOMİK DEĞİL. Airtable unique constraint sunmuyor;
//     oku-sonra-yaz arasında yarış penceresi var. Aynı olay id'si aynı anda iki
//     lambda'ya düşerse iki kayıt oluşabilir. Azaltma: okuma+yazma arası tek
//     istek mesafesinde, üstüne panel tarafında Olay ID'ye göre tekilleştirme.
//     Gerçek çözüm Postgres unique index — bkz. store-os-mimari girdileri.
//   · sonrakiNumara() son kaydı okuyup +1 yapar; aynı yarış penceresi geçerli.
//     Çakışma olursa görev numarası tekrar eder (veri kaybı değil, karışıklık).
// ════════════════════════════════════════════════════════════════════════════

import { alintila, guncelle, listele, olustur, tekil } from '../airtable'
import { TABLO } from '../tipler'
import type {
  Bildirim, DenetimSatiri, Gorev, Kamera, Kullanici,
  Kural, Magaza, Metrik, OlayKaydi,
} from '../tipler'
import type {
  BildirimDeposu, Depo, DenetimDeposu, GorevDeposu,
  KuralDeposu, OlayDeposu, ReferansDeposu,
} from './tipler'

function alanlar<T>(k: { fields: Partial<T> }): T {
  return k.fields as T
}

export class AirtableDeposu implements Depo {
  readonly ad = 'airtable' as const

  olaylar: OlayDeposu = {
    varMi: async (id) => {
      const k = await tekil<OlayKaydi>(TABLO.olaylar, `{Olay ID} = ${alintila(id)}`)
      return k !== null
    },
    yazIlkKez: async (kayit) => {
      const mevcut = await tekil<OlayKaydi>(TABLO.olaylar, `{Olay ID} = ${alintila(kayit['Olay ID'])}`)
      if (mevcut) return false
      await olustur<OlayKaydi>(TABLO.olaylar, [kayit])
      return true
    },
    getir: async (id) => {
      const k = await tekil<OlayKaydi>(TABLO.olaylar, `{Olay ID} = ${alintila(id)}`)
      return k ? alanlar(k) : null
    },
    listele: async (f) => {
      const kayitlar = await listele<OlayKaydi>(TABLO.olaylar, {
        formul: f?.magazaKodu ? `{Magaza Kodu} = ${alintila(f.magazaKodu)}` : undefined,
        sirala: [{ alan: 'Alindi', yon: 'desc' }],
        limit: f?.limit,
      })
      return kayitlar.map(alanlar)
    },
    isaretle: async (id, degisiklik) => {
      const k = await tekil<OlayKaydi>(TABLO.olaylar, `{Olay ID} = ${alintila(id)}`)
      if (!k) return
      await guncelle<OlayKaydi>(TABLO.olaylar, [{ id: k.id, fields: degisiklik }])
    },
  }

  kurallar: KuralDeposu = {
    aktifKurallar: async (olayTipi) => {
      const kosul = olayTipi
        ? `AND({Aktif}, {Olay Tipi} = ${alintila(olayTipi)})`
        : '{Aktif}'
      const kayitlar = await listele<Kural>(TABLO.kurallar, {
        formul: kosul,
        sirala: [{ alan: 'Sira', yon: 'asc' }],
      })
      return kayitlar.map(alanlar)
    },
    hepsi: async () => (await listele<Kural>(TABLO.kurallar)).map(alanlar),
  }

  gorevler: GorevDeposu = {
    olustur: async (g) => {
      await olustur<Gorev>(TABLO.gorevler, [g])
      return g
    },
    getir: async (no) => {
      const k = await tekil<Gorev>(TABLO.gorevler, `{Gorev No} = ${alintila(no)}`)
      return k ? alanlar(k) : null
    },
    guncelle: async (no, degisiklik) => {
      const k = await tekil<Gorev>(TABLO.gorevler, `{Gorev No} = ${alintila(no)}`)
      if (!k) throw new Error(`Gorev bulunamadi: ${no}`)
      const y = await guncelle<Gorev>(TABLO.gorevler, [{ id: k.id, fields: degisiklik }])
      return alanlar(y[0]!)
    },
    listele: async (f) => {
      const kosullar: string[] = []
      if (f?.magazaKodu) kosullar.push(`{Magaza Kodu} = ${alintila(f.magazaKodu)}`)
      if (f?.durum) kosullar.push(`{Durum} = ${alintila(f.durum)}`)
      const kayitlar = await listele<Gorev>(TABLO.gorevler, {
        formul: kosullar.length ? (kosullar.length === 1 ? kosullar[0] : `AND(${kosullar.join(',')})`) : undefined,
        sirala: [{ alan: 'Olusturuldu', yon: 'desc' }],
        limit: f?.limit,
      })
      return kayitlar.map(alanlar)
    },
    sonrakiNumara: async () => {
      const son = await listele<Gorev>(TABLO.gorevler, {
        alanlar: ['Gorev No'],
        sirala: [{ alan: 'Gorev No', yon: 'desc' }],
        limit: 1,
      })
      const oncekiNo = son[0] ? alanlar(son[0])['Gorev No'] : 'G-000000'
      const n = Number(String(oncekiNo).replace(/\D/g, '')) || 0
      return `G-${String(n + 1).padStart(6, '0')}`
    },
    olayVeKuraldanVarMi: async (olayId, kuralAdi) => {
      const k = await tekil<Gorev>(
        TABLO.gorevler,
        `AND({Kaynak Olay ID} = ${alintila(olayId)}, {Kural} = ${alintila(kuralAdi)})`,
      )
      return k !== null
    },
  }

  bildirimler: BildirimDeposu = {
    olustur: async (b) => {
      await olustur<Bildirim>(TABLO.bildirimler, [b])
      return b
    },
    // OKU-SONRA-YAZ: Airtable'da koşullu yazma yok. Yarış penceresi bir
    // istek genişliğindedir ve bildirim üretimi tek hattan (olay alımı /
    // eskalasyon cron'u) aktığı için pratikte kapalıdır. Gerçek garanti
    // Airtable'da 'Bildirim ID' alanına konacak UNIQUE kısıtıdır — kurulum
    // dokümanına yazıldı. Bellek deposunda bu çağrı zaten atomiktir.
    olusturIlkKez: async (b) => {
      const k = await tekil<Bildirim>(TABLO.bildirimler, `{Bildirim ID} = ${alintila(b['Bildirim ID'])}`)
      if (k) return { ilkKez: false, bildirim: alanlar(k) }
      await olustur<Bildirim>(TABLO.bildirimler, [b])
      return { ilkKez: true, bildirim: b }
    },
    getir: async (id) => {
      const k = await tekil<Bildirim>(TABLO.bildirimler, `{Bildirim ID} = ${alintila(id)}`)
      return k ? alanlar(k) : null
    },
    saglayiciMesajIdIle: async (mesajId) => {
      const k = await tekil<Bildirim>(TABLO.bildirimler, `{Saglayici Mesaj ID} = ${alintila(mesajId)}`)
      return k ? alanlar(k) : null
    },
    guncelle: async (id, degisiklik) => {
      const k = await tekil<Bildirim>(TABLO.bildirimler, `{Bildirim ID} = ${alintila(id)}`)
      if (!k) throw new Error(`Bildirim bulunamadi: ${id}`)
      const y = await guncelle<Bildirim>(TABLO.bildirimler, [{ id: k.id, fields: degisiklik }])
      return alanlar(y[0]!)
    },
    listele: async (f) => {
      const kayitlar = await listele<Bildirim>(TABLO.bildirimler, {
        formul: f?.gorevNo ? `{Gorev No} = ${alintila(f.gorevNo)}` : undefined,
        sirala: [{ alan: 'Gonderim Zamani', yon: 'desc' }],
        limit: f?.limit,
      })
      return kayitlar.map(alanlar)
    },
  }

  // ── APPEND-ONLY ────────────────────────────────────────────────────────────
  // Bu nesnede `guncelle` / `sil` YOKTUR ve EKLENMEYECEKTİR.
  // Airtable şema seviyesinde append-only zorlayamıyor; garanti burasıdır.
  denetim: DenetimDeposu = {
    yaz: async (satir) => { await olustur<DenetimSatiri>(TABLO.denetim, [satir]) },
    // Airtable POST'u istek başına en fazla 10 kayıt alır ve sırayı korur.
    yazCok: async (satirlar) => {
      for (let i = 0; i < satirlar.length; i += 10) {
        await olustur<DenetimSatiri>(TABLO.denetim, satirlar.slice(i, i + 10))
      }
    },
    listele: async (f) => {
      const kayitlar = await listele<DenetimSatiri>(TABLO.denetim, {
        formul: f?.entityId ? `{Entity ID} = ${alintila(f.entityId)}` : undefined,
        sirala: [{ alan: 'Zaman', yon: 'asc' }],
        limit: f?.limit,
      })
      return kayitlar.map(alanlar)
    },
  }

  referans: ReferansDeposu = {
    magaza: async (kod) => {
      const k = await tekil<Magaza>(TABLO.magazalar, `{Kod} = ${alintila(kod)}`)
      return k ? alanlar(k) : null
    },
    magazalar: async () => (await listele<Magaza>(TABLO.magazalar)).map(alanlar),
    kameralar: async (kod) => {
      const kayitlar = await listele<Kamera>(TABLO.kameralar, {
        formul: kod ? `{Magaza Kodu} = ${alintila(kod)}` : undefined,
        sirala: [{ alan: 'Sira', yon: 'asc' }],
      })
      return kayitlar.map(alanlar)
    },
    kullanicilar: async (kod) => {
      const kayitlar = await listele<Kullanici>(TABLO.kullanicilar, {
        formul: kod ? `{Magaza Kodu} = ${alintila(kod)}` : undefined,
      })
      return kayitlar.map(alanlar)
    },
    rolIcinKullanici: async (magazaKodu, rol) => {
      const k = await tekil<Kullanici>(
        TABLO.kullanicilar,
        `AND({Magaza Kodu} = ${alintila(magazaKodu)}, {Rol} = ${alintila(rol)}, {Aktif})`,
      )
      return k ? alanlar(k) : null
    },
    metrikler: async (kod) => {
      const kayitlar = await listele<Metrik>(TABLO.metrikler, {
        formul: kod ? `{Magaza Kodu} = ${alintila(kod)}` : undefined,
      })
      return kayitlar.map(alanlar)
    },
  }

  /**
   * Demo sıfırlama bilinçli olarak UYGULANMADI.
   * Silme yolu buradan geçerse denetim kaydını da silebilecek bir kapı açılır.
   * Sıfırlama YALNIZ `scripts/storeos/seed.ts --sifirla` üzerinden yapılır;
   * o script Veri Tipi='demo' filtresiyle çalışır ve DenetimKaydi'na dokunmaz.
   */
  async sifirla(): Promise<void> {
    throw new Error(
      'Airtable deposu uygulama icinden sifirlanmaz. Kullan: npx tsx scripts/storeos/seed.ts --sifirla --yaz',
    )
  }
}
