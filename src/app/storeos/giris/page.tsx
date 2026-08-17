// ════════════════════════════════════════════════════════════════════════════
//  /storeos/giris — Store OS'e ait giriş sayfası.
//
//  NEDEN AYRI BİR SAYFA:
//  src/app/layout.tsx:63'te `signInFallbackRedirectUrl="/"` sabit. Store OS
//  kullanıcısı /login'den girerse `/` hedeflenir → emlak tenant'ı çözülemez →
//  /login'e döner → sonsuz döngü. Buradaki `forceRedirectUrl` o değeri ezer.
//
//  `src/proxy.ts` içindeki isPublic listesine bu yol eklendi (onaylı istisna).
//  Sayfa Store OS host guard'ının DIŞINDA olmalı ki oturumsuz kullanıcı
//  giriş yapabilsin — bu yüzden /storeos/layout.tsx'in altında değil, kendi
//  minimal düzeniyle render olur.
// ════════════════════════════════════════════════════════════════════════════

import { SignIn } from '@clerk/nextjs'

export const metadata = {
  title: 'Store OS — Giriş',
  robots: { index: false, follow: false },
}

export default function StoreOsGirisSayfasi() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px 16px',
        background: 'linear-gradient(135deg, #f1ecff 0%, #ffffff 42%, #fff7d9 72%, #fdecec 100%)',
      }}
    >
      <div style={{ display: 'grid', gap: 24, justifyItems: 'center' }}>
        {/* Marka satırı panelin kabuğundakiyle aynı: gratis × Ali CRM.
            Bu sayfa `.storeos-root`un DIŞINDA render olur (host guard'dan önce),
            dolayısıyla --so-* değişkenleri burada tanımlı değil; renkler brief
            paletinden birebir yazılır. css-denetci.mjs bu dosyayı bu gerekçeyle
            beyaz listeye alır. */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center' }}>
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.035em', color: '#e5007d' }}>
              gratis
            </span>
            <span style={{ fontSize: 15, color: '#8a84a0' }}>×</span>
            <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.02em', color: '#241d3a' }}>
              Ali CRM
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 11.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6c43dc', fontWeight: 600 }}>
            Store Intelligence
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#5b5570' }}>
            Mağaza operasyon paneli
          </div>
        </div>

        {/* routing="hash" — /storeos/giris/[[...rest]] catch-all'ı gerektirmez,
            tek dosyada kalır. forceRedirectUrl root layout'un fallback'ini ezer. */}
        <SignIn
          routing="hash"
          forceRedirectUrl="/storeos"
          signUpUrl="/storeos/giris"
        />

        <p style={{ fontSize: 12, color: '#7a7490', maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
          Bu panel demo amaçlıdır. Görüntülenen operasyon verileri örnek veridir
          ve gerçek mağaza ölçümleriyle karıştırılmamalıdır.
        </p>
      </div>
    </div>
  )
}
