'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Segment = 'kurumsal' | 'bireysel'

const C = { violet: '#5B38E8', line: '#E7EAF2' }

export function SegmentSwitch() {
  const [segment, setSegment] = useState<Segment>('kurumsal')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Cookie'yi istemci tarafında oku (httpOnly değil)
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)emlak_segment=([^;]*)/)
    if (match?.[1] === 'bireysel') setSegment('bireysel')
  }, [])

  async function switchTo(next: Segment) {
    if (next === segment) return
    await fetch('/api/emlak-segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segment: next }),
    })
    setSegment(next)
    startTransition(() => router.refresh())
  }

  return (
    <div className="mx-[14px] mb-[10px] flex rounded-[10px] overflow-hidden border"
      style={{ borderColor: C.line }}>
      {(['kurumsal', 'bireysel'] as Segment[]).map(s => (
        <button
          key={s}
          disabled={isPending}
          onClick={() => switchTo(s)}
          className={`flex-1 py-[7px] text-[12px] font-bold transition-colors capitalize ${
            segment === s
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-700 bg-white'
          }`}
          style={segment === s ? { background: C.violet } : {}}
        >
          {s === 'kurumsal' ? 'Kurumsal' : 'Bireysel'}
        </button>
      ))}
    </div>
  )
}
