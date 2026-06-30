import Image from 'next/image'

const GRAD = 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)'

export function AliReason({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-[10px] flex items-start gap-[10px] rounded-[12px] px-[12px] py-[10px] text-[12px] leading-[18px] text-slate-600"
      style={{ borderLeft: '3px solid #1B7A47', background: 'rgba(220,245,228,.55)' }}
    >
      <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', background: GRAD, padding: 2 }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
          <Image src="/ali-avatar.png" alt="Ali" width={24} height={24} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
      <div>
        <span className="font-black mr-[4px]" style={{ color: '#1B7A47' }}>Ali:</span>
        {children}
      </div>
    </div>
  )
}
