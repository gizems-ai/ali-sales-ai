export default function PanelLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-pulse">
      <div className="h-[150px] rounded-[16px] bg-slate-200" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[14px]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[126px] rounded-[15px] bg-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5">
        <div className="space-y-4">
          <div className="h-64 rounded-[15px] bg-slate-200" />
          <div className="h-48 rounded-[15px] bg-slate-200" />
        </div>
        <div className="space-y-4">
          <div className="h-80 rounded-[18px] bg-slate-200" />
          <div className="h-48 rounded-[18px] bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
