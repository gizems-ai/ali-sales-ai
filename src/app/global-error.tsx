'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="tr">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#F8F9FC' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '20px',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              height: 64,
              width: 64,
              borderRadius: '50%',
              background: '#FFF0F3',
              display: 'grid',
              placeItems: 'center',
              fontSize: 28,
            }}
          >
            ⚠️
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#071B3A', margin: 0 }}>
              Uygulama başlatılamadı
            </p>
            <p style={{ marginTop: 6, fontSize: 14, color: '#64748b' }}>
              Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
            </p>
            {error.digest && (
              <p style={{ marginTop: 8, fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
                {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            style={{
              background: '#5B38E8',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  )
}
