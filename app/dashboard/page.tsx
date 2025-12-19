import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  // 1. Clerk ile oturum kontrolü - Eğer kullanıcı yoksa anında yönlendir
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/login')
  }

  try {
    // 2. Supabase bağlantısını kur
    const supabase = await createClient()

    // 3. Verileri güvenli bir şekilde çek
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    // Supabase tarafında bir hata varsa konsola yaz ama sayfayı çökertme
    if (error) {
      console.error('Supabase Error:', error.message)
    }

    // 4. Veri hesaplamalarını "safe navigation" (?.) ile yap (Patlamayı önler)
    const stages = {
      yeni: customers?.filter(c => c.stage === 'yeni')?.length || 0,
      iletisim: customers?.filter(c => c.stage === 'iletisim')?.length || 0,
      teklif: customers?.filter(c => c.stage === 'teklif')?.length || 0,
      muzakere: customers?.filter(c => c.stage === 'muzakere')?.length || 0,
      kazanildi: customers?.filter(c => c.stage === 'kazanildi')?.length || 0,
    }

    const totalRevenue = customers
      ?.filter(c => c.stage === 'kazanildi')
      ?.reduce((sum, c) => sum + (Number(c.estimated_value) || 0), 0) || 0

    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ana Sayfa</h1>
          <p className="text-gray-600 mt-1">Satış performansınızın genel görünümü</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Yeni Lead Kartı */}
          <div className="bg-white rounded-3xl shadow-sm p-6 border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-gray-900">{stages.yeni}</div>
            <div className="text-sm text-gray-600 mt-1">Yeni Lead</div>
          </div>

          {/* Kazanç Kartı */}
          <div className="bg-white rounded-3xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="text-3xl font-bold text-gray-900">
              ₺{totalRevenue.toLocaleString('tr-TR')}
            </div>
            <div className="text-sm text-gray-600 mt-1">Toplam Kazanç</div>
          </div>

          {/* İletişim Kartı */}
          <div className="bg-white rounded-3xl shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="text-3xl font-bold text-gray-900">{stages.iletisim}</div>
            <div className="text-sm text-gray-600 mt-1">İletişimdeki Müşteriler</div>
          </div>

          {/* Kazanılan Müşteri Sayısı Kartı */}
          <div className="bg-white rounded-3xl shadow-sm p-6 border-l-4 border-purple-500">
            <div className="text-3xl font-bold text-gray-900">{stages.kazanildi}</div>
            <div className="text-sm text-gray-600 mt-1">Kapatılan Satış</div>
          </div>
        </div>
        
        {/* Veri yoksa uyarı göster */}
        {(!customers || customers.length === 0) && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl">
            Henüz müşteri verisi bulunmuyor. Supabase tablonuzu kontrol edin.
          </div>
        )}
      </div>
    )
  } catch (err) {
    // Eğer kodun herhangi bir yerinde ağır bir hata olursa burası çalışır
    console.error('Kritik Dashboard Hatası:', err)
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Bir şeyler ters gitti.</h2>
        <p className="text-gray-600">Lütfen Vercel Logs üzerinden hatayı kontrol edin.</p>
      </div>
    )
  }
}