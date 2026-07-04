import { Shield, Star, Crown, Check } from 'lucide-react'
import type { BrokerTier } from '@/lib/broker/types'
import { getAktifBroker } from '@/lib/broker/fixtures'

const RANK: Record<BrokerTier, number> = { silver: 0, gold: 1, platinum: 2 }
const PLATINUM_HEDEF = 8

interface TierDef {
  tier: BrokerTier
  name: string
  th: string
  icon: React.ElementType
  cls?: string
  features: string[]
}

const TIERS: TierDef[] = [
  {
    tier: 'silver',
    name: 'Silver',
    th: 'Başlangıç kademesi',
    icon: Shield,
    features: [
      'Standart komisyon',
      'Proje Merkezi erişimi',
      'Kampanyalara katılım',
      'Etkinlik davetleri',
    ],
  },
  {
    tier: 'gold',
    name: 'Gold',
    th: 'Dönemde 3+ satış',
    icon: Star,
    cls: 'gold',
    features: [
      '+%0,5 komisyon avantajı',
      'Tahsisli avantajlı stoklar',
      'Ödüllerde hızlandırılmış koşul',
      'Özel destek hattı',
    ],
  },
  {
    tier: 'platinum',
    name: 'Platinum',
    th: 'Dönemde 8+ satış',
    icon: Crown,
    cls: 'plat',
    features: [
      '+%1 komisyon avantajı',
      'Ön satış günü — yeni projede ilk seçim',
      'Özel fiyat yetkisi (onaylı bant)',
      'Yönetimle çeyreklik buluşma',
    ],
  },
]

export default function BrokerClub() {
  const broker = getAktifBroker()
  const myRank = RANK[broker.tier]

  const platinum = broker.tier === 'platinum'
  const kalan = Math.max(0, PLATINUM_HEDEF - broker.periodSales)
  const yuzde = Math.min(100, (broker.periodSales / PLATINUM_HEDEF) * 100)

  return (
    <section id="club">
      <div className="sec-head">
        <h2>
          <span className="dot" style={{ background: 'var(--gold)' }} />
          Broker Club
        </h2>
      </div>
      <p className="sec-note">
        Kademe yükseldikçe ayrıcalık büyür: daha yüksek komisyon, tahsisli stok,
        ön satış günü.
      </p>

      <div className="club">
        {TIERS.map((t) => {
          const locked = RANK[t.tier] > myRank
          const classes = ['tiercard', t.cls, t.tier === broker.tier ? 'current' : '']
            .filter(Boolean)
            .join(' ')
          const Icon = t.icon
          return (
            <div className={classes} key={t.tier}>
              <div className="tico">
                <Icon className="ic" />
              </div>
              <h3>{t.name}</h3>
              <div className="th">{t.th}</div>
              <ul>
                {t.features.map((f, i) => (
                  <li className={locked ? 'lock' : undefined} key={i}>
                    <Check className="ic" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="progress">
        <b>Platinum’a ilerleme</b>
        <div className="pbar">
          <i style={{ width: `${yuzde}%` }} />
        </div>
        <span>
          {platinum
            ? `Platinum kademesindesin · ${broker.periodSales} satış`
            : `${broker.periodSales} / ${PLATINUM_HEDEF} satış — ${kalan} satış kaldı`}
        </span>
      </div>
    </section>
  )
}
