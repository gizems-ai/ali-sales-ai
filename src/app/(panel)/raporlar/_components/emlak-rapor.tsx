'use client'

import { TEMSILCI_SKORU, LEAD_YASLANMA, BUGUNUN_HAMLELERI, STOK_LISTESI } from '@/lib/emlak-fixtures'
import { TrendingUp, Home, Users, Phone, BarChart3 } from 'lucide-react'
import Image from 'next/image'

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
          <p style={{ fontSize: 12, fontWeight: 800, color: E.green2, marginBottom: 5 }}>Ali — Dönemsel Rapor</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#57655b', lineHeight: 1.6 }}>
            Bu ay referans kanalı en yüksek dönüşüm oranını (%67) gösterdi — mevcut müşterilerden aktif referans talep etmeye odaklanın. Instagram leadi artıyor ama dönüşüm düşük; takip sürecini hızlandırmanızı öneririm.
          </p>
        </div>
      </div>

      {/* Örnek veri banner */}
      <div className="flex items-center gap-[10px] rounded-[14px] border border-amber-200 bg-amber-50 px-[16px] py-[10px]">
        <span className="text-[12px] font-bold text-amber-700">Emlak Demo — Örnek veri</span>
        <span className="text-[12px] text-amber-600 flex-1">Gerçek veriler Airtable entegrasyonu sonrası aktif olacak.</span>
      </div>

      {/* Tahmini Ciro / Komisyon / Döngü KPI'ları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-[12px]">
        {[
          { icon: TrendingUp, label: 'Tahmini Ciro',       value: fmtPara(toplamCiro + 4_500_000 * 0.3 * 5), sub: 'Pipeline dahil tahmin' },
          { icon: Home,       label: 'Gerçekleşen Ciro',   value: fmtPara(toplamCiro),                        sub: `${toplamSatis} satış kapandı` },
          { icon: BarChart3,  label: 'Tahmini Komisyon',   value: fmtPara(toplamKomisyon),                    sub: `%${(komisyonOrani * 100).toFixed(1)} oran` },
          { icon: Users,      label: 'Pipeline Lead',      value: BUGUNUN_HAMLELERI.length.toString(),        sub: 'Aktif müşteri' },
          { icon: Phone,      label: 'Ortalama Döngü',     value: `${ortalamaDonum} hafta`,                   sub: 'İlk temas → teklif' },
          { icon: Home,       label: 'Stok Devri',         value: `${STOK_LISTESI.filter(s => s.durum === 'Müsait').length} müsait`, sub: 'Aktif portföy' },
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
        <h3 className="text-[16px] font-black mb-[16px]" style={{ color: E.text }}>Lead Kaynak Performansı</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide"
                style={{ borderBottom: `1px solid ${E.line}`, background: E.surface }}>
                <th className="px-[16px] py-[8px]">Kaynak</th>
                <th className="px-[12px] py-[8px] text-right">Lead</th>
                <th className="px-[12px] py-[8px]">Dönüşüm %</th>
                <th className="px-[16px] py-[8px]">Performans</th>
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
                      {donusum >= 50 ? 'İyi' : donusum >= 25 ? 'Orta' : donusum === 0 ? 'Pasif' : 'Düşük'}
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
        <h3 className="text-[16px] font-black mb-[16px]" style={{ color: E.text }}>Komisyon Paylaşımı</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <div>
            <p className="text-[12px] text-slate-400 mb-[10px]">Dağılım Özeti</p>
            <div className="space-y-[10px]">
              <div className="flex items-center justify-between py-[8px] border-b" style={{ borderColor: E.line }}>
                <span className="text-[13px] font-bold" style={{ color: E.text }}>Toplam Komisyon</span>
                <span className="text-[15px] font-black" style={{ color: E.green2 }}>{fmtPara(toplamKomisyon)}</span>
              </div>
              <div className="flex items-center justify-between py-[8px] border-b" style={{ borderColor: E.line }}>
                <span className="text-[13px] text-slate-500">Ofis Payı (%50)</span>
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
            <p className="text-[12px] text-slate-400 mb-[10px]">Lead Yaşlanma (Genel)</p>
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

    </div>
  )
}
