import { getFiresatlar } from '@/lib/airtable'
import { getKullanicıProfili, getTenantConfigFromRequest } from '@/lib/yetki'
import { redirect } from 'next/navigation'
import { FirsatlarList } from './_components/firsatlar-list'
import { BUGUNUN_HAMLELERI, type HamleItem } from '@/lib/emlak-fixtures'
import Link from 'next/link'
import Image from 'next/image'

export const revalidate = 300

// ── Emlak token'lar ──────────────────────────────────────────────────
const GRAD = 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)'
const GLASS = 'rgba(255,255,255,.55)'
const GLASS_BD = 'rgba(255,255,255,.72)'
const GLASS_LINE = 'rgba(120,140,125,.16)'
const INK = '#1c2a22'
const BODY = '#57655b'
const MUTED = '#8b988f'
const GREEN = '#248a47'
const GREEN_D = '#1a6b37'
const HOT = '#d9572a'
const HOT_T = '#fde7df'
const WARN_C = '#b07d1e'
const WARN_T = '#fbf1cf'
const BLUE = '#4f68c0'
const BLUE_T = '#e7ecfb'
const SHADOW = '0 2px 6px rgba(40,60,45,.05),0 22px 46px -26px rgba(40,70,50,.30)'

function EmlakFirsatCard({ item }: { item: HamleItem }) {
  const sicaklik = item.sicaklik === 'hot'
    ? { dot: HOT, bg: HOT_T, text: HOT, label: 'Sıcak' }
    : item.sicaklik === 'warm'
    ? { dot: WARN_C, bg: WARN_T, text: WARN_C, label: 'Ilık' }
    : { dot: MUTED, bg: '#eaeef5', text: '#5d6b80', label: 'Soğuk' }

  const asamaBg = item.asama === 'Teklif'
    ? { bg: HOT_T, color: HOT }
    : item.asama === 'Randevu'
    ? { bg: BLUE_T, color: BLUE }
    : { bg: 'rgba(146,214,170,.26)', color: GREEN_D }

  const telHref = `tel:${item.tel}`
  const waHref = `https://wa.me/90${item.tel.replace(/^0/, '').replace(/\s/g, '')}`

  return (
    <div style={{
      background: GLASS,
      backdropFilter: 'blur(22px) saturate(160%)',
      WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      border: `1px solid ${GLASS_BD}`,
      borderRadius: 20,
      boxShadow: SHADOW,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sicaklik.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: INK, flex: 1 }}>{item.ad}</span>
        <span style={{
          fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
          background: sicaklik.bg, color: sicaklik.text, flexShrink: 0,
        }}>{sicaklik.label}</span>
        <span style={{
          fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
          background: asamaBg.bg, color: asamaBg.color, flexShrink: 0,
        }}>{item.asama}</span>
      </div>

      {/* Meta */}
      <div style={{ fontSize: 12.5, fontWeight: 600, color: MUTED }}>{item.tip} · {item.il}</div>

      {/* Ali note */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        background: 'rgba(255,255,255,.45)',
        border: `1px solid ${GLASS_BD}`, borderRadius: 12, padding: '11px 14px',
      }}>
        <div style={{ width: 28, height: 28, flexShrink: 0, marginTop: 1, borderRadius: '50%', background: GRAD, padding: 2 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
            <Image src="/ali-avatar.png" alt="Ali" width={24} height={24} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: BODY, lineHeight: 1.5 }}>{item.aliGerekce}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={telHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 700, padding: '9px 14px', borderRadius: 10,
          border: `1px solid ${GLASS_BD}`, background: GLASS, color: INK, textDecoration: 'none',
        }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ width: 14, height: 14, stroke: GREEN }}>
            <path d="M5 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>
          </svg>
          Ara
        </a>
        <a href={waHref} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 700, padding: '9px 14px', borderRadius: 10,
          background: GREEN, border: `1px solid ${GREEN}`, color: '#fff', textDecoration: 'none',
        }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ width: 14, height: 14, stroke: '#fff' }}>
            <path d="M4 19l1.4-4A8 8 0 1 1 9 18.6z"/>
          </svg>
          WhatsApp
        </a>
      </div>
    </div>
  )
}

async function EmlakFirsatlarPage() {
  const items = BUGUNUN_HAMLELERI
  const hot = items.filter(i => i.sicaklik === 'hot')
  const warm = items.filter(i => i.sicaklik === 'warm')
  const cold = items.filter(i => i.sicaklik === 'cold')

  return (
    <div style={{ padding: '8px 32px 48px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: INK, margin: 0 }}>
          Satış Fırsatları
        </h1>
        <p style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginTop: 4 }}>
          Ali'nin önceliklendirdiği {items.length} aktif fırsat
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Sıcak', count: hot.length, bg: HOT_T, color: HOT },
          { label: 'Ilık', count: warm.length, bg: WARN_T, color: WARN_C },
          { label: 'Soğuk', count: cold.length, bg: '#eaeef5', color: '#5d6b80' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: GLASS, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${GLASS_BD}`, borderRadius: 14,
            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 1px 3px rgba(40,60,45,.04)',
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%', background: kpi.color, flexShrink: 0,
            }} />
            <span style={{ fontSize: 22, fontWeight: 800, color: INK }}>{kpi.count}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>{kpi.label}</span>
          </div>
        ))}
      </div>

      {/* Section: Sıcak */}
      {hot.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: HOT,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: HOT }} />
            Sıcak Fırsatlar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {hot.map(item => <EmlakFirsatCard key={item.id} item={item} />)}
          </div>
        </div>
      )}

      {/* Section: Ilık */}
      {warm.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: WARN_C,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: WARN_C }} />
            Ilık Fırsatlar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {warm.map(item => <EmlakFirsatCard key={item.id} item={item} />)}
          </div>
        </div>
      )}

      {/* Section: Soğuk */}
      {cold.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: MUTED }} />
            Soğuk Fırsatlar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cold.map(item => <EmlakFirsatCard key={item.id} item={item} />)}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function FirsatlarPage() {
  const profil = await getKullanicıProfili()
  if (!profil) redirect('/login')

  const cfg = (await getTenantConfigFromRequest()) ?? undefined

  // Emlak: fixture-based glass page, skip Airtable
  if (cfg?.id === 'emlak_demo') {
    return <EmlakFirsatlarPage />
  }

  let records = []
  try {
    records = await getFiresatlar(cfg)
  } catch {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-sm text-gray-400">Fırsatlar yüklenemedi. Bağlantıyı kontrol et.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Fırsatlar</h1>
        <p className="text-xs text-gray-400 mt-0.5">Signal Engine · {records.length} kayıt</p>
      </div>
      <FirsatlarList records={records} />
    </div>
  )
}
