// ════════════════════════════════════════════════════════════════════════════
//  Ali Sohbet — Deterministik retrieval (SALT OKUNUR)
//  Rakamların TEK kaynağı burasıdır. Paket dışında hiçbir sayı üretilemez.
//  Stok/kampanya → GERÇEK 507 (kampanya-store). Müşteri/eşleştirme → fixture motor.
//  Karar (Gizem, 11 Tem): iki dünya birleştirilmez. Eşleştirme örnek veri üstünde.
// ════════════════════════════════════════════════════════════════════════════

import { getStokListesi, getKampanyalar, kampanyaStoklari, ilceFor } from '../kampanya-store'
import type { KampanyaKaydi } from '../kampanya-store'
import type { AdaptedUnit, Proje } from '../stok-adapter'
import {
  CUSTOMERS, customerById, unitById,
  eslesmelerForCustomer, PERSONA_ETIKET, TIERS, fmtFiyat,
} from '../ali-zeka'
import type { Customer, Match } from '../ali-zeka'
import { siniflandir, norm } from './intent'
import type {
  VeriPaketi, StokFiltre, StokKart, StokPaketi,
  KampanyaKart, MusteriKart, EslesmeKart,
} from './types'

const EMSAL_TR: Record<string, string> = { altinda: 'altında', emsalde: 'emsalde', ustunde: 'üstünde' }
const STOK_ORNEK_LIMIT = 8

// ── Kaldıraç etiketleri (Türkçe editöryel) ────────────────────────────────────
const KALDIRAC_TR: Record<string, string> = {
  komisyon: 'komisyon', referans: 'referans', kitlik: 'kıtlık', deneyim: 'deneyim',
  finansman: 'finansman', hediye: 'hediye', prestij: 'prestij', topluluk: 'topluluk',
  fiyat: 'fiyat',
}

// ── Stok filtresi uygula ──────────────────────────────────────────────────────
function stokFiltrele(filtre: StokFiltre): AdaptedUnit[] {
  return getStokListesi().filter(u => {
    if (filtre.sadeceSatilabilir && !u.satilabilir) return false
    if (filtre.proje && u.proje !== filtre.proje) return false
    if (filtre.tip && u.tip !== filtre.tip) return false
    if (filtre.grup && u.grup !== filtre.grup) return false
    if (filtre.fiyatUSDMax != null && u.fiyatUSD > filtre.fiyatUSDMax) return false
    if (filtre.fiyatUSDMin != null && u.fiyatUSD < filtre.fiyatUSDMin) return false
    return true
  })
}

function stokKart(u: AdaptedUnit): StokKart {
  return {
    id: u.id, proje: u.proje, ilce: ilceFor(u.proje as Proje),
    blok: u.blok, daireNo: u.daireNo, tip: u.tip, brutM2: u.brutM2,
    grup: u.grup, emsal: EMSAL_TR[u.emsal] ?? u.emsal,
    fiyatUSD: u.fiyatUSD, fiyatTL: u.fiyatTL, durum: u.durum,
  }
}

function say<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const m: Record<string, number> = {}
  for (const x of arr) { const k = key(x); m[k] = (m[k] ?? 0) + 1 }
  return m
}

function filtreOzeti(filtre: StokFiltre): string {
  const parts: string[] = []
  if (filtre.proje) parts.push(filtre.proje)
  if (filtre.tip) parts.push(filtre.tip)
  if (filtre.grup) parts.push(`${filtre.grup} grubu`)
  if (filtre.fiyatUSDMax != null) parts.push(`≤ ${filtre.fiyatUSDMax.toLocaleString('tr-TR')} $`)
  if (filtre.fiyatUSDMin != null) parts.push(`≥ ${filtre.fiyatUSDMin.toLocaleString('tr-TR')} $`)
  if (filtre.sadeceSatilabilir) parts.push('satılabilir')
  return parts.length ? parts.join(' · ') : 'tüm stok'
}

function buildStok(filtre: StokFiltre): StokPaketi {
  const eslesen = stokFiltrele(filtre)
  const fiyatlar = eslesen.map(u => u.fiyatUSD).filter(f => f > 0)
  return {
    filtreOzeti: filtreOzeti(filtre),
    toplamEslesen: eslesen.length,
    gosterilen: Math.min(eslesen.length, STOK_ORNEK_LIMIT),
    birimler: eslesen.slice(0, STOK_ORNEK_LIMIT).map(stokKart),
    projeDagilimi: say(eslesen, u => u.proje),
    tipDagilimi: say(eslesen, u => u.tip),
    grupDagilimi: say(eslesen, u => u.grup),
    fiyatUSDAralik: fiyatlar.length ? { min: Math.min(...fiyatlar), max: Math.max(...fiyatlar) } : null,
  }
}

// ── Kampanya paketi ───────────────────────────────────────────────────────────
function kampanyaKart(k: KampanyaKaydi): KampanyaKart {
  const bagli = kampanyaStoklari(k)
  return {
    id: k.id, baslik: k.baslik, teklifOzeti: k.teklifOzeti,
    kaldirac: k.kaldirac.map(l => KALDIRAC_TR[l] ?? l),
    hedefProje: k.hedefStok.proje,
    hedefGruplar: k.hedefStok.gruplar,
    bagliBirimSayisi: bagli.length,
    ornekBirimIds: bagli.slice(0, 5).map(u => u.id),
    yayinTarihi: k.yayinTarihi,
  }
}

// ── Müşteri kartı (fixture) ───────────────────────────────────────────────────
function musteriKart(c: Customer): MusteriKart {
  return {
    id: c.id, ad: c.ad, persona: PERSONA_ETIKET[c.persona], ozet: c.ozet,
    butceTL: c.butce, konusmaOnerisi: c.konusmaOnerisi, itirazlar: c.itirazlar,
  }
}

// ── Eşleşme kartı (fixture motor) — ham skor YOK, editöryel tier etiketi ───────
function eslesmeKart(m: Match): EslesmeKart {
  const u = unitById(m.unitId)!
  return {
    birimId: m.unitId,
    birimOzet: `${u.daire} · ${u.tip} · ${u.metrekare} m² · ${u.cephe} cephe · ${u.manzara} · ${fmtFiyat(u.fiyat)}`,
    skorEtiketi: TIERS[m.tier].label,
    nedenler: m.nedenler,
    olasiItirazlar: m.olasiItirazlar,
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  ANA GİRİŞ — soru → VeriPaketi
// ════════════════════════════════════════════════════════════════════════════
export function retrieve(soru: string): VeriPaketi {
  const { intent, filtre, musteriId } = siniflandir(soru)
  const notlar: string[] = []

  if (intent === 'stok') {
    const stok = buildStok(filtre)
    // Stok yaşı Faz 1 dışı (Gizem kararı 11 Tem): sorulursa dürüst not.
    if (/gun|yas|bekleyen|eski|yeni/.test(norm(soru))) {
      notlar.push('Stok yaşı verisi henüz bağlanmadı — yaş bazlı filtre Faz 2\'de gelecek.')
    }
    return { intent, bulundu: stok.toplamEslesen > 0, filtre, stok, notlar }
  }

  if (intent === 'kampanya') {
    const yayinda = getKampanyalar().filter(k => k.brokerYayin && k.status === 'published')
    return {
      intent, bulundu: yayinda.length > 0, notlar,
      kampanya: { yayindaSayisi: yayinda.length, kampanyalar: yayinda.map(kampanyaKart) },
    }
  }

  if (intent === 'musteri') {
    if (musteriId) {
      const c = customerById(musteriId)
      if (c) {
        return {
          intent, bulundu: true, notlar,
          musteri: { kaynak: 'ornek_fixture', toplam: 1, musteriler: [musteriKart(c)] },
        }
      }
    }
    return {
      intent, bulundu: CUSTOMERS.length > 0, notlar,
      musteri: { kaynak: 'ornek_fixture', toplam: CUSTOMERS.length, musteriler: CUSTOMERS.map(musteriKart) },
    }
  }

  if (intent === 'eslestirme') {
    const c = musteriId ? customerById(musteriId) : undefined
    if (!c) {
      // Müşteri çözülemedi → müşteri listesi göster
      return {
        intent: 'musteri', bulundu: true, notlar,
        musteri: { kaynak: 'ornek_fixture', toplam: CUSTOMERS.length, musteriler: CUSTOMERS.map(musteriKart) },
      }
    }
    // Eşleştirme motoru 507 GERÇEK stoğa değil, 18 örnek üniteye bağlı (Faz 1).
    notlar.push('Eşleştirme örnek stok üzerinde çalışıyor; 507 gerçek envantere bağlanması Faz 2 işi.')
    const eslesmeler = eslesmelerForCustomer(c, 4).map(eslesmeKart)
    return {
      intent, bulundu: true, notlar,
      eslestirme: { kaynak: 'ornek_fixture', musteri: musteriKart(c), eslesmeler },
    }
  }

  // kapsam_disi
  return { intent: 'kapsam_disi', bulundu: false, notlar }
}
