import { Gem, Zap, Gift } from 'lucide-react'
import { listCampaigns } from '@/lib/broker/store'
import { CopyButton } from './_components/copy-button'

// Kampanya kartı görsel varyantları (mockup c1/c2/c3) — sırayla döner.
const VARIANTS = [
  { cls: 'c1', icon: Gem },
  { cls: 'c2', icon: Zap },
  { cls: 'c3', icon: Gift },
]

export default function Kampanyalar() {
  const campaigns = listCampaigns()

  return (
    <section id="kampanya">
      <div className="sec-head">
        <h2>
          <span className="dot" style={{ background: 'var(--lav)' }} />
          Kampanyalar
        </h2>
      </div>
      <p className="sec-note">
        Her kampanyanın altında “kime uygun” yazar; hazır mesajı kopyala,
        müşterine gönder.
      </p>

      <div className="camps">
        {campaigns.map((c, i) => {
          const v = VARIANTS[i % VARIANTS.length]
          const Icon = v.icon
          return (
            <div className={`camp ${v.cls}`} key={c.id}>
              <div className="chead">
                <div className="cico">
                  <Icon className="ic" />
                </div>
                <div>
                  <div className="ck">{c.kind}</div>
                  <h3>{c.title}</h3>
                </div>
              </div>
              <p>{c.body}</p>
              <div className="who">{c.fitAudience}</div>
              <CopyButton text={c.readyMessage} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
