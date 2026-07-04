'use client'

import { useState } from 'react'
import { MessageCircle, Check } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API yoksa fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button className="cbtn" onClick={copy} type="button">
      {copied ? (
        <>
          <Check className="ic" /> Kopyalandı
        </>
      ) : (
        <>
          <MessageCircle className="ic" /> Hazır mesajı kopyala
        </>
      )}
    </button>
  )
}
