interface YakindaProps {
  baslik: string
  aciklama?: string
  className?: string
}

export function Yakinda({ baslik, aciklama, className = '' }: YakindaProps) {
  return (
    <div className={`rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 flex flex-col items-center justify-center text-center min-h-[120px] ${className}`}>
      <p className="text-sm font-medium text-gray-400">{baslik}</p>
      {aciklama && <p className="text-xs text-gray-300 mt-1">{aciklama}</p>}
      <span className="mt-2 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-400">
        Yakında
      </span>
    </div>
  )
}
