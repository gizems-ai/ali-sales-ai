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

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) setCustomers(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const toplamKazanc = customers.reduce((acc, curr) => acc + Number(curr.tahmini_deger || 0), 0)

  const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer)
    setIsDrawerOpen(true)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin text-4xl">🤖</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:pl-64 flex flex-col relative">
      {/* Üst Navigasyon (Clerk Dahil) */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 px-8 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Müşteri Yönetimi</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-500">Ali'nin Paneli</span>
          <UserButton afterSignOutUrl="/"/>
        </div>
      </header>

      <main className="p-6 md:p-10 flex-1 z-10">
        {/* Selamlama Kartı */}
        <div className="mb-10 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
          <div className="text-5xl group-hover:scale-110 transition-transform">🤖</div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight italic">Selam! Ben Ali.</h1>
            <p className="text-slate-500 font-medium mt-1 italic opacity-70">Airtable pürüzsüzlüğünde bir gün dilerim.</p>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[28px] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Toplam Potansiyel</p>
            <h2 className="text-4xl font-black text-[#6366F1]">₺{toplamKazanc.toLocaleString('tr-TR')}</h2>
          </div>
          <div className="bg-white p-8 rounded-[28px] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Müşteri Sayısı</p>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">{customers.length}</h2>
          </div>
          <div className="bg-[#EEF2FF] p-8 rounded-[28px] border border-[#E0E7FF] shadow-sm">
            <p className="text-[10px] font-black text-[#6366F1] uppercase tracking-widest mb-2">Sistem Durumu</p>
            <h2 className="text-xl font-black text-[#4F46E5] mt-2 tracking-tighter uppercase italic">Sistem Aktif ✅</h2>
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black text-slate-800 italic tracking-tight">Müşteri Portföyü</h3>
          </div>

          <div className="grid gap-4">
            {customers.map((c) => (
              <div 
                key={c.id} 
                onClick={() => handleCustomerClick(c)}
                className="group flex flex-col md:flex-row items-center justify-between p-6 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all cursor-pointer hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#6366F1] text-xl font-black shadow-inner">
                    {c.ad_soyad?.[0] || 'M'}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 group-hover:text-[#6366F1] transition-colors tracking-tight text-lg">{c.ad_soyad}</h4>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{c.sirket || 'Bireysel'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto mt-5 md:mt-0 pt-5 md:pt-0 border-t md:border-0 border-slate-50">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">DEĞER</p>
                    <p className="font-black text-slate-700 text-lg tracking-tight">₺{Number(c.tahmini_deger || 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 shadow-sm transition-all ${
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