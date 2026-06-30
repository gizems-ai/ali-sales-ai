'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { G } from '@/lib/gelisim'

export type ViewerSrc = { src: string; baslik: string } | null

/**
 * ContentViewer — tek, yeniden kullanılabilir deck görüntüleyici.
 * Hazır HTML deck'ler YENİDEN YAZILMAZ; iframe içinde kendi stiliyle açılır.
 * Bölüm chrome'u (başlık şeridi) emlak.ai tokenlarıyla; viewer deck'i olduğu gibi gösterir.
 */
export function ContentViewer({
  open,
  baslik,
  src,
  onClose,
}: {
  open: boolean
  baslik: string
  src: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={baslik}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(20,28,24,.58)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: 'clamp(8px, 2vw, 26px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          margin: 'auto',
          width: 'min(1300px, 100%)',
          height: '100%',
          maxHeight: 'calc(100vh - 2 * clamp(8px,2vw,26px))',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: '0 40px 120px -30px rgba(20,40,25,.6)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        {/* Başlık şeridi — emlak.ai chrome */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '13px 18px',
            background: G.lavGrad,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-space-mono), monospace',
              background: 'rgba(255,255,255,.22)',
              padding: '4px 9px',
              borderRadius: 999,
            }}
          >
            ● Canlı içerik
          </span>
          <span
            style={{
              fontFamily: 'var(--font-sora), system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {baslik}
          </span>
          <button
            onClick={onClose}
            aria-label="Kapat"
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: 11,
              border: 0,
              cursor: 'pointer',
              background: 'rgba(255,255,255,.2)',
              color: '#fff',
              fontSize: 18,
              lineHeight: 1,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Deck — kendi stilini koruyan iframe */}
        <iframe
          src={src}
          title={baslik}
          style={{ flex: 1, width: '100%', border: 0, background: '#fff' }}
        />
      </div>
    </div>,
    document.body,
  )
}
