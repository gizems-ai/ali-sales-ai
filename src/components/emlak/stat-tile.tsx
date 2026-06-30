export function StatTile({
  label, value, sub, accent = '#1B7A47',
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-[22px] border bg-white p-[18px] shadow-sm flex flex-col" style={{ borderColor: '#E7EAF2' }}>
      <p className="text-[13px] font-bold text-slate-600">{label}</p>
      <p className="mt-[10px] text-[28px] leading-none font-black tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-[6px] text-[12px] text-slate-400">{sub}</p>}
    </div>
  )
}
