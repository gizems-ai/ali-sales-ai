'use client'

import { UserButton } from "@clerk/nextjs"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:pl-64 flex flex-col relative font-sans">
      {/* Üst Bar */}
      <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-30">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">
          Ana Sayfa
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded">
            SİSTEM ÇALIŞIYOR ✅
          </span>
          <UserButton afterSignOutUrl="/"/>
        </div>
      </header>

      <main className="p-6 md:p-10 flex-1">
        {/* KPI Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-100">
            <div className="text-xs font-bold text-blue-600 mb-2">YENİ LEAD</div>
            <div className="text-4xl font-black text-slate-800">0</div>
            <div className="text-xs text-slate-400 mt-2">Bu hafta</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-100">
            <div className="text-xs font-bold text-emerald-600 mb-2">AKTİF KONUŞMA</div>
            <div className="text-4xl font-black text-slate-800">0</div>
            <div className="text-xs text-slate-400 mt-2">Devam eden</div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-100">
            <div className="text-xs font-bold text-amber-600 mb-2">DÖNÜŞÜM</div>
            <div className="text-4xl font-black text-slate-800">0%</div>
            <div className="text-xs text-slate-400 mt-2">Bu ay</div>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-6 border border-violet-100">
            <div className="text-xs font-bold text-violet-600 mb-2">KAZANÇ</div>
            <div className="text-4xl font-black text-slate-800">₺0</div>
            <div className="text-xs text-slate-400 mt-2">Bu ay</div>
          </div>
        </div>

        {/* Hoşgeldin Mesajı */}
        <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-4 italic">
            Hoşgeldin! 👋
          </h1>
          <p className="text-slate-400 max-w-md mx-auto">
            ALI Sales AI sisteminiz hazır. Müşterilerinizi ekleyin ve satış sürecinizi takip edin.
          </p>
        </div>
      </main>
    </div>
  )
}