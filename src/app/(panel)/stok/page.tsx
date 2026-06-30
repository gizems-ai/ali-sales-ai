import { getTenantConfigFromRequest } from '@/lib/yetki'
import { getKullanicıProfili } from '@/lib/yetki'
import { redirect } from 'next/navigation'
import { STOK_LISTESI, STOK_DETAY, type StokItem } from '@/lib/emlak-fixtures'
import { Building2, Eye, Users, Clock, CheckCircle2 } from 'lucide-react'
import { AliReason } from '@/components/emlak/ali-reason'

export const dynamic = 'force-dynamic'

const E = {
  green1: '#0E5132', green2: '#1B7A47', green3: '#2E9D5E',
  surface: '#EFF5EF', coral: '#EF6B4F', line: '#E7EAF2', text: '#071B3A',
}

function fmtFiyat(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M ₺`
  if (n >= 1_000)    return `${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}K ₺`
  return n.toLocaleString('tr-TR') + ' ₺'
}

function durumRenk(durum: StokItem['durum']): { bg: string; fg: string } {
  if (durum === 'Müsait')    return { bg: '#D1FAE5', fg: '#065F46' }
  if (durum === 'Opsiyonlu') return { bg: '#FEF3C7', fg: '#92400E' }
  return { bg: '#F1F5F9', fg: '#64748B' }
}

function talepRenk(aktifTalep: number): string {
  if (aktifTalep >= 4) return E.green2
  if (aktifTalep >= 1) return '#F59E0B'
  return E.coral
}

function StokKarti({ item }: { item: StokItem }) {
  const detay = STOK_DETAY[item.id]
  const { bg, fg } = durumRenk(item.durum)
  const isSatildi = item.durum === 'Satıldı'

  return (
    <div
      className="rounded-[22px] border bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderColor: detay?.riskli ? E.coral : E.line, opacity: isSatildi ? 0.6 : 1 }}
    >
      {/* Üst şerit — sıcaklık rengi */}
      <div
        className="h-[5px]"
        style={{
          background: detay?.riskli
            ? E.coral
            : detay && detay.aktifTalep >= 3
              ? E.green2
              : detay && detay.aktifTalep >= 1
                ? '#F59E0B'
                : '#E2E8F0',
        }}
      />

      <div className="p-[16px]">
        {/* Başlık + durum */}
        <div className="flex items-start justify-between mb-[10px]">
          <div>
            <p className="text-[13px] font-black" style={{ color: E.text }}>{item.proje}</p>
            <p className="text-[11px] text-slate-400 mt-[1px]">{item.il}</p>
          </div>
          <span
            className="inline-flex items-center gap-[4px] rounded-[8px] px-[8px] py-[3px] text-[11px] font-bold shrink-0"
            style={{ background: bg, color: fg }}
          >
            {item.durum === 'Müsait' ? <CheckCircle2 size={10} /> : item.durum === 'Opsiyonlu' ? <Clock size={10} /> : null}
            {item.durum}
          </span>
        </div>

        {/* Blok / Kat / Daire */}
        <div className="grid grid-cols-3 gap-[6px] mb-[12px]">
          {[{ l: 'Blok', v: item.blok }, { l: 'Kat', v: String(item.kat) }, { l: 'Daire', v: item.daire }].map(({ l, v }) => (
            <div key={l} className="rounded-[8px] text-center py-[5px]" style={{ background: E.surface }}>
              <p className="text-[9px] text-slate-400 uppercase tracking-wide">{l}</p>
              <p className="text-[12px] font-black mt-[1px]" style={{ color: E.text }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Metrik satırları */}
        {detay && !isSatildi && (
          <div className="border-t pt-[10px] space-y-[5px]" style={{ borderColor: E.line }}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-[5px] text-slate-500">
                <Eye size={11} /> Görüntülenme/hafta
              </span>
              <span className="font-bold" style={{ color: E.text }}>{detay.goruntulenmePerhafta}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-[5px] text-slate-500">
                <Users size={11} /> Aktif talep
              </span>
              <span className="font-bold" style={{ color: talepRenk(detay.aktifTalep) }}>{detay.aktifTalep}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-[5px] text-slate-500">
                <Clock size={11} /> Tahmini satış
              </span>
              <span className="font-bold" style={{ color: E.text }}>{detay.tahminiSatisSuresi}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Son gösterim</span>
              <span className="font-medium text-slate-500">
                {detay.sonGosteriminGunu === 0 ? 'Bugün' : `${detay.sonGosteriminGunu} gün önce`}
              </span>
            </div>
          </div>
        )}

        {/* Fiyat */}
        <div className="flex items-center justify-between mt-[10px] pt-[8px] border-t" style={{ borderColor: E.line }}>
          <span className="text-[11px] text-slate-400">{item.metrekare} m²</span>
          <p className="text-[15px] font-black" style={{ color: isSatildi ? '#94A3B8' : E.green2 }}>
            {fmtFiyat(item.fiyat)}
          </p>
        </div>

        {/* Ali önerisi (riskli) */}
        {detay?.riskli && detay.aliOneri && (
          <AliReason>{detay.aliOneri}</AliReason>
        )}
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

  const musait    = STOK_LISTESI.filter(s => s.durum === 'Müsait').length
  const opsiyonlu = STOK_LISTESI.filter(s => s.durum === 'Opsiyonlu').length
  const satildi   = STOK_LISTESI.filter(s => s.durum === 'Satıldı').length
  const riskli    = Object.values(STOK_DETAY).filter(d => d.riskli).length

  const hizliSati = STOK_LISTESI.filter(s => {
    const d = STOK_DETAY[s.id]
    return s.durum !== 'Satıldı' && d && d.aktifTalep >= 3
  }).length
  const ortaSati  = STOK_LISTESI.filter(s => {
    const d = STOK_DETAY[s.id]
    return s.durum !== 'Satıldı' && d && d.aktifTalep >= 1 && d.aktifTalep < 3
  }).length
  const yavaslar  = STOK_LISTESI.filter(s => {
    const d = STOK_DETAY[s.id]
    return s.durum !== 'Satıldı' && d && d.aktifTalep === 0
  }).length

  return (
    <div className="max-w-7xl mx-auto space-y-5" style={{ padding: '24px 32px 48px' }}>

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <div className="h-[36px] w-[36px] rounded-full grid place-items-center text-white"
            style={{ background: `linear-gradient(135deg, ${E.green1}, ${E.green2})` }}>
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="text-[20px] font-black" style={{ color: E.text }}>Stok / Envanter</h1>
            <p className="text-[12px] text-slate-400">Isı haritası · Portföy sağlığı</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-50 border border-amber-200 px-[11px] py-[5px] text-[11px] font-bold text-amber-700">
          Örnek veri
        </span>
      </div>

      {/* Stok Sağlığı Şeridi */}
      <div className="rounded-[22px] border bg-white p-[18px] shadow-sm" style={{ borderColor: E.line }}>
        <p className="text-[13px] font-black mb-[14px]" style={{ color: E.text }}>Portföy Sağlığı</p>
        <div className="grid grid-cols-3 gap-[10px] mb-[14px]">
          {[
            { label: 'Hızlı Satış',  count: hizliSati,  bg: '#D1FAE5', fg: '#065F46', bar: E.green2   },
            { label: 'Ortalama',     count: ortaSati,   bg: '#FEF3C7', fg: '#92400E', bar: '#F59E0B'  },
            { label: 'Yavaş / Risk', count: yavaslar + riskli, bg: '#FEE2E2', fg: '#991B1B', bar: E.coral },
          ].map(({ label, count, bg, fg, bar }) => (
            <div key={label} className="rounded-[14px] p-[12px] text-center" style={{ background: bg }}>
              <p className="text-[22px] font-black" style={{ color: fg }}>{count}</p>
              <p className="text-[11px] font-semibold mt-[2px]" style={{ color: fg }}>{label}</p>
              <div className="mt-[8px] h-[3px] rounded-full" style={{ background: bar }} />
            </div>
          ))}
        </div>
        {/* Toplam özet */}
        <div className="grid grid-cols-4 gap-[8px]">
          {[
            { l: 'Müsait',    v: musait,    c: '#065F46' },
            { l: 'Opsiyonlu', v: opsiyonlu, c: '#92400E' },
            { l: 'Satıldı',   v: satildi,   c: '#64748B' },
            { l: 'Riskli',    v: riskli,    c: E.coral   },
          ].map(({ l, v, c }) => (
            <div key={l} className="text-center">
              <p className="text-[18px] font-black" style={{ color: c }}>{v}</p>
              <p className="text-[11px] text-slate-400 mt-[1px]">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Portföy Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
        {STOK_LISTESI.map(item => <StokKarti key={item.id} item={item} />)}
      </div>
    </div>
  )
}
