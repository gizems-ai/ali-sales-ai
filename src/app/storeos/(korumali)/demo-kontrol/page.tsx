// ════════════════════════════════════════════════════════════════════════════
//  /storeos/demo-kontrol — sunum kokpiti (YALNIZ YÖNETİCİ)
//
//  Kapı iki kez tutulur: burada (sayfa hiç çizilmesin) ve `/api/storeos/demo`
//  içinde (asıl kapı). Sayfa kontrolü kullanıcı deneyimi içindir; güvenliği
//  uç nokta sağlar — "linki bilmeyen giremez" bir güvenlik modeli değildir.
//
//  Yönetici tanımı `yonetim-kimlik.ts`te: STOREOS_ADMIN_CLERK_IDS listesi,
//  liste boşsa `Kullanicilar.Rol = 'merkez'`.
// ════════════════════════════════════════════════════════════════════════════

import { auth } from '@clerk/nextjs/server'
import { DemoKontrol } from '@/components/storeos/demo-kontrol'
import { Kabuk } from '@/components/storeos/kabuk'
import { Kart } from '@/components/storeos/temel'
import { depoHazir } from '@/lib/storeos/hazirlik'
import { yoneticiOturumuMu } from '@/lib/storeos/yonetim-kimlik'

export const dynamic = 'force-dynamic'

export default async function DemoKontrolSayfasi() {
  const { userId } = await auth()
  const yonetici = await yoneticiOturumuMu(await depoHazir(), userId)

  if (!yonetici) {
    return (
      <Kabuk aktif="/storeos/demo-kontrol">
        <header className="so-ust"><h1>Demo kontrol</h1></header>
        <div className="so-govde">
          <Kart baslik="Bu ekran yöneticilere açık">
            <p className="so-altbilgi">
              Demo kontrol paneli senaryo tetikler, tohum yazar ve WhatsApp yanıtı simüle eder —
              yani sistemi oynatır. Görüntüleme yetkisi yeterli değildir. Erişim için Store OS
              kullanıcınızın yönetici listesinde olması gerekir.
            </p>
          </Kart>
        </div>
      </Kabuk>
    )
  }

  return <DemoKontrol />
}
