'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  recordId: string | null
  onClose: () => void
}

export function RaporModal({ recordId, onClose }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const [baslik, setBaslik] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!recordId) { setHtml(null); setError(null); return }
    setLoading(true)
    setError(null)
    fetch(`/api/raporlar/icerik/${recordId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setHtml(d.html)
        setBaslik(d.baslik)
      })
      .catch(() => setError('Rapor yüklenemedi'))
      .finally(() => setLoading(false))
  }, [recordId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (recordId) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [recordId, onClose])

  if (!recordId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-12 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
        {/* Başlık */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800 truncate pr-4">{baslik || 'Rapor'}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="w-5 h-5 rounded-full border-2 border-[#5B47E0] border-t-transparent animate-spin" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          {html && !loading && (
            <iframe
              srcDoc={html}
              className="w-full h-full min-h-[65vh] border-0 rounded-b-2xl"
              sandbox="allow-same-origin"
              title={baslik}
            />
          )}
        </div>
      </div>
    </div>
  )
}
