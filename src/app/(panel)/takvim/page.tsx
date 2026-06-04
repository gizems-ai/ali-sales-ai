export default function TakvimPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Takvim</h1>
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-12 flex flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-gray-400">Takvim yakında burada</p>
        <span className="mt-3 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400">
          Yakında
        </span>
      </div>
    </div>
  )
}
