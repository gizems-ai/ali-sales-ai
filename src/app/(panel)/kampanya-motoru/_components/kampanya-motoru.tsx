'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Target, Layers, TrendingUp, Wand2, AlertTriangle, Info, ChevronDown } from 'lucide-react'
import {
  Z, SENARYOLAR, senaryoByKey, kampanyaOner, SIGNAL_ETIKET,
  type CampaignRec,
} from '@/lib/kampanya'
import { KampanyaKarti } from './kampanya-karti'

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
  const [secili, setSecili] = useState<'c' | 'd' | 'a'>('c')
  const [onerildi, setOnerildi] = useState(false)
  // Onaylanan kartlar: `${senaryo}:${segment}` → üretilmiş (stub) kart
  const [approved, setApproved] = useState<Record<string, CampaignRec>>({})

  const senaryo = senaryoByKey(secili)!
  const sonuc = useMemo(() => kampanyaOner(senaryo.input), [senaryo])
  const { input } = senaryo

  function scenarioChange(key: 'c' | 'd' | 'a') {
    setSecili(key)
    setApproved({})          // segmentler değişir — onayları sıfırla
  }

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
            <p className="text-[12px] text-slate-400">Stok Zekâsı etiketlerinden segment bazlı kampanya önerisi</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-50 border border-amber-200 px-[11px] py-[5px] text-[11px] font-bold text-amber-700">
          Örnek veri
        </span>
      </div>

      {/* Hero mesaj */}
      <div className="mt-[16px] rounded-[22px] p-[18px] overflow-hidden relative"
        style={{ background: 'linear-gradient(120deg, rgba(237,233,254,.9), rgba(196,232,238,.5))', border: '1px solid rgba(255,255,255,.72)' }}>
        <p className="text-[15px] sm:text-[16px] font-black leading-snug" style={{ color: '#3a3475' }}>
          &ldquo;Ali indirim önermez. Ali, her daireyi doğru alıcı segmentiyle buluşturur.&rdquo;
        </p>
        <p className="mt-[6px] text-[12.5px] leading-[18px]" style={{ color: '#5b51a8' }}>
          Proje + marj tabanı + hedef + piyasa sinyaline göre her segment için kampanya önerir, gerekçesini gösterir.
          Fiyat kaldıracı asla otomatik seçilmez. Ali önerir — sen onaylarsın.
        </p>
      </div>

      {/* Kurulum satırı */}
      <div className="mt-[18px] rounded-[22px] p-[16px]" style={{ background: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.72)' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[10px]">
          {/* Proje / Stok seçici */}
          <KurulumAlani etiket="Proje / Stok" icon={<Layers size={12} />}>
            <div className="relative">
              <select value={secili} onChange={e => scenarioChange(e.target.value as 'c' | 'd' | 'a')}
                className="w-full appearance-none bg-transparent text-[13px] font-bold pr-[18px] outline-none cursor-pointer" style={{ color: Z.text }}>
                {SENARYOLAR.map(s => <option key={s.key} value={s.key}>{s.baslik}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-0 top-[3px] pointer-events-none" style={{ color: '#8b988f' }} />
            </div>
            <p className="text-[10.5px] text-slate-400 mt-[1px] truncate">{senaryo.altBaslik}</p>
          </KurulumAlani>

          {/* Marj tabanı */}
          <KurulumAlani etiket="Marj Tabanı (floor)" icon={<Target size={12} />}>
            <p className="text-[13px] font-bold" style={{ color: Z.text }}>{input.marjTabani}</p>
            <p className="text-[10.5px] text-slate-400 mt-[1px]">Altına inilemez</p>
          </KurulumAlani>

          {/* Hedef */}
          <KurulumAlani etiket="Hedef" icon={<Sparkles size={12} />}>
            <p className="text-[13px] font-bold" style={{ color: Z.text }}>{input.hedefDaire} daire / {input.hedefGun} gün</p>
            <p className="text-[10.5px] text-slate-400 mt-[1px]">{input.stock.grup} grubu · {input.stock.stokYasiGun} gün stokta</p>
          </KurulumAlani>

          {/* Piyasa sinyali */}
          <KurulumAlani etiket="Piyasa Sinyali" icon={<TrendingUp size={12} />}>
            <span className="inline-block rounded-full px-[9px] py-[3px] text-[11.5px] font-bold" style={{ background: Z.lavSoft, color: '#5b51a8' }}>
              {SIGNAL_ETIKET[input.signal]}
            </span>
          </KurulumAlani>
        </div>

        <button onClick={() => setOnerildi(true)}
          className="mt-[12px] w-full h-[44px] rounded-[14px] text-[14px] font-black text-white flex items-center justify-center gap-[8px] transition-shadow hover:shadow-md"
          style={{ background: Z.lavGrad, boxShadow: '0 12px 24px -12px rgba(91,71,224,.6)' }}>
          <Sparkles size={17} /> Ali&apos;ye önerttir
        </button>
      </div>

      {/* Sonuç */}
      {onerildi && (
        <div className="mt-[20px]">
          {/* Senaryo uyarı bandı (indirim-önerilmedi açıklaması) */}
          {senaryo.uyari && (
            <div className="rounded-[16px] p-[14px] mb-[16px] flex items-start gap-[9px]"
              style={senaryo.uyari.tone === 'danger'
                ? { background: Z.coralSoft, border: `1px solid ${Z.coral}44` }
                : { background: Z.lavSoft, border: `1px solid ${Z.lavanta}33` }}>
              {senaryo.uyari.tone === 'danger'
                ? <AlertTriangle size={16} className="mt-[1px] shrink-0" style={{ color: Z.coral }} />
                : <Info size={16} className="mt-[1px] shrink-0" style={{ color: Z.lavanta }} />}
              <p className="text-[12.5px] leading-[18px] font-semibold" style={{ color: senaryo.uyari.tone === 'danger' ? '#9a3b2a' : '#48417e' }}>
                {senaryo.uyari.text}
              </p>
            </div>
          )}

          {sonuc.cards.length > 0 ? (
            <>
              <div className="flex items-center gap-[8px] text-[12px] text-slate-400 mb-[12px]">
                <Wand2 size={13} />
                <span><b style={{ color: Z.lavanta }}>{sonuc.cards.length}</b> segment için kampanya önerildi · fiyat/indirim kaldıracı yok · her kart gerekçeli.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[16px] items-start">
                {sonuc.cards.map(card => {
                  const k = `${secili}:${card.segment}`
                  const shown = approved[k] ?? card
                  return (
                    <KampanyaKarti key={k} card={shown}
                      onApprove={a => setApproved(prev => ({ ...prev, [k]: a }))} />
                  )
                })}
              </div>
            </>
          ) : (
            /* Kural seti hiç kaldıraç üretemedi — insan kararı gerekir (§5) */
            <div className="rounded-[16px] p-[16px] flex items-start gap-[9px]" style={{ background: Z.coralSoft, border: `1px solid ${Z.coral}44` }}>
              <AlertTriangle size={16} className="mt-[1px] shrink-0" style={{ color: Z.coral }} />
              <p className="text-[13px] leading-[19px] font-semibold" style={{ color: '#9a3b2a' }}>{sonuc.noLeverUyari}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
