import { Phone, MessageCircle, Clock } from 'lucide-react'
import { HeatDot } from './heat-dot'
import { AliReason } from './ali-reason'
import { type HamleItem } from '@/lib/emlak-fixtures'

const E = { green2: '#1B7A47', line: '#E7EAF2', text: '#071B3A' }

export function MoveCard({ item }: { item: HamleItem }) {
  const telHref = `tel:${item.tel}`
  const waHref  = `https://wa.me/90${item.tel.replace(/^0/, '').replace(/\s/g, '')}`

  return (
    <div
      className="rounded-[22px] border bg-white p-[16px] shadow-sm"
      style={{ borderColor: E.line }}
    >
      {/* Üst satır: ad + sıcaklık + asama */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-[8px] min-w-0">
          <HeatDot temp={item.sicaklik} />
          <p className="text-[14px] font-black truncate" style={{ color: E.text }}>{item.ad}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-[9px] py-[3px] text-[11px] font-bold text-white"
          style={{ background: item.sicaklik === 'hot' ? '#EF6B4F' : item.sicaklik === 'warm' ? '#F59E0B' : '#94A3B8' }}
        >
          {item.asama}
        </span>
      </div>

      {/* Meta */}
      <p className="mt-[4px] ml-[13px] text-[11px] text-slate-400">
        {item.tip} · {item.il}
      </p>

      {/* Ali gerekçe */}
      <AliReason>{item.aliGerekce}</AliReason>

      {/* Aksiyonlar */}
      <div className="mt-[12px] flex gap-[8px]">
        <a
          href={telHref}
          className="flex items-center gap-[6px] h-[34px] rounded-[10px] border px-[12px] text-[12px] font-bold transition-colors hover:bg-green-50"
          style={{ borderColor: E.green2, color: E.green2 }}
        >
          <Phone size={13} /> Ara
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-[6px] h-[34px] rounded-[10px] bg-[#25D366] px-[12px] text-[12px] font-bold text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle size={13} /> WhatsApp
        </a>
        <button
          className="ml-auto flex items-center gap-[5px] h-[34px] rounded-[10px] border px-[10px] text-[12px] font-medium text-slate-400 hover:bg-slate-50"
          style={{ borderColor: E.line }}
          title="Ertele"
        >
          <Clock size={12} /> Ertele
        </button>
      </div>
    </div>
  )
}
