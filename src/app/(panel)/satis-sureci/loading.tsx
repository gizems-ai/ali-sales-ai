export default function SatisSureciLoading() {
  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4 animate-pulse">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[280px] space-y-3">
          <div className="h-10 rounded-xl bg-slate-200" />
          {[...Array(3)].map((_, j) => (
            <div key={j} className="h-[100px] rounded-xl bg-slate-200" />
          ))}
        </div>
      ))}
    </div>
  )
}
