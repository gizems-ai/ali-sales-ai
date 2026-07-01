import { Lock } from 'lucide-react'
import { Z, SECTION_NAME } from '@/lib/kampanya'

// Kampanya Motoru Kurumsal-only. Bireysel modda kart yerine yönlendirme.
export function KurumsalGate() {
  return (
    <div className="max-w-3xl mx-auto" style={{ padding: '24px 32px 48px' }}>
      <div className="rounded-[22px] p-[24px] text-center" style={{ background: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.72)' }}>
        <div className="grid place-items-center rounded-[15px] text-white mx-auto" style={{ width: 48, height: 48, background: Z.lavGrad }}>
          <Lock size={22} />
        </div>
        <h1 className="mt-[14px] text-[19px] font-black" style={{ color: Z.text }}>{SECTION_NAME} · Kurumsal</h1>
        <p className="mt-[8px] text-[13px] leading-[20px] text-slate-500">
          Bu modül yalnızca <b>Kurumsal</b> görünümde açılır. Sol üstteki geçiş anahtarından
          <b> Kurumsal</b> moduna geçerek kampanya önerilerini görüntüleyebilirsiniz.
        </p>
      </div>
    </div>
  )
}
