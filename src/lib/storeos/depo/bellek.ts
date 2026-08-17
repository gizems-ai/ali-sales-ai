// ════════════════════════════════════════════════════════════════════════════
//  Store OS — BELLEK-İÇİ DEPO
//
//  Amaç: zincirin tamamı Airtable/WhatsApp/domain olmadan çalışsın.
//  Gün 2'nin varsayılan deposu budur.
//
//  ⚠ SINIRLAR — bilinçli:
//   · Süreç ömrü kadar yaşar. `next dev` yeniden başlarsa sıfırlanır.
//   · Vercel lambda'ları arasında PAYLAŞILMAZ. Prod'da tek doğru depo
//     Airtable'dır. (Aynı tuzağa mevcut panelde düşülmüş: src/lib/broker/store.ts:6-8)
//   · Bu yüzden `STOREOS_DEPO` prod'da 'airtable' olmalı; bellek deposu
//     yalnız lokal geliştirme, test ve `zincir-demo` içindir.
// ════════════════════════════════════════════════════════════════════════════

import type {
  Bildirim, DenetimSatiri, Gorev, Kamera, Kullanici,
  Kural, Magaza, Metrik, OlayKaydi,
} from '../tipler'
import type {
  BildirimDeposu, Depo, DenetimDeposu, GorevDeposu,
  KuralDeposu, OlayDeposu, ReferansDeposu,
} from './tipler'
import { varsayilanMetrikler } from './demo-metrikler'

// ─── Varsayılan referans veri (seed.ts ile aynı mağaza) ──────────────────────

const MAGAZA_KODU = '0178'

function varsayilanMagaza(): Magaza {
  return {
    'Kod': MAGAZA_KODU,
    'Ad': 'Izmir Forum Bornova',
    'Bolge': 'Ege',
    'Sehir': 'Izmir',
    'Adres': 'Forum Bornova AVM, Bornova / Izmir',
    'Acilis Saati': '10:00',
    'Kapanis Saati': '22:00',
    'Durum': 'warning',
    'Kasa Toplam': 8,
    'Aktif': true,
  }
}

function varsayilanKameralar(): Kamera[] {
  return [
    { 'Kamera ID': `${MAGAZA_KODU}-giris`,    'Magaza Kodu': MAGAZA_KODU, 'Ad': 'Ana Giris',        'Bolge Adi': 'Giris',          'Durum': 'online',   'Demo Video': '/storeos/demo/giris.mp4',    'Yetenekler': 'kisi_sayimi,yogunluk', 'Sira': 1 },
    { 'Kamera ID': `${MAGAZA_KODU}-kasa`,     'Magaza Kodu': MAGAZA_KODU, 'Ad': 'Kasa Alani',       'Bolge Adi': 'Kasa Alani',     'Durum': 'online',   'Demo Video': '/storeos/demo/kasa.mp4',     'Yetenekler': 'kuyruk,bekleme',       'Sira': 2 },
    { 'Kamera ID': `${MAGAZA_KODU}-kozmetik`, 'Magaza Kodu': MAGAZA_KODU, 'Ad': 'Kozmetik Reyon',   'Bolge Adi': 'Kozmetik Reyon', 'Durum': 'online',   'Demo Video': '/storeos/demo/kozmetik.mp4', 'Yetenekler': 'raf,dwell',            'Sira': 3 },
    { 'Kamera ID': `${MAGAZA_KODU}-depo`,     'Magaza Kodu': MAGAZA_KODU, 'Ad': 'Depo Girisi',      'Bolge Adi': 'Depo',           'Durum': 'degraded', 'Demo Video': '/storeos/demo/depo.mp4',     'Yetenekler': 'isg',                  'Sira': 4 },
  ]
}

/** TELEFONLAR PLACEHOLDER — gerçek E.164 numaralar demo öncesi girilecek. */
function varsayilanKullanicilar(): Kullanici[] {
  const t = (ad: string, rol: Kullanici['Rol'], no: string): Kullanici => ({
    'Kullanici ID': `u-${rol}-${no}`,
    'Ad Soyad': ad,
    'Rol': rol,
    'Magaza Kodu': MAGAZA_KODU,
    'Telefon': `+90000000000${no}`,
    'Aktif': true,
  })
  return [
    t('Magaza Muduru', 'magaza_muduru', '1'),
    t('Ege Bolge Muduru', 'bolge_muduru', '2'),
    t('Reyon Personeli', 'personel', '3'),
    t('Guvenlik Gorevlisi', 'guvenlik', '4'),
    t('Merkez Operasyon', 'merkez', '5'),
  ]
}

/**
 * Varsayılan kurallar — YALNIZ FAZ 1 tipleri.
 * Faz 2 tipleri (raf, ISG, güvenlik) için bilinçli olarak kural YOKTUR:
 * olay kabul edilir, kaydedilir, hiçbir kurala eşleşmez, görev üretmez.
 *
 * Koşullar `metadata.<anahtar>` yollarını kullanır — anahtarlar
 * olay-sozlesmesi.ts içindeki METADATA_ANAHTARLARI ile aynı.
 */
export function varsayilanKurallar(): Kural[] {
  return [
    {
      'Kural Adi': 'Kasa kuyrugu esigi',
      'Olay Tipi': 'store.queue.threshold_exceeded',
      'Kosullar JSON': JSON.stringify([{ alan: 'metadata.queueLength', operator: '>=', deger: 6 }]),
      'Severity': 'high',
      'Gorev Basligi': 'Kasa kuyrugu {metadata.queueLength} kisiye ulasti — ek kasa ac',
      'Gorev Aciklamasi': '{magaza} kasa alaninda ortalama bekleme {metadata.avgWaitSeconds} sn. Ek kasa acilmasi gerekiyor.',
      'Hedef Rol': 'magaza_muduru', 'Oncelik': 'kritik',
      'SLA Dakika': 10, 'Eskalasyon Dakika': 5, 'Eskalasyon Rolu': 'bolge_muduru',
      'Bildirim Kanali': 'whatsapp', 'Kanit Gerekli': false, 'Sira': 10, 'Aktif': true,
    },
    {
      'Kural Adi': 'Kasa kuyrugu erken uyari',
      'Olay Tipi': 'store.queue.threshold_exceeded',
      'Kosullar JSON': JSON.stringify([
        { alan: 'metadata.queueLength', operator: '>=', deger: 4 },
        { alan: 'metadata.queueLength', operator: '<', deger: 6 },
      ]),
      'Severity': 'medium',
      'Gorev Basligi': 'Kasa kuyrugu artiyor ({metadata.queueLength} kisi)',
      'Gorev Aciklamasi': 'Kuyruk esige yaklasiyor, izlemede kal.',
      'Hedef Rol': 'magaza_muduru', 'Oncelik': 'normal',
      'SLA Dakika': 20, 'Eskalasyon Dakika': 15, 'Eskalasyon Rolu': 'magaza_muduru',
      'Bildirim Kanali': 'panel', 'Kanit Gerekli': false, 'Sira': 20, 'Aktif': true,
    },
    {
      'Kural Adi': 'Kasa bekleme suresi uzadi',
      'Olay Tipi': 'store.queue.length_changed',
      'Kosullar JSON': JSON.stringify([{ alan: 'metadata.avgWaitSeconds', operator: '>=', deger: 240 }]),
      'Severity': 'medium',
      'Gorev Basligi': 'Kasa bekleme suresi {metadata.avgWaitSeconds} sn',
      'Gorev Aciklamasi': 'Ortalama bekleme 4 dakikayi asti. Kasa yonlendirmesi yap.',
      'Hedef Rol': 'magaza_muduru', 'Oncelik': 'yuksek',
      'SLA Dakika': 15, 'Eskalasyon Dakika': 10, 'Eskalasyon Rolu': 'bolge_muduru',
      'Bildirim Kanali': 'panel', 'Kanit Gerekli': false, 'Sira': 25, 'Aktif': true,
    },
    {
      'Kural Adi': 'Kamera baglantisi koptu',
      'Olay Tipi': 'store.camera.offline',
      'Kosullar JSON': JSON.stringify([]),
      'Severity': 'high',
      'Gorev Basligi': '{kamera} kamerasi cevrimdisi',
      'Gorev Aciklamasi': 'Kamera baglantisi koptu ({metadata.reason}). Teknik ekibe bildir.',
      'Hedef Rol': 'merkez', 'Oncelik': 'yuksek',
      'SLA Dakika': 60, 'Eskalasyon Dakika': 30, 'Eskalasyon Rolu': 'merkez',
      'Bildirim Kanali': 'panel', 'Kanit Gerekli': false, 'Sira': 40, 'Aktif': true,
    },
    {
      'Kural Adi': 'Kamera goruntu kalitesi dustu',
      'Olay Tipi': 'store.camera.degraded',
      'Kosullar JSON': JSON.stringify([]),
      'Severity': 'low',
      'Gorev Basligi': '{kamera} goruntu kalitesi dustu ({metadata.issue})',
      'Gorev Aciklamasi': 'Sorun: {metadata.issue}. Analitik guvenilirligi azalabilir, kamerayi kontrol et.',
      'Hedef Rol': 'merkez', 'Oncelik': 'dusuk',
      'SLA Dakika': 240, 'Eskalasyon Dakika': 120, 'Eskalasyon Rolu': 'merkez',
      'Bildirim Kanali': 'panel', 'Kanit Gerekli': false, 'Sira': 50, 'Aktif': true,
    },
    {
      'Kural Adi': 'Doluluk kapasiteyi zorluyor',
      'Olay Tipi': 'store.occupancy.updated',
      // Otoriter tabloda oran YOK; densityLevel enum'u var (low|medium|high).
      'Kosullar JSON': JSON.stringify([{ alan: 'metadata.densityLevel', operator: '=', deger: 'high' }]),
      'Severity': 'medium',
      'Gorev Basligi': 'Magaza yogunlugu yuksek ({metadata.personCount} kisi)',
      'Gorev Aciklamasi': 'Yogunluk seviyesi {metadata.densityLevel}. Giris yonlendirmesi ve ek personel degerlendir.',
      'Hedef Rol': 'magaza_muduru', 'Oncelik': 'normal',
      'SLA Dakika': 20, 'Eskalasyon Dakika': 15, 'Eskalasyon Rolu': 'bolge_muduru',
      'Bildirim Kanali': 'panel', 'Kanit Gerekli': false, 'Sira': 60, 'Aktif': true,
    },
  ]
}

// ─── Uygulama ────────────────────────────────────────────────────────────────

interface BellekDurumu {
  olaylar: Map<string, OlayKaydi>
  gorevler: Map<string, Gorev>
  bildirimler: Map<string, Bildirim>
  denetim: DenetimSatiri[]
  kurallar: Kural[]
  magazalar: Map<string, Magaza>
  kameralar: Kamera[]
  kullanicilar: Kullanici[]
  metrikler: Metrik[]
  gorevSayaci: number
}

function bosDurum(): BellekDurumu {
  const m = varsayilanMagaza()
  // Metrikler seed'le AYNI fonksiyondan gelir (demo-metrikler.ts). Bellek
  // deposunun Airtable'dan farklı sayı göstermesi diye bir şey olmamalı.
  const gun = new Date().toISOString().slice(0, 10)
  return {
    olaylar: new Map(),
    gorevler: new Map(),
    bildirimler: new Map(),
    denetim: [],
    kurallar: varsayilanKurallar(),
    magazalar: new Map([[m['Kod'], m]]),
    kameralar: varsayilanKameralar(),
    kullanicilar: varsayilanKullanicilar(),
    metrikler: varsayilanMetrikler({
      magazaKodu: MAGAZA_KODU,
      gun,
      zaman: new Date(`${gun}T14:30:00+03:00`).toISOString(),
      acilisSaati: 10,
      kapanisSaati: 22,
    }),
    gorevSayaci: 0,
  }
}

export class BellekDeposu implements Depo {
  readonly ad = 'bellek' as const
  private d: BellekDurumu = bosDurum()

  olaylar: OlayDeposu = {
    varMi: async (id) => this.d.olaylar.has(id),
    yazIlkKez: async (kayit) => {
      if (this.d.olaylar.has(kayit['Olay ID'])) return false
      this.d.olaylar.set(kayit['Olay ID'], { ...kayit })
      return true
    },
    getir: async (id) => this.d.olaylar.get(id) ?? null,
    listele: async (f) => {
      let liste = [...this.d.olaylar.values()]
      if (f?.magazaKodu) liste = liste.filter(o => o['Magaza Kodu'] === f.magazaKodu)
      liste.sort((a, b) => b['Alindi'].localeCompare(a['Alindi']))
      return f?.limit ? liste.slice(0, f.limit) : liste
    },
    isaretle: async (id, alanlar) => {
      const mevcut = this.d.olaylar.get(id)
      if (!mevcut) return
      this.d.olaylar.set(id, { ...mevcut, ...alanlar })
    },
  }

  kurallar: KuralDeposu = {
    aktifKurallar: async (olayTipi) => this.d.kurallar
      .filter(k => k['Aktif'] && (olayTipi === undefined || k['Olay Tipi'] === olayTipi))
      .sort((a, b) => a['Sira'] - b['Sira']),
    hepsi: async () => [...this.d.kurallar],
  }

  gorevler: GorevDeposu = {
    olustur: async (g) => {
      this.d.gorevler.set(g['Gorev No'], { ...g })
      return { ...g }
    },
    getir: async (no) => this.d.gorevler.get(no) ?? null,
    guncelle: async (no, alanlar) => {
      const mevcut = this.d.gorevler.get(no)
      if (!mevcut) throw new Error(`Gorev bulunamadi: ${no}`)
      const yeni = { ...mevcut, ...alanlar }
      this.d.gorevler.set(no, yeni)
      return yeni
    },
    listele: async (f) => {
      let liste = [...this.d.gorevler.values()]
      if (f?.magazaKodu) liste = liste.filter(g => g['Magaza Kodu'] === f.magazaKodu)
      if (f?.durum) liste = liste.filter(g => g['Durum'] === f.durum)
      liste.sort((a, b) => b['Olusturuldu'].localeCompare(a['Olusturuldu']))
      return f?.limit ? liste.slice(0, f.limit) : liste
    },
    sonrakiNumara: async () => {
      this.d.gorevSayaci += 1
      return `G-${String(this.d.gorevSayaci).padStart(6, '0')}`
    },
    olayVeKuraldanVarMi: async (olayId, kuralAdi) =>
      [...this.d.gorevler.values()].some(
        g => g['Kaynak Olay ID'] === olayId && g['Kural'] === kuralAdi,
      ),
  }

  bildirimler: BildirimDeposu = {
    olustur: async (b) => {
      this.d.bildirimler.set(b['Bildirim ID'], { ...b })
      return { ...b }
    },
    olusturIlkKez: async (b) => {
      const mevcut = this.d.bildirimler.get(b['Bildirim ID'])
      if (mevcut) return { ilkKez: false, bildirim: { ...mevcut } }
      this.d.bildirimler.set(b['Bildirim ID'], { ...b })
      return { ilkKez: true, bildirim: { ...b } }
    },
    getir: async (id) => this.d.bildirimler.get(id) ?? null,
    saglayiciMesajIdIle: async (mesajId) =>
      [...this.d.bildirimler.values()].find(b => b['Saglayici Mesaj ID'] === mesajId) ?? null,
    guncelle: async (id, alanlar) => {
      const mevcut = this.d.bildirimler.get(id)
      if (!mevcut) throw new Error(`Bildirim bulunamadi: ${id}`)
      const yeni = { ...mevcut, ...alanlar }
      this.d.bildirimler.set(id, yeni)
      return yeni
    },
    listele: async (f) => {
      let liste = [...this.d.bildirimler.values()]
      if (f?.gorevNo) liste = liste.filter(b => b['Gorev No'] === f.gorevNo)
      liste.sort((a, b) => b['Gonderim Zamani'].localeCompare(a['Gonderim Zamani']))
      return f?.limit ? liste.slice(0, f.limit) : liste
    },
  }

  // APPEND-ONLY: burada bilinçli olarak yalnız `yaz` ve `listele` var.
  denetim: DenetimDeposu = {
    yaz: async (satir) => { this.d.denetim.push({ ...satir }) },
    listele: async (f) => {
      let liste = [...this.d.denetim]
      if (f?.entityId) liste = liste.filter(s => s['Entity ID'] === f.entityId)
      liste.sort((a, b) => a['Zaman'].localeCompare(b['Zaman']))
      return f?.limit ? liste.slice(-f.limit) : liste
    },
  }

  referans: ReferansDeposu = {
    magaza: async (kod) => this.d.magazalar.get(kod) ?? null,
    magazalar: async () => [...this.d.magazalar.values()],
    kameralar: async (kod) => kod ? this.d.kameralar.filter(k => k['Magaza Kodu'] === kod) : [...this.d.kameralar],
    kullanicilar: async (kod) => kod ? this.d.kullanicilar.filter(k => k['Magaza Kodu'] === kod) : [...this.d.kullanicilar],
    rolIcinKullanici: async (magazaKodu, rol) =>
      this.d.kullanicilar.find(k => k['Magaza Kodu'] === magazaKodu && k['Rol'] === rol && k['Aktif']) ?? null,
    metrikler: async (kod) => kod ? this.d.metrikler.filter(m => m['Magaza Kodu'] === kod) : [...this.d.metrikler],
  }

  async sifirla(): Promise<void> {
    this.d = bosDurum()
  }
}

/**
 * Süreç-genelinde tek örnek. `globalThis` üzerinden tutulur çünkü Next dev
 * sunucusu modülleri hot-reload'da yeniden değerlendirir ve modül-seviyesi
 * `let` sıfırlanır. (Aynı desen Prisma/Next örneklerinde standarttır.)
 */
const KUTU = globalThis as unknown as { __storeosBellekDepo?: BellekDeposu }

export function bellekDeposu(): BellekDeposu {
  if (!KUTU.__storeosBellekDepo) KUTU.__storeosBellekDepo = new BellekDeposu()
  return KUTU.__storeosBellekDepo
}
