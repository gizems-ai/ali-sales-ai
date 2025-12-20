'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Customer } from './actions'
import { CustomerCard } from './customer-card'

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

interface Stage {
  id: string
  emoji: string
  color: string
}

interface StageColumnProps {
  stage: Stage
  customers: Customer[]
  count: number
  totalValue: number
}

export function StageColumn({ stage, customers, count, totalValue }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col h-full min-h-[600px] bg-gray-50 rounded-2xl p-4 transition-colors"
      style={{
        backgroundColor: isOver ? `${stage.color}15` : '#F9FAFB',
        border: `1px solid ${ALI.ui.border}`,
      }}
    >
      {/* Stage Header */}
      <div className="mb-4 pb-4" style={{ borderBottom: `1px solid ${ALI.ui.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{stage.emoji}</span>
            <h3 className="font-semibold text-gray-900">{stage.id}</h3>
          </div>
          <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-lg">
            {count}
          </span>
        </div>
        
        {totalValue > 0 && (
          <p className="text-sm font-medium" style={{ color: ALI.accent.slate }}>
            {totalValue.toLocaleString('tr-TR')} ₺
          </p>
        )}

        <button
          className="mt-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => {
            // Placeholder for add customer
          }}
        >
          + Müşteri Ekle
        </button>
      </div>

      {/* Customer Cards */}
      <SortableContext
        items={customers.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-3 overflow-y-auto">
          {customers.length > 0 ? (
            customers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              Bu aşamada henüz müşteri yok.
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}



