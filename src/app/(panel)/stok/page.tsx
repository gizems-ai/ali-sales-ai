import { getTenantConfigFromRequest } from '@/lib/yetki'
import { getKullanicıProfili } from '@/lib/yetki'
import { redirect } from 'next/navigation'
import { STOK_LISTESI, type StokItem } from '@/lib/emlak-fixtures'
import { Building2, Home, CheckCircle2, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

const C = {
  violet: '#5B38E8', bordo: '#982A49', line: '#E7EAF2', text: '#071B3A',
  lavender: '#F2EEFF',
}

function fmt(n: number) {
  return n.toLocaleString('tr-TR') + ' ₺'
}

const DURUM_CFG: Record<StokItem['durum'], { label: string; bg: string; fg: string; icon: React.ElementType }> = {
  Müsait:    { label: 'Müsait',    bg: '#D1FAE5', fg: '#065F46', icon: CheckCircle2 },
  Opsiyonlu: { label: 'Opsiyonlu', bg: '#FEF3C7', fg: '#92400E', icon: Clock },
  Satıldı:   { label: 'Satıldı',   bg: '#F1F5F9', fg: '#64748B', icon: Home },
}

function DurumBadge({ durum }: { durum: StokItem['durum'] }) {
  const cfg = DURUM_CFG[durum]
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-[5px] rounded-[8px] px-[9px] py-[4px] text-[11px] font-bold"
      style={{ background: cfg.bg, color: cfg.fg }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function StokKarti({ item }: { item: StokItem }) {
  return (
    <div className="rounded-[14px] border bg-white p-[16px] shadow-sm hover:shadow-md transition-shadow"
      style={{ borderColor: C.line, opacity: item.durum === 'Satıldı' ? 0.6 : 1 }}>
      <div className="flex items-start justify-between mb-[10px]">
        <div>
          <p className="text-[13px] font-black" style={{ color: C.text }}>{item.proje}</p>
          <p className="text-[11px] text-slate-400 mt-[2px]">{item.il}</p>
        </div>
        <DurumBadge durum={item.durum} />
      </div>

      <div className="grid grid-cols-3 gap-[8px] mb-[12px]">
        {[
          { label: 'Blok',   value: item.blok },
          { label: 'Kat',    value: String(item.kat) },
          { label: 'Daire',  value: item.daire },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-[8px] bg-slate-50 px-[8px] py-[6px] text-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-[13px] font-black mt-[2px]" style={{ color: C.text }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-[10px]" style={{ borderColor: C.line }}>
        <div className="flex items-center gap-[5px] text-[12px] text-slate-500">
          <Home size={12} />
          <span>{item.metrekare} m²</span>
        </div>
        <p className="text-[15px] font-black" style={{ color: item.durum === 'Satıldı' ? '#94A3B8' : C.violet }}>
          {fmt(item.fiyat)}
        </p>
      </div>
    </div>
  )
}

export default async function StokPage() {
  const [profil, cfg] = await Promise.all([
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
  ])
  if (!profil) redirect('/login')
  if (!cfg) redirect('/login')
  if (!cfg.modules.stok) redirect('/')

  const musait   = STOK_LISTESI.filter(s => s.durum === 'Müsait').length
  const opsiyonlu= STOK_LISTESI.filter(s => s.durum === 'Opsiyonlu').length
  const satildi  = STOK_LISTESI.filter(s => s.durum === 'Satıldı').length

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-[8px]">
            <Building2 size={20} style={{ color: C.violet }} />
            <h1 className="text-[22px] font-black" style={{ color: C.text }}>Stok / Envanter</h1>
          </div>
          <p className="text-[13px] text-slate-400 mt-[3px]">Proje bazlı daire durumları</p>
        </div>
        <span className="rounded-full bg-amber-50 border border-amber-200 px-[11px] py-[5px] text-[11px] font-bold text-amber-700">
          Örnek veri
        </span>
      </div>

      {/* Özet KPI'lar */}
      <div className="grid grid-cols-3 gap-[12px]">
        {[
          { label: 'Müsait',    count: musait,    bg: '#D1FAE5', fg: '#065F46' },
          { label: 'Opsiyonlu', count: opsiyonlu, bg: '#FEF3C7', fg: '#92400E' },
          { label: 'Satıldı',   count: satildi,   bg: '#F1F5F9', fg: '#64748B' },
        ].map(({ label, count, bg, fg }) => (
          <div key={label} className="rounded-[14px] border bg-white p-[16px] shadow-sm text-center"
            style={{ borderColor: C.line }}>
            <p className="text-[28px] font-black" style={{ color: fg }}>{count}</p>
            <p className="text-[12px] font-medium text-slate-500 mt-[4px]">{label}</p>
            <div className="mt-[8px] h-[4px] rounded-full" style={{ background: bg }} />
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
        {STOK_LISTESI.map(item => <StokKarti key={item.id} item={item} />)}
      </div>
    </div>
  )
}
