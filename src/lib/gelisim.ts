// ── Satışçı Kütüphanesi (GELİŞİM merkezi) ───────────────────────────────────
// Ali Satış Zekâsı'nın eğitim/enablement eşi. readOnly tenant: HİÇBİR yazma yok.
// Tüm veri fixture; XP / rozet / ilerleme / challenge / koç notu / WhatsApp taslağı
// salt-okunur gösterim. Hazır workshop deck'leri public/decks altında gömülü açılır.

// Tek sabit (prompt §0): bölüm adı sadece burada tanımlanır.
export const SECTION_NAME = 'Satışçı Kütüphanesi'
export const SECTION_SLUG = '/gelisim'
export const GROUP_NAME = 'GELİŞİM'
export const MANIFESTO = 'Öğren, uygula, geliş ve lider ol.'

// Ali Satış Zekâsı'na derin link (Stok Zekâsı eğitim yüzü → operasyon eşi)
export const SATIS_ZEKASI_SLUG = '/ali-satis-zekasi'

// ── Renk tokenları (ali-zeka Z ile aynı palet; yeni renk YOK) ────────────────
export const G = {
  // yeşil — ürün / ilerleme / XP
  green1: '#0E5132', green2: '#1B7A47', green3: '#2E9D5E',
  greenGrad: 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)',
  // lavanta — Ali / AI kimliği (hero + koç buradan)
  lavanta: '#5B47E0', lavSoft: '#EDE9FE', lavSofter: '#F5F3FF', lavAccent: '#8c97d8',
  lavGrad: 'linear-gradient(135deg,#6D5BE0,#8c97d8)',
  // mercan — challenge / ısı / dikkat
  coral: '#EF6B4F', coralSoft: 'rgba(239,107,79,.12)', coralSofter: '#FDEFEA',
  // nötr
  text: '#1c2a22', sub: '#57655b', faint: '#8b988f', line: '#E7EAF2',
  card: 'rgba(255,255,255,.86)', cardSolid: '#ffffff',
} as const

export const RADIUS = 22

// ── Tipler (prompt §11) ──────────────────────────────────────────────────────
export type Rep = {
  id: string
  ad: string
  rol: 'kullanici' | 'yonetici'
  xp: number
  streak: number
  rozetler: string[]
  // 0–100 — satışçının kendi gelişim aynası (sıralama/ceza aracı DEĞİL)
  skills: {
    empati: number
    ihtiyacAnalizi: number
    sunum: number
    itirazYonetimi: number
    kapanis: number
    takip: number
  }
  dununOzeti: {
    gorusme: number
    teklif: number
    kapanisOrani: number
    kapanisDelta: number
    yeniMusteri: number
  }
}

export type ContentTip =
  | 'ders' | 'rolYap' | 'oyunKitabi' | 'projeAkademisi' | 'persona' | 'hikaye'

export type Content = {
  id: string
  tip: ContentTip
  baslik: string
  altMetin?: string
  sure?: string
  etiket?: string
  ilerleme?: number   // 0–100
  canli: boolean      // gömülü gerçek deck mi?
  src?: string        // gömülü deck yolu (public/decks/…)
}

export type Challenge = {
  id: string
  gorev: string
  hedef: number
  tamamlanan: number
  xp: number
}

export type WaTemplate = {
  id: string
  senaryo: string
  taslak: string
}

export type LeaderRow = {
  sira: number
  ad: string
  xp: number
  ben: boolean
}

// ── Fixture: Babacan demo rep profili ────────────────────────────────────────
export const REP: Rep = {
  id: 'rep_gizem',
  ad: 'Gizem Burteçin',
  rol: 'yonetici',
  xp: 840,
  streak: 12,
  rozetler: ['İlk Adım', 'Empati Ustası', '7 Gün Serisi', 'İtiraz Avcısı'],
  skills: {
    empati: 91,
    ihtiyacAnalizi: 84,
    sunum: 78,
    itirazYonetimi: 88,
    kapanis: 76,
    takip: 98,
  },
  dununOzeti: {
    gorusme: 18,
    teklif: 6,
    kapanisOrani: 21,
    kapanisDelta: 6,
    yeniMusteri: 7,
  },
}

// Yetenek skoru meta — sağ ray çubukları için sıralı liste
export const SKILL_META: { key: keyof Rep['skills']; label: string }[] = [
  { key: 'empati', label: 'Empati' },
  { key: 'ihtiyacAnalizi', label: 'İhtiyaç Analizi' },
  { key: 'sunum', label: 'Sunum Becerisi' },
  { key: 'itirazYonetimi', label: 'İtiraz Yönetimi' },
  { key: 'kapanis', label: 'Kapanış Becerisi' },
  { key: 'takip', label: 'Takip Disiplini' },
]

// ── Koç Ali mesajı (lavanta hero) ────────────────────────────────────────────
export const KOC_MESAJI =
  'Dün 18 görüşme yaptın, harika bir tempo! Fiyat itirazlarında biraz zorlandığını ' +
  'görüyorum. Bugün buna odaklanalım mı?'

// ── "Bugün Senin İçin" (4 kart) ──────────────────────────────────────────────
export const GUNUN_DERSI: Content = {
  id: 'today_ders',
  tip: 'ders',
  baslik: 'Yüksek Gelir Grubuna Satış Stratejileri',
  sure: '12 dk',
  canli: false,
}

export const GUNUN_CHALLENGE: Challenge = {
  id: 'ch_yasam_tarzi',
  gorev: 'En az 2 müşteriye yaşam tarzı sorusu sor.',
  hedef: 2,
  tamamlanan: 0,
  xp: 50,
}

export const GUNUN_ROLYAP: Content = {
  id: 'today_rolyap',
  tip: 'rolYap',
  baslik: 'Fiyat İtirazı Senaryosu',
  altMetin: 'AI müşteri ile provanı yap, puanını hemen gör.',
  etiket: 'Yeni senaryo',
  canli: false,
}

export const GUNUN_WA: WaTemplate = {
  id: 'wa_sessiz_musteri',
  senaryo: 'Sessiz kalan müşteriye nasıl tekrar ulaşırım?',
  taslak:
    'Merhaba {{ad}} Bey/Hanım, geçtiğimiz görüşmemizin ardından aklınıza takılan bir ' +
    'şey oldu mu diye merak ettim. Size uygun olursa bu hafta yeni çıkan bir fırsatı ' +
    'kısaca paylaşmak isterim — kısa bir not bırakmanız yeterli. 🙂',
}

// ── "Devam Etmek İstediklerin" (4 kart) — 3'ü GERÇEK gömülü deck ─────────────
export const DEVAM_EDENLER: Content[] = [
  {
    id: 'cont_satis_temelleri',
    tip: 'ders',
    baslik: 'Satış Temelleri',
    altMetin: 'Workshop 1 — kaldığın yerden',
    ilerleme: 60,
    canli: true,
    src: '/decks/Babacan_Workshop_1_Satis.html',
  },
  {
    id: 'cont_itiraz_b2',
    tip: 'rolYap',
    baslik: 'İtiraz Yönetimi — Bölüm 2',
    altMetin: '5/17 dk kaldı',
    ilerleme: 30,
    canli: false,
  },
  {
    id: 'cont_satis_isletim',
    tip: 'oyunKitabi',
    baslik: 'Satış İşletim Sistemi',
    altMetin: 'Çalıştay + 2030 Manifestosu',
    etiket: 'Yeni',
    canli: true,
    src: '/decks/Babacan_Satis_Sistemi_Calistay.html',
  },
  {
    id: 'cont_gardenia',
    tip: 'projeAkademisi',
    baslik: 'Gardenia — Proje Eğitimi',
    altMetin: 'İzlemeye devam et',
    canli: false,
  },
]

// ── Akademi / diğer gömülü deck'ler (kütüphane derinliği) ────────────────────
export const AKADEMI: Content[] = [
  {
    id: 'cont_pazarlama',
    tip: 'ders',
    baslik: 'Pazarlama & İş Geliştirme',
    altMetin: 'Workshop 2',
    canli: true,
    src: '/decks/Babacan_Workshop_2_Pazarlama.html',
  },
  {
    id: 'cont_alici_yolculugu',
    tip: 'persona',
    baslik: 'Alıcı Yolculuğu Haritası',
    altMetin: 'Persona Kütüphanesi',
    canli: true,
    src: '/decks/Babacan_Alici_Yolculugu_Haritasi.html',
  },
]

// ── Haftanın Liderleri (XP = öğrenme + pratik aktivitesi; ciro DEĞİL) ─────────
export const LEADERBOARD: LeaderRow[] = [
  { sira: 1, ad: 'Emre Y.', xp: 1250, ben: false },
  { sira: 2, ad: 'Cansu A.', xp: 980, ben: false },
  { sira: 3, ad: 'Fatih K.', xp: 870, ben: false },
  { sira: 4, ad: 'Sen', xp: 840, ben: true },
]

// ── Alt şerit (feature bar) mini özellikler ──────────────────────────────────
export const FEATURE_BAR: { baslik: string; alt: string; icon: string }[] = [
  { baslik: 'Hızlı öğren', alt: 'Mikro dersler', icon: 'zap' },
  { baslik: 'Pratik yap', alt: 'AI simülasyon', icon: 'play' },
  { baslik: 'Gerçek senaryolar', alt: 'Saha hikâyeleri', icon: 'map' },
  { baslik: 'Kişisel koçluk', alt: 'AI koçun Ali', icon: 'spark' },
]

// İçerik tipi → Türkçe etiket (kart rozetleri)
export const TIP_ETIKET: Record<ContentTip, string> = {
  ders: 'Ders',
  rolYap: 'Rol Yap',
  oyunKitabi: 'Oyun Kitabı',
  projeAkademisi: 'Proje Akademisi',
  persona: 'Persona',
  hikaye: 'Hikâye',
}

export const fmtXp = (n: number) => `${n.toLocaleString('tr-TR')} XP`
