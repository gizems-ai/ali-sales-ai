'use client'

import { useState } from 'react'
import { X, MessageCircle, Copy, Check, Info } from 'lucide-react'
import { Z } from '@/lib/ali-zeka'

export type TaslakTuru = 'whatsapp' | 'strateji' | 'kadans'

export interface TaslakIcerik {
  tur: TaslakTuru
  baslik: string
  alici?: string
  govde: string
  adimlar?: string[]   // kadans için
}

const TUR_META: Record<TaslakTuru, { etiket: string; renk: string }> = {
  whatsapp: { etiket: 'WhatsApp taslağı', renk: '#25D366' },
  strateji: { etiket: 'Konuşma stratejisi', renk: Z.lavanta },
  kadans:   { etiket: 'Takip kadansı', renk: Z.green2 },
}

export function TaslakModal({ icerik, onClose }: { icerik: TaslakIcerik; onClose: () => void }) {
  const [kopyalandi, setKopyalandi] = useState(false)
  const meta = TUR_META[icerik.tur]

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(icerik.govde)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 1600)
    } catch { /* clipboard yoksa sessiz geç */ }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(20,30,25,.38)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-[22px] bg-white shadow-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,.72)' }}
      >
        {/* Başlık şeridi */}
        <div className="flex items-center justify-between px-[18px] py-[14px]" style={{ borderBottom: `1px solid ${Z.line}` }}>
          <div className="flex items-center gap-[9px]">
            <span className="grid place-items-center rounded-full text-white" style={{ width: 28, height: 28, background: meta.renk }}>
              {icerik.tur === 'whatsapp' ? <MessageCircle size={15} /> : <Info size={15} />}
            </span>
            <div>
              <p className="text-[13px] font-black" style={{ color: Z.text }}>{meta.etiket}</p>
              {icerik.alici && <p className="text-[11px] text-slate-400">{icerik.alici}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="px-[18px] py-[16px]">
          <p className="text-[12px] font-bold mb-[8px]" style={{ color: Z.text }}>{icerik.baslik}</p>

          {icerik.adimlar ? (
            <ol className="space-y-[8px]">
              {icerik.adimlar.map((a, i) => (
                <li key={i} className="flex items-start gap-[9px] text-[13px] leading-[19px]" style={{ color: '#3a4a40' }}>
                  <span className="grid place-items-center rounded-full text-white text-[11px] font-black shrink-0"
                    style={{ width: 20, height: 20, background: Z.lavGrad }}>{i + 1}</span>
                  {a}
                </li>
              ))}
            </ol>
          ) : (
            <div
              className="rounded-[14px] p-[13px] text-[13px] leading-[20px] whitespace-pre-line"
              style={{ background: Z.surface, color: '#28332c', border: `1px solid ${Z.line}` }}
            >
              {icerik.govde}
            </div>
          )}

          {/* Dürüst dil + readOnly notu */}
          <div className="mt-[12px] flex items-start gap-[8px] rounded-[12px] px-[12px] py-[9px] text-[11px] leading-[16px]"
            style={{ background: Z.lavSoft, color: '#5b51a8' }}>
            <Info size={13} className="shrink-0 mt-[1px]" />
            <span>Ali bu taslağı <b>önerir</b>; gönderen sensin. Onayla, düzenle ve kendi sesinle yolla — geri bildirimin Ali&apos;yi zamanla keskinleştirecek.</span>
          </div>

          {!icerik.adimlar && (
            <button
              onClick={kopyala}
              className="mt-[12px] w-full flex items-center justify-center gap-[7px] h-[40px] rounded-[12px] text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: kopyalandi ? Z.green2 : meta.renk }}
            >
              {kopyalandi ? <><Check size={15} /> Kopyalandı</> : <><Copy size={15} /> Taslağı kopyala</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
