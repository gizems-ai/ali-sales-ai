// ════════════════════════════════════════════════════════════════════════════
//  Store OS — kabuk (yan menü + içerik alanı).
//
//  Menünün kendisi `yan-menu.tsx`e taşındı (Gün 7): mağaza adını ve kullanıcı
//  rolünü göstermesi gerektiği için istemci bileşeni oldu. Kabuk sunucu
//  bileşeni olarak kaldı; tek işi ızgarayı kurmak ve mağaza bağlamını sarmak.
//
//  Bağlam sarmalayıcısı burada, çünkü menü ile pano kardeş: pano çektiği
//  mağazayı yayınlar, menü okur. Ekstra istek yok (bkz. `magaza-baglami.tsx`).
// ════════════════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react'
import { MagazaSaglayici } from './magaza-baglami'
import { YanMenu } from './yan-menu'
import { env } from '@/lib/storeos/env'
import { magazaKimligi } from '@/lib/storeos/depo/demo-metrikler'

export function Kabuk({ children, aktif = '/storeos' }: { children: ReactNode; aktif?: string }) {
  // Mağaza kimliği SUNUCUDA çözülüyor: menü ilk boyamada doğru adı yazsın,
  // panonun canlı verisini beklemek zorunda kalmasın (bkz. magaza-baglami).
  const tohum = magazaKimligi(env.magazaKodu)

  return (
    <MagazaSaglayici tohum={tohum}>
      <div className="so-kabuk">
        <YanMenu aktif={aktif} />
        <main className="so-ana">{children}</main>
      </div>
    </MagazaSaglayici>
  )
}
