// ════════════════════════════════════════════════════════════════════════════
//  Store OS — kabuk (yan menü + içerik alanı).
//
//  Panelin `src/components/sidebar.tsx` bileşeni BURAYA GİRMEZ (izolasyon
//  kuralı). İhtiyaç duyulan yapı kopyalanmadı, sıfırdan ve çok daha küçük
//  yazıldı: Store OS'in tenant/rol/menü mantığıyla işi yok.
//
//  Menüdeki gri satırlar henüz yazılmamış ekranlardır; tıklanabilir değil,
//  çünkü demoda var olmayan bir ekrana götüren link jüriye yalan söyler.
//  Gün 4'te Alarmlar · Görevler · Denetim kaydı bu listeden çıktı.
// ════════════════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react'

interface NavOgesi { ad: string; yol?: string; yakinda?: boolean }

const NAV: { baslik: string; ogeler: NavOgesi[] }[] = [
  {
    baslik: 'Operasyon',
    ogeler: [
      { ad: 'Pano', yol: '/storeos' },
      { ad: 'Alarmlar', yol: '/storeos/alarmlar' },
      { ad: 'Görevler', yol: '/storeos/gorevler' },
      { ad: 'Kameralar', yakinda: true },
    ],
  },
  {
    baslik: 'Yönetim',
    ogeler: [
      { ad: 'Kurallar', yakinda: true },
      { ad: 'Denetim kaydı', yol: '/storeos/denetim' },
      { ad: 'Mağazalar', yakinda: true },
    ],
  },
]

export function Kabuk({ children, aktif = '/storeos' }: { children: ReactNode; aktif?: string }) {
  return (
    <div className="so-kabuk">
      <nav className="so-yan" aria-label="Store OS menü">
        {/* Marka satırı brief'ten: "gratis × Ali CRM · Store Intelligence".
            Renkler burada DEĞİL, globals.css'teki `.storeos-root` bloğunda. */}
        <div className="so-logo">
          <div className="so-logo-ust">
            <span className="so-logo-gratis">gratis</span>
            <span className="so-logo-carpi" aria-hidden="true">×</span>
            <span className="so-logo-ali">Ali CRM</span>
          </div>
          <div className="so-logo-alt">Store Intelligence</div>
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
