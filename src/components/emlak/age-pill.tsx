type AgeTier = 'fresh' | 'warn' | 'old'

function tier(days: number): AgeTier {
  if (days <= 7) return 'fresh'
  if (days <= 30) return 'warn'
  return 'old'
}

const CFG: Record<AgeTier, { bg: string; fg: string; label: string }> = {
  fresh: { bg: '#D1FAE5', fg: '#065F46', label: 'Taze'  },
  warn:  { bg: '#FEF3C7', fg: '#92400E', label: 'Bekliyor' },
  old:   { bg: '#FEE2E2', fg: '#991B1B', label: 'Eski'  },
}

export function AgePill({ days }: { days: number }) {
  const t = tier(days)
  const { bg, fg, label } = CFG[t]
  return (
    <span
      className="inline-flex items-center rounded-full px-[8px] py-[3px] text-[10px] font-bold"
      style={{ background: bg, color: fg }}
    >
      {days === 0 ? 'Bugün' : `${days}g · ${label}`}
    </span>
  )
}
