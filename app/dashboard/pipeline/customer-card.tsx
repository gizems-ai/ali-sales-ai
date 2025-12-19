'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Customer } from './actions'

const ALI = {
  accent: {
    cyan: '#06B6D4',
    blue: '#3B82F6',
    emerald: '#10B981',
    amber: '#F59E0B',
    slate: '#0F172A',
  },
  ui: {
    appBg: '#F6F7FB',
    border: 'rgba(15, 23, 42, 0.08)',
  },
}

const PRIORITY_EMOJI: Record<string, string> = {
  'Sıcak': '🔥',
  'Ilık': '🟡',
  'Soğuk': '❄️',
}

const SOURCE_EMOJI: Record<string, string> = {
  'WhatsApp': '📱',
  'Instagram': '📸',
  'Referans': '👥',
  'Web': '🌐',
  'Telefon': '☎️',
  'Diğer': '📋',
}

interface CustomerCardProps {
  customer: Customer
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: customer.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const formatNextFollowUp = (dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays < 0) {
        return `${Math.abs(diffDays)} gün geçti`
      } else if (diffDays === 0) {
        return 'Bugün'
      } else {
        return `${diffDays} gün sonra`
      }
    } catch {
      return null
    }
  }

  const nextFollowUpText = formatNextFollowUp(customer.sonraki_takip)
  const priorityEmoji = customer.oncelik ? PRIORITY_EMOJI[customer.oncelik] || '' : ''
  const sourceEmoji = customer.kaynak ? SOURCE_EMOJI[customer.kaynak] || '' : ''
  const displayedTags = customer.etiketler?.slice(0, 2) || []
  const remainingTags = (customer.etiketler?.length || 0) - displayedTags.length

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="bg-white rounded-xl p-4 shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
      style={{
        ...style,
        borderColor: ALI.ui.border,
      }}
    >
      {/* Ad Soyad */}
      <h3 className="font-semibold text-gray-900 mb-2" style={{ color: ALI.accent.slate }}>
        {customer.ad_soyad}
      </h3>

      {/* Şirket */}
      {customer.sirket && (
        <p className="text-sm text-gray-600 mb-3">{customer.sirket}</p>
      )}

      {/* Tahmini Değer */}
      {customer.tahmini_deger && customer.tahmini_deger > 0 && (
        <div className="mb-3">
          <p className="text-2xl font-bold" style={{ color: ALI.accent.slate }}>
            {customer.tahmini_deger.toLocaleString('tr-TR')} ₺
          </p>
        </div>
      )}

      {/* Badges Row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Öncelik */}
        {customer.oncelik && (
          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {priorityEmoji} {customer.oncelik}
          </span>
        )}

        {/* Kaynak */}
        {customer.kaynak && (
          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
            {sourceEmoji} {customer.kaynak}
          </span>
        )}
      </div>

      {/* Sonraki Takip */}
      {nextFollowUpText && (
        <div className="mb-3">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Sonraki Takip:</span> {nextFollowUpText}
          </p>
        </div>
      )}

      {/* Etiketler */}
      {customer.etiketler && customer.etiketler.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {displayedTags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
            >
              {tag}
            </span>
          ))}
          {remainingTags > 0 && (
            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
              +{remainingTags}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

