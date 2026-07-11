// ════════════════════════════════════════════════════════════════════════════
//  Ali Sohbet — paylaşılan tipler (client + server ortak, SAF)
//  Sözleşme: UI → /api/ali-chat → (retrieval) → n8n webhook → editöryel cevap
//  Kural: cevaptaki HER rakam veriPaketi içinde bulunur. Paketin dışında sayı yok.
// ════════════════════════════════════════════════════════════════════════════

// ── Niyet sınıfları (Faz 1: 4 sınıf + kapsam dışı) ────────────────────────────
export type Intent = 'stok' | 'kampanya' | 'musteri' | 'eslestirme' | 'kapsam_disi'

// ── Stok filtre (deterministik çıkarım) ───────────────────────────────────────
export interface StokFiltre {
  proje?: string          // Central | Lagoon | Port Royal | Premium
  tip?: string            // "2+1" · "3+1" ...
  grup?: string           // A | B | C | D
  fiyatUSDMax?: number    // üst sınır (USD)
  fiyatUSDMin?: number    // alt sınır (USD)
  sadeceSatilabilir: boolean
}

// ── Kompakt stok kartı (LLM'e giden — yalnız kaynak alanlar) ──────────────────
export interface StokKart {
  id: string
  proje: string
  ilce: string
  blok: string
  daireNo: number
  tip: string
  brutM2: number
  grup: string
  emsal: string           // altında | emsalde | üstünde
  fiyatUSD: number
  fiyatTL: number
  durum: string
}

export interface StokPaketi {
  filtreOzeti: string             // "Lagoon · 2+1 · satılabilir"
  toplamEslesen: number
  gosterilen: number
  birimler: StokKart[]
  projeDagilimi: Record<string, number>
  tipDagilimi: Record<string, number>
  grupDagilimi: Record<string, number>
  fiyatUSDAralik: { min: number; max: number } | null
}

// ── Kampanya kartı ────────────────────────────────────────────────────────────
export interface KampanyaKart {
  id: string
  baslik: string
  teklifOzeti: string
  kaldirac: string[]
  hedefProje?: string
  hedefGruplar?: string[]
  bagliBirimSayisi: number
  ornekBirimIds: string[]
  yayinTarihi?: string
}

export interface KampanyaPaketi {
  yayindaSayisi: number
  kampanyalar: KampanyaKart[]
}

// ── Müşteri kartı (fixture — örnek veri) ──────────────────────────────────────
export interface MusteriKart {
  id: string
  ad: string
  persona: string
  ozet: string
  butceTL: number
  konusmaOnerisi: string
  itirazlar: string[]
}

export interface MusteriPaketi {
  kaynak: 'ornek_fixture'         // 507 gerçek CRM'e HENÜZ bağlı değil
  toplam: number
  musteriler: MusteriKart[]
}

// ── Eşleştirme kartı (fixture motor — örnek veri) ─────────────────────────────
export interface EslesmeKart {
  birimId: string
  birimOzet: string               // "A123 · 3+1 · Güney · deniz"
  skorEtiketi: string             // editöryel tier etiketi (ham skor DEĞİL)
  nedenler: string[]
  olasiItirazlar: { itiraz: string; yanit: string }[]
}

export interface EslestirmePaketi {
  kaynak: 'ornek_fixture'         // motor 507 gerçek stoğa HENÜZ bağlı değil
  musteri: MusteriKart
  eslesmeler: EslesmeKart[]
}

// ── Veri paketi (retrieval çıktısı — n8n'e giden çekirdek) ────────────────────
export interface VeriPaketi {
  intent: Intent
  bulundu: boolean                // eşleşen veri var mı
  filtre?: StokFiltre
  stok?: StokPaketi
  kampanya?: KampanyaPaketi
  musteri?: MusteriPaketi
  eslestirme?: EslestirmePaketi
  notlar: string[]                // ör. "stok yaşı verisi henüz bağlanmadı"
}

// ── API sözleşmesi ────────────────────────────────────────────────────────────
export interface AliChatRequest {
  soru: string
}

export interface AliChatResponse {
  ok: boolean
  cevap?: string                  // editöryel Türkçe cevap (n8n'den)
  intent?: Intent
  bulundu?: boolean
  fallback?: boolean              // true → n8n erişilemedi / hata, kibar mesaj
  hata?: string
}

// ── n8n'e giden birleşik payload (webhook sözleşmesi) ─────────────────────────
export interface N8nAliPayload {
  soru: string
  vertical: 'emlak' | 'sigorta'
  persona: string                 // aktif müşteri persona etiketi veya "genel"
  sistemPrompt: string            // core + vertical + YAPMA (repo'dan birleşik)
  veriPaketi: VeriPaketi
}
