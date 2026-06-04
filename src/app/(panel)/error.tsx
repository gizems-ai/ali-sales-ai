'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[PanelError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div className="h-16 w-16 rounded-full bg-red-50 grid place-items-center">
        <AlertTriangle size={30} className="text-red-500" />
      </div>
      <div>
        <p className="text-base font-black text-slate-700">Sayfa yüklenemedi</p>
        <p className="mt-1 text-sm text-slate-500">
          Geçici bir sorun oluştu. Tekrar deneyin veya sayfayı yenileyin.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-400 font-mono">{error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
        style={{ backgroundColor: '#5B38E8' }}
      >
        <RefreshCw size={14} />
        Tekrar dene
      </button>
    </div>
  )
}
