import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CustomersPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  const stageColors: Record<string, string> = {
    'yeni': 'bg-blue-100 text-blue-800',
    'iletisim': 'bg-yellow-100 text-yellow-800',
    'teklif': 'bg-orange-100 text-orange-800',
    'muzakere': 'bg-purple-100 text-purple-800',
    'kazanildi': 'bg-green-100 text-green-800',
  }

  const priorityColors: Record<string, string> = {
    'sıcak': 'text-red-600',
    'ılık': 'text-yellow-600',
    'soğuk': 'text-blue-600',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-gray-600 mt-1">Tüm müşterilerinizi buradan yönetin</p>
        </div>
        <button className="bg-cyan-500 text-white px-6 py-3 rounded-2xl font-medium hover:bg-cyan-600 transition-colors">
          + Müşteri Ekle
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ad Soyad</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Şirket</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Telefon</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Aşama</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Öncelik</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tahmini Değer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers && customers.map((customer: any) => (
              <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{customer.name}</div>
                  <div className="text-sm text-gray-500">{customer.email}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{customer.company}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{customer.phone}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${stageColors[customer.stage] || 'bg-gray-100 text-gray-800'}`}>
                    {customer.stage === 'yeni' ? 'Yeni' :
                     customer.stage === 'iletisim' ? 'İletişim' :
                     customer.stage === 'teklif' ? 'Teklif' :
                     customer.stage === 'muzakere' ? 'Müzakere' :
                     customer.stage === 'kazanildi' ? 'Kazanıldı' : customer.stage}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${priorityColors[customer.priority] || 'text-gray-600'}`}>
                    🔥 {customer.priority?.charAt(0).toUpperCase() + customer.priority?.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  ₺{customer.estimated_value?.toLocaleString('tr-TR') || '0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

