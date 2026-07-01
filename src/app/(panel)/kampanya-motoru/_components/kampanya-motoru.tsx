'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Target, Layers, TrendingUp, Wand2, AlertTriangle, Info, ChevronDown, ShieldAlert } from 'lucide-react'
import {
  Z, projeKampanyalari, projeMarjTabani, SIGNAL_ETIKET,
  type CampaignRec, type Signal,
} from '@/lib/kampanya'
import { adaptStok, PROJELER, type Proje, type StockGroup } from '@/lib/stok-adapter'
import { BABACAN_STOK } from '@/data/babacan-stok'
import { KampanyaKarti } from './kampanya-karti'

const SIGNALS: Signal[] = ['none', 'faiz_dusus', 'altin_yukselis', 'savas_kriz', 'piyasa_yukselis']
const GRUPLAR: StockGroup[] = ['A', 'B', 'C', 'D']

function KurulumAlani({ etiket, icon, children }: { etiket: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[13px] px-[12px] py-[9px]" style={{ background: 'rgba(255,255,255,.6)', border: `1px solid ${Z.line}` }}>
      <div className="flex items-center gap-[6px] mb-[3px]">
        <span style={{ color: Z.lavanta }}>{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{etiket}</span>
      </div>
      {children}
    </div>
  )
}

export function KampanyaMotoru() {
  // 507 gerçek daire → adapter (grup/defects/emsal) bir kez hesaplanır
  const adapted = useMemo(() => adaptStok(BABACAN_STOK), [])

  const [proje, setProje] = useState<Proje>('Central')
  const [signal, setSignal] = useState<Signal>('none')
  const [grupFiltre, setGrupFiltre] = useState<StockGroup | null>(null)
  const [marjEdit, setMarjEdit] = useState<string | null>(null)
  const [hedefGun, setHedefGun] = useState(90)
  const [onerildi, setOnerildi] = useState(false)
  const [approved, setApproved] = useState<Record<string, CampaignRec>>({})

  const autoMarj = useMemo(() => projeMarjTabani(adapted.filter(u => u.proje === proje)), [adapted, proje])
  const marjTabani = marjEdit ?? autoMarj

  const sonuc = useMemo(
    () => projeKampanyalari(proje, adapted, { signal, marjTabani, hedefGun, grupFiltre }),
    [proje, adapted, signal, marjTabani, hedefGun, grupFiltre],
  )

  function projeChange(p: Proje) {
    setProje(p)
    setMarjEdit(null)      // yeni projenin otomatik marjını göster
    setApproved({})        // segmentler değişir — onayları sıfırla
  }

  const toplamKart = sonuc.gruplar.reduce((s, g) => s + g.cards.length, 0)

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '24px 32px 48px' }}>
      {/* Başlık */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-[12px]">
          <div className="grid place-items-center rounded-[15px] text-white shrink-0"
            style={{ width: 44, height: 44, background: Z.lavGrad, boxShadow: '0 12px 22px -10px rgba(91,71,224,.5)' }}>
            <Wand2 size={21} />
          </div>
          <div>
            <h1 className="text-[21px] font-black leading-tight" style={{ color: Z.text }}>Kampanya Motoru</h1>
            <p className="text-[12px] text-slate-400">Babacan gerçek stoğu (507 daire) · adapter türetmeli segment kampanyaları</p>
          </div>
        </div>
        {/* Veri kalitesi notu — "Örnek veri" yerine (§6) */}
        <span className="rounded-full bg-amber-50 border border-amber-200 px-[11px] py-[5px] text-[11px] font-bold text-amber-700 flex items-center gap-[5px]">
          <AlertTriangle size={12} /> Örnek/doğrulanmamış veri — mutabakat gerekir
        </span>
      </div>

      {/* Hero mesaj */}
      <div className="mt-[16px] rounded-[22px] p-[18px] overflow-hidden relative"
        style={{ background: 'linear-gradient(120deg, rgba(237,233,254,.9), rgba(196,232,238,.5))', border: '1px solid rgba(255,255,255,.72)' }}>
        <p className="text-[15px] sm:text-[16px] font-black leading-snug" style={{ color: '#3a3475' }}>
          &ldquo;Ali indirim önermez. Ali, her daireyi doğru alıcı segmentiyle buluşturur.&rdquo;
        </p>
        <p className="mt-[6px] text-[12.5px] leading-[18px]" style={{ color: '#5b51a8' }}>
          Grup/defect/emsal ham stoktan <b>şeffaf kuralla</b> türetilir; her grup için kampanya önerilir. Fiyat kaldıracı
          asla otomatik seçilmez. Hakan&apos;ın segment/kanal etiketi referans sinyal olarak yan yana gösterilir.
        </p>
      </div>

      {/* Kurulum satırı */}
      <div className="mt-[18px] rounded-[22px] p-[16px]" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.72)' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[10px]">
          {/* Proje seçici */}
          <KurulumAlani etiket="Proje" icon={<Layers size={12} />}>
            <div className="relative">
              <select value={proje} onChange={e => projeChange(e.target.value as Proje)}
                className="w-full appearance-none bg-transparent text-[13px] font-bold pr-[18px] outline-none cursor-pointer" style={{ color: Z.text }}>
                {PROJELER.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-0 top-[3px] pointer-events-none" style={{ color: '#8b988f' }} />
            </div>
            <p className="text-[10.5px] text-slate-400 mt-[1px]">{sonuc.toplamSatilabilir} satılabilir daire</p>
          </KurulumAlani>

          {/* Marj tabanı (proje medyanından ön-dolu, elle düzenlenebilir) */}
          <KurulumAlani etiket="Marj Tabanı (floor)" icon={<Target size={12} />}>
            <input value={marjTabani} onChange={e => setMarjEdit(e.target.value)}
              className="w-full bg-transparent text-[13px] font-bold outline-none" style={{ color: Z.text }} />
            <p className="text-[10.5px] text-slate-400 mt-[1px]">Medyan USD/m²&apos;den · altına inilemez</p>
          </KurulumAlani>

          {/* Hedef (gün elle; daire grup bazında otomatik) */}
          <KurulumAlani etiket="Hedef Süre (gün)" icon={<Sparkles size={12} />}>
            <input type="number" value={hedefGun} min={1} onChange={e => setHedefGun(Math.max(1, +e.target.value || 1))}
              className="w-full bg-transparent text-[13px] font-bold outline-none" style={{ color: Z.text }} />
            <p className="text-[10.5px] text-slate-400 mt-[1px]">Daire hedefi grup başına otomatik</p>
          </KurulumAlani>

          {/* Piyasa sinyali */}
          <KurulumAlani etiket="Piyasa Sinyali" icon={<TrendingUp size={12} />}>
            <div className="relative">
              <select value={signal} onChange={e => setSignal(e.target.value as Signal)}
                className="w-full appearance-none bg-transparent text-[13px] font-bold pr-[18px] outline-none cursor-pointer" style={{ color: Z.text }}>
                {SIGNALS.map(s => <option key={s} value={s}>{SIGNAL_ETIKET[s]}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-0 top-[3px] pointer-events-none" style={{ color: '#8b988f' }} />
            </div>
          </KurulumAlani>
        </div>

        {/* Grup filtresi + doğrulanmamış rozet */}
        <div className="mt-[12px] flex items-center gap-[8px] flex-wrap">
          <span className="text-[11px] font-bold text-slate-400">Grup filtresi:</span>
          {([null, ...GRUPLAR] as (StockGroup | null)[]).map(g => {
            const on = grupFiltre === g
            return (
              <button key={g ?? 'hepsi'} onClick={() => setGrupFiltre(g)}
                className="rounded-full px-[11px] py-[4px] text-[11px] font-bold transition-all"
                style={on ? { background: Z.lavGrad, color: '#fff' } : { background: 'rgba(255,255,255,.6)', color: '#57655b', border: `1px solid ${Z.line}` }}>
                {g ?? 'Hepsi'}
              </button>
            )
          })}
          {sonuc.dogrulanmamis && (
            <span className="ml-auto rounded-full px-[10px] py-[4px] text-[11px] font-bold flex items-center gap-[5px]" style={{ background: Z.coralSoft, color: '#9a3b2a' }}>
              <ShieldAlert size={12} /> Doğrulanmamış stok — mutabakat bekliyor
            </span>
          )}
        </div>

        <button onClick={() => setOnerildi(true)}
          className="mt-[12px] w-full h-[44px] rounded-[14px] text-[14px] font-black text-white flex items-center justify-center gap-[8px] transition-shadow hover:shadow-md"
          style={{ background: Z.lavGrad, boxShadow: '0 12px 24px -12px rgba(91,71,224,.6)' }}>
          <Sparkles size={17} /> Ali&apos;ye önerttir
        </button>
      </div>

      {/* Sonuç — grup grup */}
      {onerildi && (
        <div className="mt-[20px] space-y-[24px]">
          <div className="flex items-center gap-[8px] text-[12px] text-slate-400">
            <Wand2 size={13} />
            <span><b style={{ color: Z.lavanta }}>{proje}</b> · {sonuc.gruplar.length} grup · {toplamKart} kampanya kartı · fiyat/indirim kaldıracı yok.</span>
          </div>

          {sonuc.gruplar.map(g => (
            <div key={g.grup}>
              {/* Grup başlığı */}
              <div className="flex items-center gap-[9px] mb-[10px]">
                <span className="grid place-items-center rounded-[10px] text-white text-[13px] font-black" style={{ width: 30, height: 30, background: Z.lavGrad }}>{g.grup}</span>
                <div>
                  <p className="text-[14px] font-black" style={{ color: Z.text }}>{g.grup} grubu · {g.daireSayisi} daire</p>
                  <p className="text-[11px] text-slate-400">Blok {g.bloklar.join('/')} · {g.toplamM2.toLocaleString('tr-TR')} m²</p>
                </div>
              </div>

              {/* İndirim-önerilmedi bandı (D danger / A info) */}
              {g.uyari && (
                <div className="rounded-[16px] p-[13px] mb-[12px] flex items-start gap-[9px]"
                  style={g.uyari.tone === 'danger'
                    ? { background: Z.coralSoft, border: `1px solid ${Z.coral}44` }
                    : { background: Z.lavSoft, border: `1px solid ${Z.lavanta}33` }}>
                  {g.uyari.tone === 'danger'
                    ? <AlertTriangle size={16} className="mt-[1px] shrink-0" style={{ color: Z.coral }} />
                    : <Info size={16} className="mt-[1px] shrink-0" style={{ color: Z.lavanta }} />}
                  <p className="text-[12.5px] leading-[18px] font-semibold" style={{ color: g.uyari.tone === 'danger' ? '#9a3b2a' : '#48417e' }}>{g.uyari.text}</p>
                </div>
              )}

              {g.cards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[16px] items-start">
                  {g.cards.map(card => {
                    const k = `${proje}:${g.grup}:${card.segment}`
                    const shown = approved[k] ?? card
                    return <KampanyaKarti key={k} card={shown} onApprove={a => setApproved(prev => ({ ...prev, [k]: a }))} />
                  })}
                </div>
              ) : (
                <div className="rounded-[16px] p-[14px] flex items-start gap-[9px]" style={{ background: Z.coralSoft, border: `1px solid ${Z.coral}44` }}>
                  <AlertTriangle size={16} className="mt-[1px] shrink-0" style={{ color: Z.coral }} />
                  <p className="text-[13px] leading-[19px] font-semibold" style={{ color: '#9a3b2a' }}>{g.noLeverUyari}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
