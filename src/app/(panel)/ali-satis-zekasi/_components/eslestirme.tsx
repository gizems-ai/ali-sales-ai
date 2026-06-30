'use client'

import { useState, useMemo } from 'react'
import { Users, Building2, ArrowLeftRight } from 'lucide-react'
import {
  Z, CUSTOMERS, UNITS, PERSONA_ETIKET, fmtFiyat,
  eslesmelerForCustomer, eslesmelerForUnit,
} from '@/lib/ali-zeka'
import { EslesmeKarti, EslesmeSatiri } from './eslesme-karti'

type Yon = 'musteriden' | 'stoktan'

export function Eslestirme() {
  const [yon, setYon] = useState<Yon>('musteriden')
  const [musteriId, setMusteriId] = useState(CUSTOMERS[0].id)
  const [unitId, setUnitId] = useState(UNITS[0].id)

  const musteriEslesmeler = useMemo(() => {
    const c = CUSTOMERS.find(x => x.id === musteriId)!
    return eslesmelerForCustomer(c, 5)
  }, [musteriId])

  const unitEslesmeler = useMemo(() => {
    const u = UNITS.find(x => x.id === unitId)!
    return eslesmelerForUnit(u, 6)
  }, [unitId])

  const secalanMusteri = CUSTOMERS.find(x => x.id === musteriId)!
  const secalanUnit = UNITS.find(x => x.id === unitId)!

  return (
    <div className="space-y-[16px]">
      {/* Yön seçici (segmented) */}
      <div className="rounded-[16px] p-[5px] inline-flex gap-[4px] w-full sm:w-auto"
        style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.72)' }}>
        {([
          { key: 'musteriden', label: 'Müşteriden stoğa', icon: Users },
          { key: 'stoktan', label: 'Stoktan müşteriye', icon: Building2 },
        ] as const).map(({ key, label, icon: Icon }) => {
          const on = yon === key
          return (
            <button key={key} onClick={() => setYon(key)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-[7px] h-[38px] px-[16px] rounded-[12px] text-[13px] font-bold transition-all"
              style={on
                ? { background: Z.lavGrad, color: '#fff', boxShadow: '0 8px 16px -10px rgba(91,71,224,.6)' }
                : { background: 'transparent', color: '#57655b' }}>
              <Icon size={15} /> {label}
            </button>
          )
        })}
      </div>

      {/* Seçici + sonuç */}
      {yon === 'musteriden' ? (
        <>
          <SecimSatiri
            label="Müşteri seç"
            icon={<Users size={15} style={{ color: Z.lavanta }} />}
            value={musteriId}
            onChange={setMusteriId}
            options={CUSTOMERS.map(c => ({ value: c.id, label: `${c.ad} — ${PERSONA_ETIKET[c.persona]}` }))}
            ozet={`${PERSONA_ETIKET[secalanMusteri.persona]} · Bütçe ${fmtFiyat(secalanMusteri.butce)} · ${secalanMusteri.ozet}`}
          />
          <div className="flex items-center gap-[8px] text-[12px] text-slate-400">
            <ArrowLeftRight size={13} />
            <span>Ali, <b style={{ color: Z.lavanta }}>{secalanMusteri.ad}</b> için en uygun {musteriEslesmeler.length} birimi sıraladı.</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
            {musteriEslesmeler.map(m => <EslesmeKarti key={m.unitId} match={m} />)}
          </div>
        </>
      ) : (
        <>
          <SecimSatiri
            label="Birim seç"
            icon={<Building2 size={15} style={{ color: Z.green2 }} />}
            value={unitId}
            onChange={setUnitId}
            options={UNITS.map(u => ({ value: u.id, label: `${u.daire} — ${u.tip} · ${fmtFiyat(u.fiyat)}${u.yaslanmaGunu >= 40 ? ' · yaşlanan' : ''}` }))}
            ozet={`${secalanUnit.tip} · ${secalanUnit.metrekare} m² · ${secalanUnit.teslimAy === 0 ? 'Hazır teslim' : `Teslim ${secalanUnit.teslimAy} ay`} · ${secalanUnit.yaslanmaGunu} gündür stokta`}
            accent={Z.green2}
          />
          <div className="flex items-center gap-[8px] text-[12px] text-slate-400">
            <ArrowLeftRight size={13} />
            <span><b style={{ color: Z.green2 }}>{secalanUnit.daire}</b> için en uygun müşteri havuzu — yaşlanan stoğu doğru kitleye taşı.</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[10px]">
            {unitEslesmeler.map(m => <EslesmeSatiri key={m.customerId} match={m} />)}
          </div>
        </>
      )}
    </div>
  )
}

function SecimSatiri({
  label, icon, value, onChange, options, ozet, accent = Z.lavanta,
}: {
  label: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  ozet: string
  accent?: string
}) {
  return (
    <div className="rounded-[18px] border bg-white p-[14px] shadow-sm" style={{ borderColor: Z.line }}>
      <label className="flex items-center gap-[7px] text-[11px] font-black uppercase tracking-wide mb-[8px]" style={{ color: accent }}>
        {icon} {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-[42px] rounded-[12px] border px-[12px] text-[13px] font-semibold bg-white outline-none"
        style={{ borderColor: Z.line, color: Z.text }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <p className="mt-[9px] text-[12px] leading-[18px] text-slate-500">{ozet}</p>
    </div>
  )
}
