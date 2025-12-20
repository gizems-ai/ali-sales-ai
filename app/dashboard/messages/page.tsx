'use client'

import { UserButton } from "@clerk/nextjs"
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Message {
  id: string
  created_at: string
  sender_name: string
  content: string
  platform: string
  direction: string
  is_read: boolean
  phone: string | null
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
  }, [])

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Mesajlar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch(platform.toLowerCase()) {
      case 'whatsapp': return '💬'
      case 'instagram': return '📸'
      case 'web form': return '🌐'
      default: return '📱'
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] lg:pl-64 flex flex-col relative font-sans">
      {/* Üst Bar */}
      <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-30">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Mesaj Merkezi</h2>
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
          <p className="text-slate-400 mt-2 text-sm">
            {messages.length} mesaj
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white rounded-[40px] p-20 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center text-5xl mb-8">
              📱
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-4">Henüz Mesaj Yok</h3>
            <p className="text-slate-400 max-w-sm">
              WhatsApp veya Instagram'dan gelen mesajlar burada görünecek.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`bg-white rounded-2xl p-6 border ${
                  msg.is_read ? 'border-slate-100' : 'border-indigo-200 bg-indigo-50/30'
                } shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getPlatformIcon(msg.platform)}</span>
                    <div>
                      <h3 className="font-bold text-slate-800">{msg.sender_name}</h3>
                      <p className="text-xs text-slate-400">{msg.platform}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    msg.direction === 'gelen' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'bg-green-50 text-green-600'
                  }`}>
                    {msg.direction === 'gelen' ? '⬅️ Gelen' : '➡️ Giden'}
                  </span>
                </div>
                <p className="text-slate-600">{msg.content}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(msg.created_at).toLocaleString('tr-TR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}