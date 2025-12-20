'use client'

import { UserButton } from "@clerk/nextjs"

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:pl-64 flex flex-col relative font-sans">
      {/* Üst Bar */}
      <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-30">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">
          Mesaj Merkezi
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded">
            SİSTEM ÇALIŞIYOR ✅
          </span>
          <UserButton afterSignOutUrl="/"/>
        </div>
      </header>

      <main className="p-6 md:p-10 flex-1">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-800 italic tracking-tight">
            Gelen Kutusu
          </h1>
          <p className="text-slate-400 mt-2 text-sm italic">
            WhatsApp ve Instagram mesajlarınız burada görünecek
          </p>
        </div>

        {/* Boş Durum */}
        <div className="bg-white rounded-[40px] p-20 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center text-5xl mb-8">
            📱
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-4 italic">
            Mesajlar Hazırlanıyor
          </h3>
          <p className="text-slate-400 max-w-sm">
            WhatsApp entegrasyonu tamamlandığında tüm mesajlarınız burada görünecek.
          </p>
        </div>
      </main>
    </div>
  )
}