import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/login')
  }

  // Hata yönetimi için try-catch
  try {
    const supabase = await createClient()

    // Veri çekerken hata olsa bile sayfa çökmesin
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')

    if (error) throw error;

    const stats = {
      yeni: customers?.filter(c => c.stage === 'yeni')?.length || 0,
      kazanc: customers?.filter(c => c.stage === 'kazanildi')
               ?.reduce((sum, c) => sum + (Number(c.estimated_value) || 0), 0) || 0
    }

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Hoş Geldiniz</h1>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-100 rounded-xl">
            <p className="text-sm">Yeni Lead</p>
            <p className="text-2xl font-bold">{stats.yeni}</p>
          </div>
          <div className="p-4 bg-green-100 rounded-xl">
            <p className="text-sm">Kazanç</p>
            <p className="text-2xl font-bold">₺{stats.kazanc.toLocaleString('tr-TR')}</p>
          </div>
        </div>
      </div>
    )
  } catch (err) {
    console.error("Dashboard hatası:", err)
    return (
      <div className="p-8 text-center text-red-500">
        Veritabanı bağlantısı kurulamadı. Lütfen Supabase URL ve Key ayarlarınızı kontrol edin.
      </div>
    )
  }
}