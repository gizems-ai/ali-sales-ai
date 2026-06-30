import { type SicaklikTipi } from '@/lib/emlak-fixtures'

const CFG: Record<SicaklikTipi, { bg: string; label: string }> = {
  hot:  { bg: '#EF6B4F', label: 'Sıcak'    },
  warm: { bg: '#F59E0B', label: 'Ilık'     },
  cold: { bg: '#94A3B8', label: 'Soğuk'    },
}

export function HeatDot({ temp, showLabel = false }: { temp: SicaklikTipi; showLabel?: boolean }) {
  const { bg, label } = CFG[temp]
  return (
    <span className="inline-flex items-center gap-[5px]">
      <span
        className="shrink-0 rounded-full"
        style={{ width: 8, height: 8, background: bg, boxShadow: `0 0 0 2px ${bg}33` }}
      />
      {showLabel && <span className="text-[11px] font-semibold" style={{ color: bg }}>{label}</span>}
    </span>
  )
}
