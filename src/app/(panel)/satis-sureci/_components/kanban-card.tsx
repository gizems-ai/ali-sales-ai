import { Flame } from 'lucide-react'
import { type AirtableRecord, type FirmaKart } from '@/lib/airtable'
import { TEMSILCI_RENK, TEMSILCI_RENK_FALLBACK } from '@/lib/temsilciler'
import { useT } from '@/lib/i18n/context'

function temsilciRenk(ad: string) {
  return TEMSILCI_RENK[ad] ?? TEMSILCI_RENK_FALLBACK
}

function SicaklikBadge({ skor }: { skor: number }) {
  const bg   = skor >= 7 ? '#FEE2E2' : skor >= 4 ? '#EDE9FE' : '#F3F4F6'
  const text = skor >= 7 ? '#DC2626' : skor >= 4 ? '#5B47E0' : '#9CA3AF'
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5 shrink-0"
      style={{ background: bg, color: text }}
    >
      <Flame size={8} />
      {skor}
    </span>
  )
}

export function KanbanCard({ record }: { record: AirtableRecord<FirmaKart> }) {
  const t = useT()
  const f = record.fields
  const isYuksek = f['Öncelik'] === 'Yüksek'
  const temsilci = f['Atanan Temsilci']
  const branslar = f['Branş'] ?? []

  return (
    <div
      className={`bg-white rounded-lg border p-2 hover:shadow-sm transition-shadow ${
        isYuksek ? 'border-[#5B47E0]' : 'border-gray-200'
      }`}
    >
      {/* Başlık + skor */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p
          className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2 min-w-0"
          style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}
        >
          {f['Firma Adı'] ?? t('pipe.unnamed')}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {f['Sıcaklık Skoru'] != null && (
            <SicaklikBadge skor={f['Sıcaklık Skoru']} />
          )}
          {isYuksek && (
            <span className="text-[10px] font-bold text-[#5B47E0] leading-none">↑</span>
          )}
        </div>
      </div>

      {/* Rozetler */}
      <div className="flex flex-wrap gap-1">
        {f['Sektör'] && (
          <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 leading-tight">
            {f['Sektör']}
          </span>
        )}
        {branslar.map(b => (
          <span
            key={b}
            className="text-[10px] rounded px-1.5 py-0.5 leading-tight"
            style={{ background: '#EDE9FE', color: '#5B47E0' }}
          >
            {b}
          </span>
        ))}
        {f['Vade Ayı Grubu'] && (
          <span className="text-[10px] bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 leading-tight">
            {f['Vade Ayı Grubu']}
          </span>
        )}
      </div>

      {/* Temsilci */}
      {temsilci && (
        <div className="mt-1 flex items-center gap-1">
          <span
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[7px] font-bold text-white shrink-0"
            style={{ background: temsilciRenk(temsilci) }}
          >
            {temsilci[0]}
          </span>
          <span className="text-[10px] text-gray-400">{temsilci}</span>
        </div>
      )}
    </div>
  )
}
