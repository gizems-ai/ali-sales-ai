'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, AlertTriangle, Megaphone, Users, Building2, Sparkles } from 'lucide-react'
import {
  Z, UNITS, fmtFiyat, unitById, customerById,
  eslesmelerForUnit,
  type Unit, type Tag,
} from '@/lib/ali-zeka'

function TagPill({ tag }: { tag: Tag }) {
  const caution = tag.tone === 'caution'
  return (
    <span className="inline-flex items-center rounded-full px-[9px] py-[3px] text-[11px] font-semibold"
      style={caution
        ? { background: Z.coralSoft, color: '#9a3b2a' }
        : { background: Z.lavSoft, color: '#5b51a8' }}>
      {tag.label}
    </span>
  )
}

function UnitKart({ unit, onClick }: { unit: Unit; onClick: () => void }) {
  const yaslanan = unit.yaslanmaGunu >= 40
  return (
    <button onClick={onClick}
      className="text-left rounded-[22px] border bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderColor: yaslanan ? Z.coral : Z.line }}>
      <div className="h-[5px]" style={{ background: yaslanan ? Z.coral : Z.lavGrad }} />
      <div className="p-[15px]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[15px] font-black" style={{ color: Z.text }}>{unit.daire} · {unit.tip}</p>
            <p className="text-[11px] text-slate-400 mt-[1px]">Blok {unit.blok} · {unit.kat}. kat · {unit.metrekare} m²</p>
          </div>
          <p className="text-[13px] font-black" style={{ color: Z.green2 }}>{fmtFiyat(unit.fiyat)}</p>
        </div>
        <div className="mt-[11px] flex flex-wrap gap-[6px]">
          {unit.etiketler.map(t => <TagPill key={t.label} tag={t} />)}
        </div>
        <div className="mt-[12px] flex items-center justify-between pt-[10px]" style={{ borderTop: `1px solid ${Z.line}` }}>
          <span className="text-[11px]" style={{ color: yaslanan ? Z.coral : '#8b988f' }}>
            {yaslanan && <AlertTriangle size={11} className="inline mr-[3px] mb-[2px]" />}
            {unit.yaslanmaGunu} gündür stokta
          </span>
          <span className="text-[11px] font-bold" style={{ color: Z.lavanta }}>Ali paneli →</span>
        </div>
      </div>
    </button>
  )
}

function Blok({ baslik, icon, children, accent = Z.green1 }: {
  baslik: string; icon: React.ReactNode; children: React.ReactNode; accent?: string
}) {
  return (
    <div>
      <div className="flex items-center gap-[7px] mb-[8px]">
        <span style={{ color: accent }}>{icon}</span>
        <p className="text-[12px] font-black uppercase tracking-wide" style={{ color: accent }}>{baslik}</p>
      </div>
      {children}
    </div>
  )
}

function DetayPanel({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  // En uygun 3 müşteri + alternatif daireler (bu birime yakın diğer birimler)
  const enUygunMusteriler = eslesmelerForUnit(unit, 3)
  const altDaireler = UNITS
    .filter(u => u.id !== unit.id && u.tip === unit.tip)
    .map(u => ({ u, fark: Math.abs(u.fiyat - unit.fiyat) }))
    .sort((a, b) => a.fark - b.fark)
    .slice(0, 3)
    .map(x => x.u)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,30,25,.38)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()}
        className="h-full w-full max-w-[520px] bg-white overflow-y-auto"
        style={{ boxShadow: '-20px 0 60px -20px rgba(20,40,25,.4)' }}>
        {/* Başlık */}
        <div className="sticky top-0 z-10 bg-white px-[20px] py-[16px] flex items-start justify-between" style={{ borderBottom: `1px solid ${Z.line}` }}>
          <div className="flex items-center gap-[11px]">
            <span className="grid place-items-center rounded-[13px] text-white" style={{ width: 42, height: 42, background: Z.lavGrad }}>
              <Sparkles size={19} />
            </span>
            <div>
              <p className="text-[17px] font-black" style={{ color: Z.text }}>{unit.daire} · {unit.tip}</p>
              <p className="text-[12px] text-slate-400">{fmtFiyat(unit.fiyat)} · Aidat {unit.aidat.toLocaleString('tr-TR')} ₺ · {unit.teslimAy === 0 ? 'Hazır teslim' : `Teslim ${unit.teslimAy} ay`}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="px-[20px] py-[18px] space-y-[20px]">
          {/* Etiketler */}
          <div className="flex flex-wrap gap-[6px]">
            {unit.etiketler.map(t => <TagPill key={t.label} tag={t} />)}
          </div>

          {/* Kimler için uygun */}
          <Blok baslik="Kimler için uygun?" icon={<Users size={14} />} accent={Z.lavanta}>
            <ul className="space-y-[5px]">
              {unit.kimlerIcin.map((k, i) => (
                <li key={i} className="flex items-start gap-[7px] text-[13px] leading-[19px]" style={{ color: '#33433a' }}>
                  <span className="mt-[1px] font-black" style={{ color: Z.lavanta }}>•</span>{k}
                </li>
              ))}
            </ul>
          </Blok>

          {/* En güçlü argümanlar */}
          <Blok baslik="En güçlü satış argümanları" icon={<Sparkles size={14} />} accent={Z.green1}>
            <ul className="space-y-[5px]">
              {unit.gucluArgumanlar.map((a, i) => (
                <li key={i} className="flex items-start gap-[7px] text-[13px] leading-[19px]" style={{ color: '#33433a' }}>
                  <span className="mt-[1px] font-black" style={{ color: Z.green2 }}>✓</span>{a}
                </li>
              ))}
            </ul>
          </Blok>

          {/* İtirazlar + yanıt */}
          <Blok baslik="En büyük itirazlar + hazır yanıt" icon={<AlertTriangle size={14} />} accent="#9a3b2a">
            <div className="space-y-[8px]">
              {unit.itirazlar.map((it, i) => (
                <div key={i} className="rounded-[12px] px-[12px] py-[10px]" style={{ background: Z.coralSoft }}>
                  <p className="text-[12.5px] font-bold" style={{ color: '#9a3b2a' }}>&ldquo;{it.itiraz}&rdquo;</p>
                  <p className="mt-[4px] text-[12.5px] leading-[18px]" style={{ color: '#5a4a44' }}>→ {it.yanit}</p>
                </div>
              ))}
            </div>
          </Blok>

          {/* Rakip projeler */}
          <Blok baslik="Rakip projeler" icon={<Building2 size={14} />} accent="#475a4e">
            <div className="flex flex-wrap gap-[6px]">
              {unit.rakipler.map(r => (
                <span key={r} className="rounded-full px-[10px] py-[4px] text-[12px] font-semibold" style={{ background: Z.surface, color: '#475a4e' }}>{r}</span>
              ))}
            </div>
          </Blok>

          {/* Alternatif daireler */}
          <Blok baslik="Alternatif daireler" icon={<ArrowIcon />} accent={Z.green1}>
            <div className="space-y-[6px]">
              {altDaireler.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-[12px] border px-[12px] py-[9px]" style={{ borderColor: Z.line }}>
                  <div>
                    <p className="text-[13px] font-black" style={{ color: Z.text }}>{a.daire} · {a.tip}</p>
                    <p className="text-[11px] text-slate-400">{a.metrekare} m² · {a.cephe} · {a.manzara === 'deniz' ? 'Deniz' : a.manzara === 'sehir' ? 'Şehir' : 'Site'}</p>
                  </div>
                  <p className="text-[12px] font-black" style={{ color: Z.green2 }}>{fmtFiyat(a.fiyat)}</p>
                </div>
              ))}
            </div>
          </Blok>

          {/* En uygun müşteriler */}
          <Blok baslik="Bu birim için en uygun müşteriler" icon={<Users size={14} />} accent={Z.lavanta}>
            <div className="space-y-[6px]">
              {enUygunMusteriler.map(m => {
                const c = customerById(m.customerId)!
                return (
                  <div key={m.customerId} className="flex items-center gap-[10px] rounded-[12px] border px-[12px] py-[8px]" style={{ borderColor: Z.line }}>
                    <span className="grid place-items-center rounded-[10px] text-white text-[12px] font-black shrink-0" style={{ width: 38, height: 38, background: Z.lavGrad }}>%{m.skor}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold truncate" style={{ color: Z.text }}>{c.ad}</p>
                      <p className="text-[11px] text-slate-400 truncate">{m.nedenler[0]}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Blok>

          {/* Satılması neden zor */}
          {unit.nedenZor && (
            <div className="rounded-[14px] p-[14px]" style={{ background: Z.coralSoft, border: `1px solid ${Z.coral}33` }}>
              <div className="flex items-center gap-[7px] mb-[6px]">
                <AlertTriangle size={14} style={{ color: Z.coral }} />
                <p className="text-[12px] font-black uppercase tracking-wide" style={{ color: '#9a3b2a' }}>Satılması neden zor?</p>
              </div>
              <p className="text-[13px] leading-[19px]" style={{ color: '#5a4a44' }}>{unit.nedenZor}</p>
            </div>
          )}

          {/* Kampanya önerisi (Ali) */}
          {unit.kampanya && (
            <div className="rounded-[14px] p-[14px]" style={{ borderLeft: `3px solid ${Z.lavanta}`, background: Z.lavSoft }}>
              <div className="flex items-center gap-[8px] mb-[6px]">
                <span className="grid place-items-center rounded-full" style={{ width: 26, height: 26, background: Z.lavGrad, padding: 2 }}>
                  <Image src="/ali-avatar.png" alt="Ali" width={22} height={22} className="rounded-full object-cover" />
                </span>
                <p className="text-[12px] font-black" style={{ color: Z.lavanta }}>
                  <Megaphone size={13} className="inline mr-[3px] mb-[2px]" />Ali&apos;nin kampanya önerisi
                </p>
              </div>
              <p className="text-[13px] leading-[19px]" style={{ color: '#48417e' }}>{unit.kampanya}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ArrowIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10M7 17 17 7" /></svg>
}

export function StokZekasi() {
  const [secili, setSecili] = useState<string | null>(null)
  const unit = secili ? unitById(secili) : null

  const yaslananSayi = UNITS.filter(u => u.yaslanmaGunu >= 40).length

  return (
    <div className="space-y-[14px]">
      <div className="flex items-center gap-[8px] text-[12px] text-slate-400">
        <Building2 size={13} />
        <span>{UNITS.length} bağımsız bölüm · <b style={{ color: Z.coral }}>{yaslananSayi}</b> yaşlanan stok. Karaktere göre etiketlendi — birime tıkla, Ali panelini aç.</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[14px]">
        {UNITS.map(u => <UnitKart key={u.id} unit={u} onClick={() => setSecili(u.id)} />)}
      </div>
      {unit && <DetayPanel unit={unit} onClose={() => setSecili(null)} />}
    </div>
  )
}
