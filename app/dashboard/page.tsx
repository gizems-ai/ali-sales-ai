'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { UserButton } from "@clerk/nextjs"
import { CustomerDetailDrawer } from './customer-detail-drawer'

export default function DashboardPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  // Veri Çekme Fonksiyonu
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!error && data) setCustomers(data)
    } catch (err) {
      console.error("Hata:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer)
    setIsDrawerOpen(true)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-xl font-black text-slate-400 animate-pulse italic">ALİ DÜKKANI AÇIYOR... 🤖</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:pl-64 flex flex-col relative font-sans">
      
      {/* Üst Bar - Clerk Butonu Burada */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-30">
        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Müşteri Portföyü</h2>
        <div className="flex items-center gap-4">
          <div className="text-right mr-2">
            <p className="text-[10px] font-black text-slate-300 uppercase">Yönetici</p>
            <p className="text-xs font-bold text-slate-600 italic">Ali Paneli</p>
          </div>
          <UserButton afterSignOutUrl="/"/>
        </div>
      </header>

      <main className="p-6 md:p-10 flex-1">
        
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm group hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Kayıtlı Müşteri</p>
            <h2 className="text-5xl font-black text-slate-800 tracking-tighter">{customers.length}</h2>
          </div>
          <div className="bg-[#4F46E5] p-10 rounded-[40px] shadow-2xl shadow-indigo-200 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[11px] font-black text-indigo-200 uppercase tracking-widest mb-3">Sistem Durumu</p>
              <h2 className="text-3xl font-black text-white italic tracking-tight">DÜKKAN AKTİF ✅</h2>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
          </div>
        </div>

        {/* Liste - Airtable/Softr Stili */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black text-slate-800 italic tracking-tight underline decoration-indigo-500 decoration-4 underline-offset-8">Müşteriler</h3>
          </div>

          <div className="grid gap-4">
            {customers.map((c) => (
              <div 
                key={c.id} 
                onClick={() => handleCustomerClick(c)}
                className="flex items-center justify-between p-6 bg-white hover:bg-slate-50 rounded-[24px] border border-slate-100 transition-all cursor-pointer group hover:border-indigo-100"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#4F46E5] text-xl font-black shadow-inner group-hover:scale-110 transition-transform">
                    {c.ad_soyad?.[0] || 'M'}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 group-hover:text-[#4F46E5] transition-colors text-lg tracking-tight">{c.ad_soyad}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">{c.sirket || 'Şahıs Firması'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                   <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase border-2 shadow-sm transition-all ${
                    c.asama === 'Kazanıldı' ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' : 
                    c.asama === 'Pazarlık' ? 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]' :
                    'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                  }`}>
                    {c.asama || 'YENİ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Detay Paneli Bağlantısı */}
      <CustomerDetailDrawer 
        customer={selectedCustomer} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onUpdate={() => {
          fetchCustomers()
          setIsDrawerOpen(false)
        }} 
      />
    </div>
  )
}