'use client'

import { useState } from 'react'
import { Sparkles, Layers, Building2, Shield } from 'lucide-react'
import { Z, SECTION_NAME, PROJE_ADI, PROJE_KONUM } from '@/lib/ali-zeka'
import { Eslestirme } from './eslestirme'
import { StokZekasi } from './stok-zekasi'
import { Yonetici } from './yonetici'

type Tab = 'eslestirme' | 'stok' | 'yonetici'

export function ZekaTabs({ isKurumsal }: { isKurumsal: boolean }) {
  const [tab, setTab] = useState<Tab>('eslestirme')

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'eslestirme', label: 'Eşleştirme', icon: Layers },
    { key: 'stok', label: 'Stok Zekâsı', icon: Building2 },
    ...(isKurumsal ? [{ key: 'yonetici' as Tab, label: 'Yönetici Görünümü', icon: Shield }] : []),
  ]

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '24px 32px 48px' }}>
      {/* Başlık */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-[12px]">
          <div className="grid place-items-center rounded-[15px] text-white shrink-0"
            style={{ width: 44, height: 44, background: Z.lavGrad, boxShadow: '0 12px 22px -10px rgba(91,71,224,.5)' }}>
            <Sparkles size={21} />
          </div>
          <div>
            <h1 className="text-[21px] font-black leading-tight" style={{ color: Z.text }}>{SECTION_NAME}</h1>
            <p className="text-[12px] text-slate-400">{PROJE_ADI} · {PROJE_KONUM}</p>
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
          &ldquo;Ali stok yönetmez. Ali, doğru müşteriyle doğru gayrimenkulü buluşturur.&rdquo;
        </p>
        <p className="mt-[6px] text-[12.5px] leading-[18px]" style={{ color: '#5b51a8' }}>
          Her müşteri için en doğru ürünü, en doğru sırayla, en doğru argümanlarla önerir; stoku karaktere göre etiketler.
          Ali önerir — sen onaylarsın.
        </p>
      </div>

      {/* Sekmeler */}
      <div className="mt-[18px] flex gap-[6px] overflow-x-auto pb-[2px]">
        {tabs.map(({ key, label, icon: Icon }) => {
          const on = tab === key
          return (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-[7px] h-[40px] px-[16px] rounded-[13px] text-[13px] font-bold whitespace-nowrap transition-all shrink-0"
              style={on
                ? { background: '#fff', color: Z.lavanta, boxShadow: '0 8px 18px -10px rgba(40,60,45,.3)', border: '1px solid rgba(255,255,255,.9)' }
                : { background: 'rgba(255,255,255,.45)', color: '#57655b', border: '1px solid transparent' }}>
              <Icon size={15} style={on ? { color: Z.lavanta } : {}} /> {label}
            </button>
          )
        })}
      </div>

      {/* İçerik */}
      <div className="mt-[18px]">
        {tab === 'eslestirme' && <Eslestirme />}
        {tab === 'stok' && <StokZekasi />}
        {tab === 'yonetici' && isKurumsal && <Yonetici />}
      </div>
    </div>
  )
}
