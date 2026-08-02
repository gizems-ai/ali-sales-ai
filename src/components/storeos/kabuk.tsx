// ════════════════════════════════════════════════════════════════════════════
//  Store OS — kabuk (yan menü + içerik alanı).
//
//  Panelin `src/components/sidebar.tsx` bileşeni BURAYA GİRMEZ (izolasyon
//  kuralı). İhtiyaç duyulan yapı kopyalanmadı, sıfırdan ve çok daha küçük
//  yazıldı: Store OS'in tenant/rol/menü mantığıyla işi yok.
//
//  Menüdeki gri satırlar Gün 4+ ekranlarıdır; tıklanabilir değil, çünkü
//  demoda var olmayan bir ekrana götüren link jüriye yalan söyler.
// ════════════════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react'

interface NavOgesi { ad: string; yol?: string; yakinda?: boolean }

const NAV: { baslik: string; ogeler: NavOgesi[] }[] = [
  {
    baslik: 'Operasyon',
    ogeler: [
      { ad: 'Pano', yol: '/storeos' },
      { ad: 'Alarmlar', yakinda: true },
      { ad: 'Görevler', yakinda: true },
      { ad: 'Kameralar', yakinda: true },
    ],
  },
  {
    baslik: 'Yönetim',
    ogeler: [
      { ad: 'Kurallar', yakinda: true },
      { ad: 'Denetim kaydı', yakinda: true },
      { ad: 'Mağazalar', yakinda: true },
    ],
  },
]

export function Kabuk({ children, aktif = '/storeos' }: { children: ReactNode; aktif?: string }) {
  return (
    <div className="so-kabuk">
      <nav className="so-yan" aria-label="Store OS menü">
        <div className="so-logo">
          <span className="so-logo-nokta" aria-hidden="true" />
          Store OS
        </div>
        {NAV.map(bolum => (
          <div key={bolum.baslik}>
            <div className="so-nav-baslik">{bolum.baslik}</div>
            {bolum.ogeler.map(o => (
              o.yol && !o.yakinda ? (
                <a
                  key={o.ad}
                  href={o.yol}
                  className="so-nav-oge"
                  aria-current={o.yol === aktif ? 'page' : undefined}
                >
                  {o.ad}
                </a>
              ) : (
                <span key={o.ad} className="so-nav-oge" data-yakinda="1" aria-disabled="true">
                  {o.ad}
                  <span className="so-rozet so-notr">yakında</span>
                </span>
              )
            ))}
          </div>
        ))}
      </nav>
      <main className="so-ana">{children}</main>
    </div>
  )
}
