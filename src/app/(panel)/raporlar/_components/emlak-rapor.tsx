'use client'

import { TEMSILCI_SKORU, LEAD_YASLANMA, BUGUNUN_HAMLELERI, STOK_LISTESI } from '@/lib/emlak-fixtures'
import { TrendingUp, Home, Users, Phone, BarChart3, FileText, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { useT } from '@/lib/i18n/context'
import { ContentViewer } from '@/app/(panel)/gelisim/_components/content-viewer'

const E = {
  green1: '#0E5132', green2: '#1B7A47', green3: '#2E9D5E',
  surface: '#EFF5EF', coral: '#EF6B4F', line: '#E7EAF2', text: '#071B3A',
}

function fmtPara(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M ₺`
  if (n >= 1_000)    return `${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}K ₺`
  return n === 0 ? '— ₺' : n.toLocaleString('tr-TR') + ' ₺'
}

const KAYNAK_DATA = [
  { kaynak: 'Instagram',   lead: 4, donusum: 25 },
  { kaynak: 'Referans',    lead: 3, donusum: 67 },
  { kaynak: 'Sahibinden',  lead: 2, donusum: 50 },
  { kaynak: 'Hepsiemlak',  lead: 1, donusum: 0  },
]

export function EmlakRapor() {
  const tr = useT()
  const [viewer, setViewer] = useState<{ src: string; baslik: string } | null>(null)
  const toplamCiro   = TEMSILCI_SKORU.reduce((s, t) => s + t.ciro, 0)
  const toplamSatis  = TEMSILCI_SKORU.reduce((s, t) => s + t.satisAdedi, 0)
  const komisyonOrani = 0.025
  const toplamKomisyon = toplamCiro * komisyonOrani

  const ortalamaDonum = STOK_LISTESI.filter(s => s.durum !== 'Satıldı').length > 0
    ? Math.round(
        STOK_LISTESI
          .filter(s => s.durum !== 'Satıldı')
          .map(s => parseFloat('3.5'))  // tahmini ortalama hafta
          .reduce((a, b) => a + b, 0) / STOK_LISTESI.filter(s => s.durum !== 'Satıldı').length
      )
    : 0

  return (
    <div className="space-y-5">

      {/* Ali Rapor Özeti */}
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
          <p style={{ fontSize: 12, fontWeight: 800, color: E.green2, marginBottom: 5 }}>{tr('rep.aliDonemsel')}</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#57655b', lineHeight: 1.6 }}>
            {tr('rep.aliInsight')}
          </p>
        </div>
      </div>

      {/* Örnek veri banner */}
      <div className="flex items-center gap-[10px] rounded-[14px] border border-amber-200 bg-amber-50 px-[16px] py-[10px]">
        <span className="text-[12px] font-bold text-amber-700">{tr('rep.emlakDemoOrnek')}</span>
        <span className="text-[12px] text-amber-600 flex-1">{tr('rep.airtableNotice')}</span>
      </div>

      {/* Stok Durumu Analizi — gömülü canlı pano */}
      <button onClick={() => setViewer({ src: '/decks/Babacan_Portfoy_Durum_Panosu.html', baslik: tr('rep.portfoyDurumPanosu') })}
        className="w-full text-left rounded-[22px] border bg-white p-[16px] shadow-sm flex items-center gap-[14px] transition-shadow hover:shadow-md"
        style={{ borderColor: E.line }}>
        <span className="grid place-items-center rounded-[13px] text-white shrink-0" style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#6D5BE0,#8c97d8)' }}>
          <FileText size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[8px] flex-wrap">
            <p className="text-[15px] font-black" style={{ color: E.text }}>{tr('rep.stokDurumuAnalizi')}</p>
            <span className="inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px] text-[10px] font-bold" style={{ background: '#D1FAE5', color: '#065F46' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />{tr('rep.canliIcerik')}
            </span>
          </div>
          <p className="text-[12px] text-slate-400 mt-[2px] truncate">{tr('rep.stokDurumuSub')}</p>
        </div>
        <ChevronRight size={18} className="text-slate-300 shrink-0" />
      </button>

      {/* Tahmini Ciro / Komisyon / Döngü KPI'ları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-[12px]">
        {[
          { icon: TrendingUp, label: tr('rep.tahminiCiro'),       value: fmtPara(toplamCiro + 4_500_000 * 0.3 * 5), sub: tr('rep.pipelineDahilTahmin') },
          { icon: Home,       label: tr('rep.gerceklesenCiro'),   value: fmtPara(toplamCiro),                        sub: tr('rep.satisKapandi').replace('{n}', String(toplamSatis)) },
          { icon: BarChart3,  label: tr('rep.tahminiKomisyon'),   value: fmtPara(toplamKomisyon),                    sub: tr('rep.oranPct').replace('{n}', (komisyonOrani * 100).toFixed(1)) },
          { icon: Users,      label: tr('rep.pipelineLead'),      value: BUGUNUN_HAMLELERI.length.toString(),        sub: tr('rep.aktifMusteri') },
          { icon: Phone,      label: tr('rep.ortalamaDongu'),     value: tr('rep.haftaUnit').replace('{n}', String(ortalamaDonum)),                   sub: tr('rep.ilkTemasTeklif') },
          { icon: Home,       label: tr('rep.stokDevri'),         value: tr('rep.musaitCount').replace('{n}', String(STOK_LISTESI.filter(s => s.durum === 'Müsait').length)), sub: tr('rep.aktifPortfoy') },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-[22px] border bg-white p-[16px] shadow-sm" style={{ borderColor: E.line }}>
            <div className="flex items-start justify-between">
              <p className="text-[12px] font-bold text-slate-500">{label}</p>
              <div className="h-[30px] w-[30px] rounded-full grid place-items-center text-white shrink-0"
                style={{ background: E.green2 }}>
                <Icon size={13} />
              </div>
            </div>
            <p className="mt-[8px] text-[22px] font-black leading-none" style={{ color: E.text }}>{value}</p>
            <p className="mt-[3px] text-[11px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Lead Kaynak Performansı */}
      <div className="rounded-[22px] border bg-white p-[20px] shadow-sm" style={{ borderColor: E.line }}>
        <h3 className="text-[16px] font-black mb-[16px]" style={{ color: E.text }}>{tr('rep.leadKaynakPerformansi')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide"
                style={{ borderBottom: `1px solid ${E.line}`, background: E.surface }}>
                <th className="px-[16px] py-[8px]">{tr('rep.kaynak')}</th>
                <th className="px-[12px] py-[8px] text-right">{tr('rep.lead')}</th>
                <th className="px-[12px] py-[8px]">{tr('rep.donusumPctHeader')}</th>
                <th className="px-[16px] py-[8px]">{tr('rep.performans')}</th>
              </tr>
            </thead>
            <tbody>
              {KAYNAK_DATA.map(({ kaynak, lead, donusum }) => (
                <tr key={kaynak} className="border-b last:border-0" style={{ borderColor: E.line }}>
                  <td className="px-[16px] py-[12px] text-[13px] font-bold" style={{ color: E.text }}>{kaynak}</td>
                  <td className="px-[12px] py-[12px] text-right text-[13px] font-semibold text-slate-600">{lead}</td>
                  <td className="px-[12px] py-[12px]">
                    <div className="flex items-center gap-[8px]">
                      <div className="w-[80px] h-[6px] rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${donusum}%`,
                            background: donusum >= 50 ? E.green2 : donusum >= 25 ? '#F59E0B' : E.coral,
                          }}
                        />
                      </div>
                      <span
                        className="text-[12px] font-bold"
                        style={{ color: donusum >= 50 ? E.green2 : donusum >= 25 ? '#92400E' : E.coral }}
                      >
                        %{donusum}
                      </span>
                    </div>
                  </td>
                  <td className="px-[16px] py-[12px]">
                    <span
                      className="inline-flex rounded-full px-[8px] py-[2px] text-[10px] font-bold"
                      style={{
                        background: donusum >= 50 ? '#D1FAE5' : donusum >= 25 ? '#FEF3C7' : '#FEE2E2',
                        color:      donusum >= 50 ? '#065F46' : donusum >= 25 ? '#92400E' : '#991B1B',
                      }}
                    >
                      {donusum >= 50 ? tr('rep.iyi') : donusum >= 25 ? tr('rep.orta') : donusum === 0 ? tr('rep.pasif') : tr('rep.dusuk')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Komisyon Paylaşımı */}
      <div className="rounded-[22px] border bg-white p-[20px] shadow-sm" style={{ borderColor: E.line }}>
        <h3 className="text-[16px] font-black mb-[16px]" style={{ color: E.text }}>{tr('rep.komisyonPaylasimi')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <div>
            <p className="text-[12px] text-slate-400 mb-[10px]">{tr('rep.dagilimOzeti')}</p>
            <div className="space-y-[10px]">
              <div className="flex items-center justify-between py-[8px] border-b" style={{ borderColor: E.line }}>
                <span className="text-[13px] font-bold" style={{ color: E.text }}>{tr('rep.toplamKomisyon')}</span>
                <span className="text-[15px] font-black" style={{ color: E.green2 }}>{fmtPara(toplamKomisyon)}</span>
              </div>
              <div className="flex items-center justify-between py-[8px] border-b" style={{ borderColor: E.line }}>
                <span className="text-[13px] text-slate-500">{tr('rep.ofisPayi')}</span>
                <span className="text-[14px] font-black" style={{ color: E.text }}>{fmtPara(toplamKomisyon * 0.5)}</span>
              </div>
              {TEMSILCI_SKORU.map(t => (
                <div key={t.ad} className="flex items-center justify-between py-[8px] border-b last:border-0" style={{ borderColor: E.line }}>
                  <div className="flex items-center gap-[8px]">
                    <span className="h-[20px] w-[20px] rounded-full grid place-items-center text-[10px] font-black text-white" style={{ background: t.renk }}>
                      {t.ad[0]}
                    </span>
                    <span className="text-[13px] text-slate-500">{t.ad}</span>
                  </div>
                  <span className="text-[13px] font-bold" style={{ color: t.renk }}>
                    {fmtPara(toplamKomisyon * 0.5 / TEMSILCI_SKORU.length)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] text-slate-400 mb-[10px]">{tr('rep.leadYaslanma')}</p>
            <div className="space-y-[8px]">
              {LEAD_YASLANMA.map(({ etiket, renk, sayi }) => (
                <div key={etiket} className="flex items-center gap-[10px]">
                  <span className="w-[65px] text-[11px] text-slate-500 shrink-0">{etiket}</span>
                  <div className="flex-1 h-[20px] rounded-[6px] overflow-hidden bg-slate-50">
                    <div
                      className="h-full rounded-[6px] flex items-center px-[8px]"
                      style={{ width: `${Math.max((sayi / 10) * 100, 15)}%`, background: renk + '33', borderLeft: `3px solid ${renk}` }}
                    >
                      <span className="text-[11px] font-black" style={{ color: renk }}>{sayi}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sistem deck'leri — Raporlar sonu */}
      <button onClick={() => setViewer({ src: '/decks/Babacan_Revenue_OS.html', baslik: tr('rep.revenueOsTitle') })}
        className="w-full text-left rounded-[22px] border bg-white p-[16px] shadow-sm flex items-center gap-[14px] transition-shadow hover:shadow-md"
        style={{ borderColor: E.line }}>
        <span className="grid place-items-center rounded-[13px] text-white shrink-0" style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#6D5BE0,#8c97d8)' }}>
          <TrendingUp size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[8px] flex-wrap">
            <p className="text-[15px] font-black" style={{ color: E.text }}>{tr('rep.revenueOsTitle')}</p>
            <span className="inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px] text-[10px] font-bold" style={{ background: '#D1FAE5', color: '#065F46' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />{tr('rep.canliIcerik')}
            </span>
          </div>
          <p className="text-[12px] text-slate-400 mt-[2px] truncate">{tr('rep.revenueOsSub')}</p>
        </div>
        <ChevronRight size={18} className="text-slate-300 shrink-0" />
      </button>

      <button onClick={() => setViewer({ src: '/decks/Babacan_Stok_Zekasi.html', baslik: tr('rep.stokDonusumMerkezi') })}
        className="w-full text-left rounded-[22px] border bg-white p-[16px] shadow-sm flex items-center gap-[14px] transition-shadow hover:shadow-md"
        style={{ borderColor: E.line }}>
        <span className="grid place-items-center rounded-[13px] text-white shrink-0" style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#2c8a52,#4f9f6c)' }}>
          <Home size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[8px] flex-wrap">
            <p className="text-[15px] font-black" style={{ color: E.text }}>{tr('rep.stokDonusumMerkezi')}</p>
            <span className="inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px] text-[10px] font-bold" style={{ background: '#D1FAE5', color: '#065F46' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />{tr('rep.canliIcerik')}
            </span>
          </div>
          <p className="text-[12px] text-slate-400 mt-[2px] truncate">{tr('rep.stokDonusumSub')}</p>
        </div>
        <ChevronRight size={18} className="text-slate-300 shrink-0" />
      </button>

      <ContentViewer
        open={!!viewer}
        baslik={viewer?.baslik ?? ''}
        src={viewer?.src ?? ''}
        onClose={() => setViewer(null)}
      />
    </div>
  )
}
