'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Ali Sohbet Drawer — sağdan açılan panel (glass · 22px radius · lavanta kimlik)
//  AliChat'i barındırır. Esc + backdrop tıklama ile kapanır.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { Z } from '@/lib/ali-zeka'
import { AliChat } from './ali-chat'

export function AliChatDrawer({ acik, onKapat }: { acik: boolean; onKapat: () => void }) {
  // Esc ile kapat + açıkken arka plan kaymasını kilitle
  useEffect(() => {
    if (!acik) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onKapat() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [acik, onKapat])

  return (
    <div
      aria-hidden={!acik}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        pointerEvents: acik ? 'auto' : 'none',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onKapat}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(20,24,40,.38)', backdropFilter: 'blur(4px)',
          opacity: acik ? 1 : 0, transition: 'opacity .28s ease',
        }}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ali ile sohbet"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 'min(420px, 100%)',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(18px)',
          borderLeft: '1px solid rgba(255,255,255,.7)',
          borderTopLeftRadius: 22, borderBottomLeftRadius: 22,
          boxShadow: '-24px 0 60px -30px rgba(40,40,90,.5)',
          transform: acik ? 'translateX(0)' : 'translateX(102%)',
          transition: 'transform .32s cubic-bezier(.4,.9,.3,1)',
        }}
      >
        {/* Başlık */}
        <header className="flex items-center gap-[11px] px-[18px] py-[14px]" style={{ borderBottom: `1px solid ${Z.line}` }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: Z.lavGrad, padding: 2.5 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
              <Image src="/ali-avatar.png" alt="Ali" width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-black leading-none" style={{ color: Z.text }}>Ali</p>
            <span className="inline-flex items-center gap-[5px] text-[11px] font-semibold text-slate-500 mt-[3px]">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4fdc7a', display: 'block' }} />
              Satış koçun · çevrimiçi
            </span>
          </div>
          <button onClick={onKapat} className="text-slate-400 hover:text-slate-600" aria-label="Kapat"><X size={19} /></button>
        </header>

        {/* Sohbet */}
        <div className="flex-1 min-h-0">
          <AliChat variant="drawer" />
        </div>
      </aside>
    </div>
  )
}
