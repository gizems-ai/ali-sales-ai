'use client'

import { useState } from 'react'
import { type TenantTemsilci } from '@/lib/tenants'

interface Props {
  temsilciler: TenantTemsilci[]
  htmlMap: Record<string, string | null>
}

export function AjandaAdminView({ temsilciler, htmlMap }: Props) {
  const [aktif, setAktif] = useState<string>(temsilciler[0]?.slug ?? '')

  const html = htmlMap[aktif] ?? null

  return (
    <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-6 flex flex-col" style={{ height: 'calc(100vh - 73px)' }}>
      {/* Tab bar */}
      <div className="flex gap-1 px-4 pt-3 pb-0 bg-white border-b border-gray-100 shrink-0">
        {temsilciler.map((t) => {
          const isAktif = aktif === t.slug
          return (
            <button
              key={t.slug}
              onClick={() => setAktif(t.slug)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                isAktif
                  ? 'bg-[#5B47E0] text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {t.ad}
            </button>
          )
        })}
      </div>

      {/* İçerik */}
      {html ? (
        <iframe
          srcDoc={html}
          className="w-full border-0 flex-1"
          sandbox="allow-same-origin"
          title={`Sabah Ajandası — ${aktif}`}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">
            {temsilciler.find(t => t.slug === aktif)?.ad ?? aktif} için güncel rapor bulunamadı.
          </p>
        </div>
      )}
    </div>
  )
}
