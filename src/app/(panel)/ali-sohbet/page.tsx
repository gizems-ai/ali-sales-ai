import Image from 'next/image'
import { AliChat } from '@/components/ali-chat/ali-chat'

// Ali ile Sohbet — tam sayfa. Drawer ile AYNI sohbeti barındırır (AliChat).
export default function AliSohbetPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6D5BE0,#8c97d8)', padding: 3 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
            <Image src="/ali-avatar.png" alt="Ali" width={38} height={38} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">Ali ile Sohbet</h1>
          <p className="text-[12.5px] text-slate-500">Satış koçun · stok, kampanya ve müşteri eşleştirmesi</p>
        </div>
      </div>

      <div
        className="rounded-[22px] bg-white/90 overflow-hidden"
        style={{ border: '1px solid #E7EAF2', boxShadow: '0 24px 60px -40px rgba(40,40,90,.4)' }}
      >
        <AliChat variant="full" />
      </div>
    </div>
  )
}
