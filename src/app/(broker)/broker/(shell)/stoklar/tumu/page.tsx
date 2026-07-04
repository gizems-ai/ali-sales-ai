import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { listUnits, formatUSD, formatTRY, UNIT_COUNT } from '@/lib/broker/stok'

// "Tüm stokları gör" — basit liste görünümü (brief §5.2). Tek kaynak: listUnits()
// → src/data/babacan-stok.ts. İkinci kopya oluşturulmaz.
export default function TumStoklar() {
  const units = listUnits()

  return (
    <section id="tum-stok">
      <div className="sec-head">
        <h2>
          <span className="dot" style={{ background: 'var(--navy)' }} />
          Tüm Stok · {UNIT_COUNT} ünite
        </h2>
        <Link href="/broker/stoklar">
          Avantajlı stoklara dön{' '}
          <ArrowRight className="ic" style={{ width: 13, height: 13 }} />
        </Link>
      </div>
      <p className="sec-note">
        Babacan portföyünün tamamı. Öne çıkan üniteler için Avantajlı Stoklar
        sayfasına dön.
      </p>

      <div
        style={{
          background: 'var(--card)',
          border: '1px solid rgba(255,255,255,.8)',
          borderRadius: 'var(--r)',
          boxShadow: 'var(--sh)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12.5,
              minWidth: 640,
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: 'left',
                  color: 'var(--faint)',
                  fontSize: 10.5,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                <th style={{ padding: '12px 16px', fontWeight: 800 }}>Proje</th>
                <th style={{ padding: '12px 16px', fontWeight: 800 }}>Ünite</th>
                <th style={{ padding: '12px 16px', fontWeight: 800 }}>Tip</th>
                <th style={{ padding: '12px 16px', fontWeight: 800 }}>m²</th>
                <th style={{ padding: '12px 16px', fontWeight: 800 }}>Durum</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>
                  Fiyat (USD)
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>
                  Fiyat (TL)
                </th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 700 }}>{u.proje}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--soft)' }}>
                    {u.blok}-{u.daireNo}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--soft)' }}>{u.tip}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--soft)' }}>
                    {Math.round(u.brutM2)}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--faint)', fontSize: 11 }}>
                    {u.durum}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: 'var(--green-deep)',
                    }}
                  >
                    {formatUSD(u.fiyatUSD)}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      color: 'var(--soft)',
                    }}
                  >
                    {formatTRY(u.fiyatTL)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
