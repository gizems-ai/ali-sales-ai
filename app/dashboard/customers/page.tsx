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

  // Holo Tasarım Dilinde Yumuşak Renkler
  const stageStyles: Record<string, string> = {
    'yeni': 'bg-sky-50 text-sky-600 border-sky-100',
    'iletisim': 'bg-purple-50 text-purple-600 border-purple-100',
    'teklif': 'bg-amber-50 text-amber-600 border-amber-100',
    'muzakere': 'bg-indigo-50 text-indigo-600 border-indigo-100',
    'kazanildi': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  }

  return (
    // Ana arka plana soft AI gradyanı (Lilac & Sky Blue)
    <div className="p-8 min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#EEF2FF]">
      
      {/* Üst Başlık Alanı */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-3">
             {/* Ali'nin 3D ikonunun geleceği yer */}
            <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-2xl">🤖</div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Müşterilerim</h1>
          </div>
          <p className="text-slate-500 mt-2 font-medium">Ali senin için tüm listeyi hazırladı.</p>
        </div>
        
        <button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg shadow-cyan-200 hover:scale-105 transition-all duration-300 active:scale-95">
          + Yeni Müşteri Ekle
        </button>
      </div>

      {/* Glassmorphism Kart (Holo Etkisi) */}
      <div className="bg-white/70 backdrop-blur-xl rounded-[32px] border border-white/50 shadow-xl shadow-slate-200/50 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Müşteri</th>
              <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Şirket / Sektör</th>
              <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Durum (Aşama)</th>
              <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Öncelik</th>
              <th className="px-8 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Tahmini Değer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {customers && customers.map((customer: any) => (
              <tr key={customer.id} className="hover:bg-white/50 transition-all duration-200 group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-500 group-hover:from-blue-50 group-hover:to-cyan-50 group-hover:text-blue-500 transition-colors">
                      {customer.ad_soyad?.[0] || 'M'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-700 text-base">{customer.ad_soyad || customer.name}</div>
                      <div className="text-sm text-slate-400 font-medium">{customer.telefon || 'Telefon yok'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="text-sm font-semibold text-slate-600">{customer.sirket || customer.company || '-'}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{customer.sektor || 'Sektör belirtilmedi'}</div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-xl text-xs font-bold border ${stageStyles[customer.asama || customer.stage] || 'bg-slate-50 text-slate-500'}`}>
                    {String(customer.asama || customer.stage).toUpperCase()}
                  </span>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${customer.oncelik === 'sıcak' ? 'bg-rose-500 animate-pulse' : customer.oncelik === 'ılık' ? 'bg-amber-500' : 'bg-sky-400'}`} />
                      <span className="text-sm font-bold text-slate-600 capitalize">{customer.oncelik || customer.priority}</span>
                   </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="text-base font-black text-slate-700">
                    ₺{Number(customer.tahmini_deger || customer.estimated_value || 0).toLocaleString('tr-TR')}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Müşteri Yoksa Ali'nin Boş Durum Ekranı */}
        {(!customers || customers.length === 0) && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-xl font-bold text-slate-700">Henüz kimse yok!</h3>
            <p className="text-slate-500 mt-2 max-w-xs">Ali burada senin için müşteri biriktirmeyi bekliyor. Hadi ilkini ekleyelim!</p>
          </div>
        )}
      </div>
    </div>
  )
}