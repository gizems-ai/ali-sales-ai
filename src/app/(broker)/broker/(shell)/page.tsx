import Link from 'next/link'
import { Flame, Coins, Megaphone, Calendar, ArrowRight } from 'lucide-react'
import { TIER_LABEL } from '@/lib/broker/types'
import {
  getAktifBroker,
  bugunOzet,
  getEnYakinEtkinlik,
  etkinlikGeriSayim,
} from '@/lib/broker/fixtures'

const trTarih = new Intl.DateTimeFormat('tr-TR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const trGunAy = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' })

export default function BrokerAnaSayfa() {
  const now = new Date()
  const broker = getAktifBroker()
  const ozet = bugunOzet(broker, now)
  const event = getEnYakinEtkinlik()
  const adYalin = broker.name.split(' ')[0]
  const eyebrow = `${trTarih.format(now)} · ${TIER_LABEL[broker.tier]} Partner`

  const gunKaldi = event ? etkinlikGeriSayim(event.date, now) : null

  return (
    <>
      <div className="hero">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>
            Merhaba {adYalin}, <em>bugün satmak kolay.</em>
          </h1>
          <p>
            Sana ayrılmış stoklar, komisyon durumun ve yeni kampanyalar tek
            ekranda.
          </p>
        </div>
      </div>

      <div className="today">
        <Link href="/broker/stoklar" className="tcard hot">
          <div className="ich">
            <Flame className="ic" />
          </div>
          <span className="n">{ozet.avantajliStok}</span>
          <span className="l">avantajlı stok — sana uygun</span>
          <span className="go">
            Stoklara git <ArrowRight className="ic" style={{ width: 13, height: 13 }} />
          </span>
        </Link>

        <Link href="/broker/komisyonlar" className="tcard money">
          <div className="ich">
            <Coins className="ic" />
          </div>
          <span className="n">{ozet.aktifKomisyon}</span>
          <span className="l">komisyon ödemen yolda</span>
          <span className="go">
            Durumu gör <ArrowRight className="ic" style={{ width: 13, height: 13 }} />
          </span>
        </Link>

        <Link href="/broker/kampanyalar" className="tcard camp">
          <div className="ich">
            <Megaphone className="ic" />
          </div>
          <span className="n">{ozet.aktifKampanya}</span>
          <span className="l">yeni kampanya bu hafta</span>
          <span className="go">
            Kampanyalar <ArrowRight className="ic" style={{ width: 13, height: 13 }} />
          </span>
        </Link>

        {event && (
          <Link href="/broker/etkinlikler" className="tcard event">
            <div className="ich">
              <Calendar className="ic" />
            </div>
            <span className="l">
              {trGunAy.format(new Date(event.date))} · Lagoon
            </span>
            <span className="n">
              Broker Lansmanı
              <br />
              {gunKaldi !== null && gunKaldi >= 0
                ? `${gunKaldi} gün kaldı`
                : 'bugün'}
            </span>
            <span className="go">
              Yerini ayırt <ArrowRight className="ic" style={{ width: 13, height: 13 }} />
            </span>
          </Link>
        )}
      </div>
    </>
  )
}
