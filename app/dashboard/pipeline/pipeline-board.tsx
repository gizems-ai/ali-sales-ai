'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Customer, updateCustomerStage } from './actions'
import { toast } from '@/components/ui/toast'
import { CustomerCard } from './customer-card'
import { FilterBar } from './filter-bar'
import { StageColumn } from './stage-column'

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

interface PipelineBoardProps {
  initialCustomers: Customer[]
  stages: Stage[]
}

export function PipelineBoard({ initialCustomers, stages }: PipelineBoardProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | null>(null) // For mobile
  const [filters, setFilters] = useState({
    oncelik: '',
    kaynak: '',
    etiket: '',
    search: '',
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (filters.oncelik && customer.oncelik !== filters.oncelik) return false
      if (filters.kaynak && customer.kaynak !== filters.kaynak) return false
      if (filters.etiket && !customer.etiketler?.includes(filters.etiket)) return false
      if (filters.search && !customer.ad_soyad.toLowerCase().includes(filters.search.toLowerCase())) return false
      return true
    })
  }, [customers, filters])

  // Group customers by stage
  const customersByStage = useMemo(() => {
    const grouped: Record<string, Customer[]> = {}
    stages.forEach((stage) => {
      grouped[stage.id] = []
    })
    filteredCustomers.forEach((customer) => {
      const stage = customer.asama || 'Yeni'
      if (grouped[stage]) {
        grouped[stage].push(customer)
      } else {
        grouped['Yeni'].push(customer)
      }
    })
    return grouped
  }, [filteredCustomers, stages])

  // Calculate stage totals
  const stageTotals = useMemo(() => {
    return stages.map((stage) => {
      const stageCustomers = customersByStage[stage.id] || []
      const count = stageCustomers.length
      const totalValue = stageCustomers.reduce((sum, c) => sum + (c.tahmini_deger || 0), 0)
      return { stage: stage.id, count, totalValue }
    })
  }, [customersByStage, stages])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const customerId = active.id as string
    const newStage = over.id as string

    // Check if it's a valid stage
    if (!stages.find((s) => s.id === newStage)) return

    // Find the customer
    const customer = customers.find((c) => c.id === customerId)
    if (!customer) return

    // If same stage, do nothing
    if (customer.asama === newStage) return

    // Optimistic update
    const oldStage = customer.asama
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, asama: newStage } : c))
    )

    // Update in database
    const result = await updateCustomerStage(customerId, newStage)

    if (result.error) {
      // Revert on error
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, asama: oldStage } : c))
      )
      toast(result.error, 'error')
    } else {
      toast(`${customer.ad_soyad} → ${newStage} aşamasına taşındı`, 'success')
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  const activeCustomer = activeId ? customers.find((c) => c.id === activeId) : null

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Mobile View */}
      <div className="block md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {stages.map((stage) => {
            const total = stageTotals.find((t) => t.stage === stage.id)
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  selectedStage === stage.id
                    ? 'text-white shadow-lg'
                    : 'bg-white text-gray-700 border'
                }`}
                style={{
                  backgroundColor: selectedStage === stage.id ? stage.color : undefined,
                  borderColor: selectedStage !== stage.id ? ALI.ui.border : undefined,
                }}
              >
                {stage.emoji} {stage.id} ({total?.count || 0})
              </button>
            )
          })}
        </div>

        {selectedStage && (
          <div className="space-y-3">
            {(customersByStage[selectedStage] || []).map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
            {(!customersByStage[selectedStage] || customersByStage[selectedStage].length === 0) && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border" style={{ borderColor: ALI.ui.border }}>
                Bu aşamada henüz müşteri yok.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Kanban View */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden md:grid md:grid-cols-5 gap-4">
          {stages.map((stage) => {
            const stageCustomers = customersByStage[stage.id] || []
            const total = stageTotals.find((t) => t.stage === stage.id)

            return (
              <StageColumn
                key={stage.id}
                stage={stage}
                customers={stageCustomers}
                count={total?.count || 0}
                totalValue={total?.totalValue || 0}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeCustomer ? (
            <div className="opacity-50">
              <CustomerCard customer={activeCustomer} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {filteredCustomers.length === 0 && customers.length > 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border" style={{ borderColor: ALI.ui.border }}>
          Filtreye uygun müşteri bulunamadı.
        </div>
      )}
    </div>
  )
}

