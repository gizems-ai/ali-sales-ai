import { PipelineBoard } from './pipeline-board'
import { getCustomers } from './actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

const STAGES = [
  { id: 'Yeni', emoji: '🔵', color: ALI.accent.blue },
  { id: 'İletişim', emoji: '🟡', color: ALI.accent.amber },
  { id: 'Teklif', emoji: '🟠', color: '#F97316' },
  { id: 'Pazarlık', emoji: '🟣', color: '#A855F7' },
  { id: 'Kazanıldı', emoji: '🟢', color: ALI.accent.emerald },
]

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const customers = await getCustomers()

  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white px-8 py-6 mb-8 rounded-2xl" style={{ border: `1px solid ${ALI.ui.border}` }}>
        <h1 className="text-3xl font-bold" style={{ color: ALI.accent.slate }}>
          Satış Süreci
        </h1>
        <p className="text-gray-500 mt-1">Müşterilerinizi aşamalara göre yönetin</p>
      </div>

      <PipelineBoard initialCustomers={customers} stages={STAGES} />
    </div>
  )
}


