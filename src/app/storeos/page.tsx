// Gün 1 iskeleti. Gerçek Mağaza Özeti ekranı Gün 6-8'de buraya gelir.
import { eksikDegiskenler } from '@/lib/storeos/env'

export default function StoreOsAnaSayfa() {
  const eksik = eksikDegiskenler()

  return (
    <main style={{ padding: 32, fontFamily: 'var(--font-jakarta), system-ui', maxWidth: 760 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Gratis Store OS</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Gün 1 iskeleti ayakta. Mağaza Özeti ekranı Gün 6-8'de gelecek.
      </p>

      <section style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,.88)',
        border: '1px solid rgba(108,67,220,.08)',
        boxShadow: '0 8px 30px rgba(64,45,110,.08)',
        padding: 20,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Kurulum durumu</h2>
        {eksik.length === 0 ? (
          <p style={{ color: '#15803d', fontSize: 14 }}>Tüm zorunlu ortam değişkenleri tanımlı.</p>
        ) : (
          <>
            <p style={{ color: '#b45309', fontSize: 14, marginBottom: 8 }}>
              Eksik ortam değişkeni ({eksik.length}):
            </p>
            <ul style={{ fontSize: 13, fontFamily: 'var(--font-space-mono), monospace', color: '#7c2d12' }}>
              {eksik.map(a => <li key={a}>{a}</li>)}
            </ul>
          </>
        )}
      </section>
    </main>
  )
}
