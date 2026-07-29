'use client'

import { useState } from 'react'
import { type AirtableRecord, type FirmaKart } from '@/lib/airtable'
import { KanbanCard } from './kanban-card'
import { useT } from '@/lib/i18n/context'

interface Props {
  initialRecords: AirtableRecord<FirmaKart>[]
  initialOffset: string | undefined
  asama: string
}

export function KanbanColumnClient({ initialRecords, initialOffset, asama }: Props) {
  const t = useT()
  const [records, setRecords] = useState(initialRecords)
  const [offset, setOffset] = useState(initialOffset)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    if (!offset || loading) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/kanban/more?asama=${encodeURIComponent(asama)}&offset=${encodeURIComponent(offset)}`
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRecords(prev => [...prev, ...data.records])
      setOffset(data.offset)
    } catch {
      // fail silently — user can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 pb-2">
      {records.length === 0 && (
        <p className="text-xs text-gray-400 text-center pt-6">{t('pipe.emptyColumn')}</p>
      )}
      {records.map(r => (
        <KanbanCard key={r.id} record={r} />
      ))}
      {offset && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full text-xs text-gray-500 hover:text-gray-700 py-2 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
        >
          {loading ? t('pipe.loading') : t('pipe.loadMore')}
        </button>
      )}
    </div>
  )
}
