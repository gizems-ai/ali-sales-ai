'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

interface FilterBarProps {
  filters: {
    oncelik: string
    kaynak: string
    etiket: string
    search: string
  }
  onFiltersChange: (filters: FilterBarProps['filters']) => void
}

const PRIORITIES = ['Sıcak', 'Ilık', 'Soğuk']
const SOURCES = ['WhatsApp', 'Instagram', 'Referans', 'Web', 'Telefon', 'Diğer']

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  function updateFilter(key: keyof typeof filters, value: string) {
    onFiltersChange({ ...filters, [key]: value })
  }

  function clearFilters() {
    onFiltersChange({
      oncelik: '',
      kaynak: '',
      etiket: '',
      search: '',
    })
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  return (
    <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: ALI.ui.border }}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <Label htmlFor="search" className="text-gray-700 mb-2 block">Ad Soyad</Label>
          <Input
            id="search"
            type="text"
            placeholder="Müşteri ara..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="h-10"
          />
        </div>

        {/* Öncelik */}
        <div>
          <Label htmlFor="oncelik" className="text-gray-700 mb-2 block">Öncelik</Label>
          <select
            id="oncelik"
            value={filters.oncelik}
            onChange={(e) => updateFilter('oncelik', e.target.value)}
            className="h-10 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            style={{ borderColor: ALI.ui.border }}
          >
            <option value="">Tümü</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>

        {/* Kaynak */}
        <div>
          <Label htmlFor="kaynak" className="text-gray-700 mb-2 block">Kaynak</Label>
          <select
            id="kaynak"
            value={filters.kaynak}
            onChange={(e) => updateFilter('kaynak', e.target.value)}
            className="h-10 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            style={{ borderColor: ALI.ui.border }}
          >
            <option value="">Tümü</option>
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        {/* Etiket */}
        <div>
          <Label htmlFor="etiket" className="text-gray-700 mb-2 block">Etiket</Label>
          <Input
            id="etiket"
            type="text"
            placeholder="Etiket ara..."
            value={filters.etiket}
            onChange={(e) => updateFilter('etiket', e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${ALI.ui.border}` }}>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}
    </div>
  )
}


