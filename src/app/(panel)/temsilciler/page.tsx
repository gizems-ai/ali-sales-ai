import { getTenantConfigFromRequest, getKullanicıProfili } from '@/lib/yetki'
import { redirect } from 'next/navigation'
import { TEMSILCI_SKORU, LEAD_YASLANMA } from '@/lib/emlak-fixtures'
import { UserCheck, TrendingUp, Phone, Calendar, Trophy } from 'lucide-react'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

const E = {
  green1: '#0E5132', green2: '#1B7A47', green3: '#2E9D5E',
  surface: '#EFF5EF', coral: '#EF6B4F', line: '#E7EAF2', text: '#071B3A',
}

function fmtPara(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M ₺`
  if (n >= 1_000)    return `${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}K ₺`
  return n === 0 ? '— ₺' : n.toLocaleString('tr-TR') + ' ₺'
}

export default async function TemsilcilerPage() {
  const [profil, cfg] = await Promise.all([
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
  ])
  if (!profil) redirect('/login')
  if (!cfg) redirect('/login')
  if (cfg.id !== 'emlak_demo') redirect('/')  // emlak-only bölüm — diğer tenant'larda URL ile de erişilemez

  const komisyonOrani = 0.025  // %2.5 varsayılan komisyon

  const toplamLead   = TEMSILCI_SKORU.reduce((s, t) => s + t.leadSayisi, 0)
  const toplamArama  = TEMSILCI_SKORU.reduce((s, t) => s + t.aramaSayisi, 0)
  const toplamSatis  = TEMSILCI_SKORU.reduce((s, t) => s + t.satisAdedi, 0)
  const toplamCiro   = TEMSILCI_SKORU.reduce((s, t) => s + t.ciro, 0)
  const beklenenCiro = TEMSILCI_SKORU.reduce((s, t) => {
    const pipeline = t.leadSayisi - t.satisAdedi
    return s + pipeline * 4_500_000 * 0.3
  }, 0)

  const ustTemsilci = [...TEMSILCI_SKORU].sort((a, b) => b.hedefYuzde - a.hedefYuzde)[0]
  const riskTemsilci = [...TEMSILCI_SKORU].sort((a, b) => a.hedefYuzde - b.hedefYuzde)[0]

  return (
    <div className="max-w-7xl mx-auto space-y-5" style={{ padding: '24px 32px 48px' }}>

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <div className="h-[36px] w-[36px] rounded-full grid place-items-center text-white"
            style={{ background: `linear-gradient(135deg, ${E.green1}, ${E.green2})` }}>
            <UserCheck size={18} />
          </div>
          <div>
            <h1 className="text-[20px] font-black" style={{ color: E.text }}>Temsilciler</h1>
            <p className="text-[12px] text-slate-400">Skorboard · Lead yaşlanma · Gelir tahmini</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-50 border border-amber-200 px-[11px] py-[5px] text-[11px] font-bold text-amber-700">
          Örnek veri
        </span>
      </div>

      {/* Ali Takım Analizi */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'flex-start',
        background: 'rgba(255,255,255,.55)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        border: '1px solid rgba(255,255,255,.72)',
        borderRadius: 20, padding: '16px 20px',
        boxShadow: '0 2px 6px rgba(40,60,45,.05),0 22px 46px -26px rgba(40,70,50,.30)',
      }}>
        <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)', padding: 3 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
            <Image src="/ali-avatar.png" alt="Ali" width={46} height={46} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, color: E.green2, marginBottom: 5 }}>Ali — Takım Analizi</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#57655b', lineHeight: 1.6 }}>
            {ustTemsilci.ad} bu ay en yüksek dönüşüm oranıyla lider konumda — iyi iş! {riskTemsilci.ad}&apos;nın lead yaşlanması kritik seviyede; pipeline&apos;daki eski müşterileri bugün yeniden aktifleştirmesini öneririm.
          </p>
        </div>
      </div>

      {/* Özet KPI'lar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[12px]">
        {[
          { icon: UserCheck,   label: 'Toplam Lead',  value: toplamLead,  sub: 'Aktif pipeline' },
          { icon: Phone,       label: 'Toplam Arama', value: toplamArama, sub: 'Bu ay' },
          { icon: Trophy,      label: 'Satış',        value: toplamSatis, sub: 'Gerçekleşen' },
          { icon: TrendingUp,  label: 'Gerçek Ciro',  value: fmtPara(toplamCiro), sub: 'Bu ay kapanış' },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-[22px] border bg-white p-[16px] shadow-sm" style={{ borderColor: E.line }}>
            <div className="flex items-start justify-between">
              <p className="text-[12px] font-bold text-slate-500">{label}</p>
              <div className="h-[32px] w-[32px] rounded-full grid place-items-center text-white shrink-0"
                style={{ background: E.green2 }}>
                <Icon size={14} />
              </div>
            </div>
            <p className="mt-[8px] text-[24px] font-black leading-none" style={{ color: E.text }}>{value}</p>
            <p className="mt-[4px] text-[11px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Skorboard Tablosu */}
      <div className="rounded-[22px] border bg-white shadow-sm overflow-hidden" style={{ borderColor: E.line }}>
        <div className="px-[20px] py-[16px] border-b" style={{ borderColor: E.line }}>
          <h2 className="text-[16px] font-black" style={{ color: E.text }}>Danışman Skorboard</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide"
                style={{ borderBottom: `1px solid ${E.line}`, background: E.surface }}>
                <th className="px-[20px] py-[10px]">#</th>
                <th className="px-[12px] py-[10px]">Danışman</th>
                <th className="px-[12px] py-[10px] text-right">Lead</th>
                <th className="px-[12px] py-[10px] text-right">Arama</th>
                <th className="px-[12px] py-[10px] text-right">Randevu</th>
                <th className="px-[12px] py-[10px] text-right">Satış</th>
                <th className="px-[20px] py-[10px] min-w-[160px]">Hedef %</th>
              </tr>
            </thead>
            <tbody>
              {TEMSILCI_SKORU
                .slice()
                .sort((a, b) => b.hedefYuzde - a.hedefYuzde)
                .map((t, i) => (
                  <tr key={t.ad} className="border-b last:border-0" style={{ borderColor: E.line }}>
                    <td className="px-[20px] py-[14px]">
                      <span
                        className="h-[24px] w-[24px] rounded-full grid place-items-center text-[11px] font-black text-white"
                        style={{ background: i === 0 ? '#F59E0B' : E.green2 }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-[12px] py-[14px]">
                      <div className="flex items-center gap-[8px]">
                        <span
                          className="h-[30px] w-[30px] rounded-full grid place-items-center text-[12px] font-black text-white shrink-0"
                          style={{ background: t.renk }}
                        >
                          {t.ad[0]}
                        </span>
                        <span className="text-[13px] font-bold" style={{ color: E.text }}>{t.ad}</span>
                      </div>
                    </td>
                    <td className="px-[12px] py-[14px] text-right text-[13px] font-semibold" style={{ color: E.text }}>{t.leadSayisi}</td>
                    <td className="px-[12px] py-[14px] text-right text-[13px] font-semibold" style={{ color: E.text }}>{t.aramaSayisi}</td>
                    <td className="px-[12px] py-[14px] text-right text-[13px] font-semibold" style={{ color: E.text }}>{t.randevuSayisi}</td>
                    <td className="px-[12px] py-[14px] text-right">
                      <span
                        className="inline-flex items-center justify-center h-[22px] min-w-[22px] rounded-full px-[6px] text-[11px] font-black text-white"
                        style={{ background: t.satisAdedi > 0 ? E.green2 : '#94A3B8' }}
                      >
                        {t.satisAdedi}
                      </span>
                    </td>
                    <td className="px-[20px] py-[14px]">
                      <div className="flex items-center gap-[8px]">
                        <div className="flex-1 h-[6px] rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(t.hedefYuzde, 100)}%`,
                              background: t.hedefYuzde >= 70 ? E.green2 : t.hedefYuzde >= 40 ? '#F59E0B' : E.coral,
                            }}
                          />
                        </div>
                        <span className="text-[12px] font-bold w-[36px] text-right" style={{ color: E.text }}>
                          %{t.hedefYuzde}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alt 2 kolon: Lead Yaşlanma + Gelir Tahmini */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">

        {/* Lead Yaşlanma */}
        <div className="rounded-[22px] border bg-white p-[20px] shadow-sm" style={{ borderColor: E.line }}>
          <h3 className="text-[15px] font-black mb-[16px]" style={{ color: E.text }}>Lead Yaşlanma</h3>
          <div className="space-y-[10px]">
            {LEAD_YASLANMA.map(({ etiket, renk, sayi }) => (
              <div key={etiket} className="flex items-center gap-[12px]">
                <span className="w-[70px] text-[12px] text-slate-500 shrink-0">{etiket}</span>
                <div className="flex-1 h-[28px] rounded-[8px] overflow-hidden bg-slate-50">
                  <div
                    className="h-full rounded-[8px] flex items-center px-[10px]"
                    style={{
                      width: `${Math.max((sayi / 10) * 100, 15)}%`,
                      background: renk + '33',
                      borderLeft: `3px solid ${renk}`,
                    }}
                  >
                    <span className="text-[12px] font-black" style={{ color: renk }}>{sayi}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gelir Tahmini */}
        <div className="rounded-[22px] border bg-white p-[20px] shadow-sm" style={{ borderColor: E.line }}>
          <h3 className="text-[15px] font-black mb-[16px]" style={{ color: E.text }}>Gelir Tahmini</h3>
          <div className="space-y-[14px]">
            {[
              {
                label: 'Beklenen Satışlar',
                value: beklenenCiro,
                sub: 'Pipeline ortalaması × dönüşüm',
                color: E.green2,
              },
              {
                label: 'Gerçekleşen Ciro',
                value: toplamCiro,
                sub: 'Bu ay kapanan işlemler',
                color: E.green3,
              },
              {
                label: 'Tahmini Komisyon',
                value: toplamCiro * komisyonOrani,
                sub: `%${(komisyonOrani * 100).toFixed(1)} komisyon oranı`,
                color: '#7C3AED',
              },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="flex items-center justify-between py-[10px] border-b last:border-0" style={{ borderColor: E.line }}>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: E.text }}>{label}</p>
                  <p className="text-[11px] text-slate-400 mt-[1px]">{sub}</p>
                </div>
                <p className="text-[16px] font-black" style={{ color }}>{fmtPara(value)}</p>
              </div>
            ))}

            {/* Komisyon Split */}
            <div className="rounded-[14px] p-[12px]" style={{ background: E.surface }}>
              <p className="text-[12px] font-black mb-[8px]" style={{ color: E.text }}>Komisyon Paylaşımı</p>
              <div className="space-y-[4px]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Ofis payı (%50)</span>
                  <span className="font-bold" style={{ color: E.text }}>{fmtPara(toplamCiro * komisyonOrani * 0.5)}</span>
                </div>
                {TEMSILCI_SKORU.map(t => (
                  <div key={t.ad} className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{t.ad} (%{Math.round((50 / TEMSILCI_SKORU.length))})</span>
                    <span className="font-bold" style={{ color: t.renk }}>
                      {fmtPara(toplamCiro * komisyonOrani * 0.5 / TEMSILCI_SKORU.length)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
