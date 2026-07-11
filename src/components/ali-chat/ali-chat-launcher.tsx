'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Ali Sohbet Launcher — CTA butonu + drawer state
//  Server component (page.tsx) içine gömülür; sağ ray "Ali ile sohbet et" butonu.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { AliChatDrawer } from './ali-chat-drawer'

const EMLAK_GRAD = 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)'

export function AliChatLauncher() {
  const [acik, setAcik] = useState(false)
  return (
    <>
      <button
        onClick={() => setAcik(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', marginTop: 16,
          background: EMLAK_GRAD, color: '#fff', border: 0,
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
          padding: 14, borderRadius: 14, cursor: 'pointer',
          boxShadow: '0 12px 24px -12px rgba(40,120,70,.6)',
        }}
      >
        Ali ile sohbet et
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ width: 16, height: 16, stroke: '#fff' }}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
      <AliChatDrawer acik={acik} onKapat={() => setAcik(false)} />
    </>
  )
}
