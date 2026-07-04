import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getAktifBroker, visibleHighlights } from '@/lib/broker/fixtures'
import { getUnit, UNIT_COUNT } from '@/lib/broker/stok'
import { StokList, type StokItem } from './_components/stok-list'

export default function AvantajliStoklar() {
  const broker = getAktifBroker()

  // Kademe görünürlüğü + gerçek ünite çözümü. Ünitesi bulunamayan highlight elenir.
  const items: StokItem[] = visibleHighlights(broker.tier)
    .map((highlight) => {
      const unit = getUnit(highlight.unitRef)
      return unit ? { highlight, unit } : null
    })
    .filter((x): x is StokItem => x !== null)

  return (
    <section id="stok">
      <div className="sec-head">
        <h2>
          <span className="dot" style={{ background: 'var(--coral)' }} />
          Avantajlı Stoklar
        </h2>
        <Link href="/broker/stoklar/tumu">
          Tüm stokları gör ({UNIT_COUNT} ünite){' '}
          <ArrowRight className="ic" style={{ width: 13, height: 13 }} />
        </Link>
      </div>
      <p className="sec-note">
        Bu hafta öne çıkan üniteler — neden avantajlı olduğu, neden bugün
        satılacağı ve hangi müşteriye uyduğu birlikte.
      </p>
      <StokList items={items} broker={broker} />
    </section>
  )
}
