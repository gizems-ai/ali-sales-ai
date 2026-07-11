'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Ali Sohbet — çekirdek sohbet bileşeni (drawer + tam sayfa ortak)
//  Durumlar: boş (chip'ler) · düşünüyor · cevap (yazma animasyonu) · hata-fallback
//  Salt okunur: yalnız /api/ali-chat'e soru gönderir; hiçbir veriye yazmaz.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Send, Sparkles } from 'lucide-react'
import { Z } from '@/lib/ali-zeka'
import { DEMO_CHIPS } from '@/lib/ali-chat/demo'
import type { AliChatResponse } from '@/lib/ali-chat/types'

interface Mesaj {
  id: number
  rol: 'kullanici' | 'ali'
  metin: string
  fallback?: boolean
  yaziliyor?: boolean   // yazma animasyonu sürüyor mu
}

let _sayac = 0
const yeniId = () => ++_sayac

export function AliChat({ variant = 'full' }: { variant?: 'drawer' | 'full' }) {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([])
  const [girdi, setGirdi] = useState('')
  const [dusunuyor, setDusunuyor] = useState(false)
  const kaydirRef = useRef<HTMLDivElement>(null)

  // Yeni mesaj / durum → en alta kaydır
  useEffect(() => {
    kaydirRef.current?.scrollTo({ top: kaydirRef.current.scrollHeight, behavior: 'smooth' })
  }, [mesajlar, dusunuyor])

  async function gonder(soru: string) {
    const q = soru.trim()
    if (!q || dusunuyor) return
    setGirdi('')
    setMesajlar(m => [...m, { id: yeniId(), rol: 'kullanici', metin: q }])
    setDusunuyor(true)
    try {
      const r = await fetch('/api/ali-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ soru: q }),
      })
      const data: AliChatResponse = await r.json().catch(() => ({ ok: false }))
      const metin = data.cevap ?? 'Şu an cevap veremiyorum — birazdan tekrar dener misin?'
      yazarakEkle(metin, data.fallback)
    } catch {
      yazarakEkle('Şu an cevap veremiyorum — birazdan tekrar dener misin?', true)
    } finally {
      setDusunuyor(false)
    }
  }

  // Cevabı harf harf açan yazma animasyonu (canlılık)
  function yazarakEkle(tam: string, fallback?: boolean) {
    const id = yeniId()
    setMesajlar(m => [...m, { id, rol: 'ali', metin: '', fallback, yaziliyor: true }])
    let i = 0
    const adim = Math.max(1, Math.round(tam.length / 90))  // ~1.5sn'de tamamlanır
    const int = setInterval(() => {
      i = Math.min(tam.length, i + adim)
      const kismi = tam.slice(0, i)
      const bitti = i >= tam.length
      setMesajlar(m => m.map(x => x.id === id ? { ...x, metin: kismi, yaziliyor: !bitti } : x))
      if (bitti) clearInterval(int)
    }, 16)
  }

  const bos = mesajlar.length === 0 && !dusunuyor
  const tam = variant === 'full'

  return (
    <div
      className="flex flex-col"
      style={{ height: tam ? 'min(72vh, 640px)' : '100%' }}
    >
      {/* Mesaj alanı */}
      <div ref={kaydirRef} className="flex-1 overflow-y-auto px-[18px] py-[16px] space-y-[14px]">
        {bos ? (
          <BosDurum onSec={gonder} />
        ) : (
          mesajlar.map(m => <Balon key={m.id} mesaj={m} />)
        )}
        {dusunuyor && <Dusunuyor />}
      </div>

      {/* Girdi çubuğu */}
      <div className="px-[14px] py-[12px]" style={{ borderTop: `1px solid ${Z.line}` }}>
        <form
          onSubmit={e => { e.preventDefault(); gonder(girdi) }}
          className="flex items-end gap-[8px] rounded-[16px] px-[12px] py-[8px]"
          style={{ background: '#fff', border: `1px solid ${Z.line}` }}
        >
          <textarea
            value={girdi}
            onChange={e => setGirdi(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gonder(girdi) } }}
            rows={1}
            placeholder="Stok, kampanya, müşteri veya eşleştirme sor…"
            className="flex-1 resize-none bg-transparent text-[13.5px] leading-[20px] outline-none placeholder:text-slate-400"
            style={{ color: Z.text, maxHeight: 96 }}
            disabled={dusunuyor}
          />
          <button
            type="submit"
            disabled={dusunuyor || !girdi.trim()}
            className="grid place-items-center rounded-[12px] text-white shrink-0 transition-opacity disabled:opacity-40"
            style={{ width: 36, height: 36, background: Z.lavGrad }}
            aria-label="Gönder"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="mt-[7px] text-center text-[10.5px] text-slate-400">
          Ali yalnız panel verisiyle konuşur · rakamlar kaynaktan gelir
        </p>
      </div>
    </div>
  )
}

// ── Boş durum: kısa selam + 3 örnek soru chip'i ───────────────────────────────
function BosDurum({ onSec }: { onSec: (s: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-[10px]">
      <div style={{ width: 62, height: 62, borderRadius: '50%', background: Z.lavGrad, padding: 3 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
          <Image src="/ali-avatar.png" alt="Ali" width={56} height={56} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
      <p className="mt-[12px] text-[15px] font-black" style={{ color: Z.text }}>Ali ile sohbet</p>
      <p className="mt-[4px] text-[12.5px] leading-[18px] text-slate-500 max-w-[300px]">
        Stoğu, kampanyaları ve müşteri eşleştirmelerini birlikte konuşalım. Şununla başlayabilirsin:
      </p>
      <div className="mt-[16px] w-full max-w-[320px] space-y-[8px]">
        {DEMO_CHIPS.map(s => (
          <button
            key={s}
            onClick={() => onSec(s)}
            className="w-full flex items-center gap-[9px] text-left rounded-[14px] px-[13px] py-[10px] text-[12.5px] font-semibold transition-colors hover:bg-white"
            style={{ background: Z.lavSoft, color: '#4b3fa8', border: `1px solid ${Z.line}` }}
          >
            <Sparkles size={14} className="shrink-0" style={{ color: Z.lavanta }} />
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Mesaj balonu ──────────────────────────────────────────────────────────────
function Balon({ mesaj }: { mesaj: Mesaj }) {
  const ben = mesaj.rol === 'kullanici'
  return (
    <div className={`flex ${ben ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[86%] rounded-[16px] px-[13px] py-[10px] text-[13.5px] leading-[20px] whitespace-pre-line"
        style={ben
          ? { background: Z.lavGrad, color: '#fff', borderBottomRightRadius: 6 }
          : { background: mesaj.fallback ? '#FEF3F0' : Z.surface, color: mesaj.fallback ? '#9a3a26' : '#28332c', border: `1px solid ${Z.line}`, borderBottomLeftRadius: 6 }
        }
      >
        {mesaj.metin}
        {mesaj.yaziliyor && <span className="ml-[2px] inline-block animate-pulse">▍</span>}
      </div>
    </div>
  )
}

// ── "Ali düşünüyor…" durumu ───────────────────────────────────────────────────
function Dusunuyor() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-[8px] rounded-[16px] px-[13px] py-[10px]"
        style={{ background: Z.surface, border: `1px solid ${Z.line}`, borderBottomLeftRadius: 6 }}>
        <span className="text-[12.5px] font-semibold" style={{ color: '#6b6480' }}>Ali düşünüyor</span>
        <span className="flex gap-[3px]">
          {[0, 1, 2].map(i => (
            <span key={i} className="inline-block rounded-full animate-bounce"
              style={{ width: 5, height: 5, background: Z.lavanta, animationDelay: `${i * 120}ms` }} />
          ))}
        </span>
      </div>
    </div>
  )
}
