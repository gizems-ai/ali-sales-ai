'use client'

import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { useT } from '@/lib/i18n/context'
import type { AirtableRecord, FirmaListeItem } from '@/lib/airtable'

interface Hit {
  id: string
  firma: string
  temsilci?: string
}

export function SearchBar() {
  const { airtable: { sistemAdi } } = useTenant()
  const router = useRouter()
  const t = useT()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce + fetch
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = q.trim()
    if (!trimmed) {
      setHits([])
      setOpen(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/musteriler/list?q=${encodeURIComponent(trimmed)}`)
        if (!res.ok) return
        const data: { records: AirtableRecord<FirmaListeItem>[] } = await res.json()
        const mapped = (data.records ?? []).slice(0, 8).map(r => ({
          id: r.id,
          firma: r.fields['Firma Adı'] ?? '—',
          temsilci: r.fields['Atanan Temsilci'],
        }))
        setHits(mapped)
        setOpen(true)
      } catch {
        // sessiz — bağlantı hatası
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [q])

  // Dışarı tıklama ile kapat
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function go(id: string) {
    setOpen(false)
    setQ('')
    router.push(`/musteriler?modal=${id}`)
  }

  return (
    <div ref={containerRef} className="hidden md:block relative w-64">
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 border border-gray-100 bg-gray-50 focus-within:bg-white focus-within:border-violet-200 transition-colors">
        <Search
          size={14}
          className={`shrink-0 transition-colors ${loading ? 'text-violet-400' : 'text-gray-400'}`}
        />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => { if (hits.length > 0) setOpen(true) }}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setQ('') }
            if (e.key === 'Enter' && hits.length === 1) go(hits[0].id)
          }}
          placeholder={t('search.placeholder')}
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden z-50">
          {hits.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-3 text-center">{t('search.noResults')}</p>
          ) : (
            hits.map(h => (
              <button
                key={h.id}
                onMouseDown={e => { e.preventDefault(); go(h.id) }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-violet-50 text-left transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{h.firma}</p>
                  {h.temsilci && (!sistemAdi || h.temsilci !== sistemAdi) && (
                    <p className="text-xs text-gray-400 truncate">{h.temsilci}</p>
                  )}
                </div>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ background: '#F2EEFF', color: '#5B38E8' }}
                >
                  {t('search.customerBadge')}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
