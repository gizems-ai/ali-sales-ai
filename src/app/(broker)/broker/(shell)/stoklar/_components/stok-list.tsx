'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Clock, MessageCircle } from 'lucide-react'
import type { Broker, StockFilter, StockHighlight } from '@/lib/broker/types'
import { formatUSD, type BrokerUnit } from '@/lib/broker/stok'

export interface StokItem {
  highlight: StockHighlight
  unit: BrokerUnit
}

const FILTRELER: { key: StockFilter; label: string }[] = [
  { key: 'vatandaslik', label: 'Vatandaşlık' },
  { key: 'yatirim', label: 'Yatırım' },
  { key: 'aile', label: 'Aile' },
  { key: 'premium', label: 'Premium' },
  { key: 'ofis', label: 'Ofis' },
  { key: 'otel', label: 'Otel konsepti' },
]

const THUMB: Record<string, 'lagoon' | 'central' | 'port'> = {
  Lagoon: 'lagoon',
  Central: 'central',
  'Port Royal': 'port',
  Premium: 'port',
}
const SLUG: Record<string, string> = {
  Lagoon: 'lagoon',
  Central: 'central',
  'Port Royal': 'port-royal',
}

function unitTitle(u: BrokerUnit): string {
  return `${u.blok}-${u.daireNo} · ${u.tip} · ${Math.round(u.brutM2)} m²`
}

function waMessage(item: StokItem, broker: Broker): string {
  const { highlight: h, unit: u } = item
  const satirlar = [
    `${u.proje} · ${unitTitle(u)}`,
    ...h.whyAdvantaged.slice(0, 3).map((w) => `✓ ${w}`),
    `Fiyat: ${formatUSD(u.fiyatUSD)}`,
    '',
    `${broker.name} · ${broker.agency}`,
  ]
  return satirlar.join('\n')
}

export function StokList({
  items,
  broker,
}: {
  items: StokItem[]
  broker: Broker
}) {
  const [aktif, setAktif] = useState<StockFilter | 'all'>('all')

  const gorunen = useMemo(
    () =>
      aktif === 'all'
        ? items
        : items.filter((it) => it.highlight.filters.includes(aktif)),
    [items, aktif],
  )

  return (
    <>
      <div className="chips">
        <span
          className={aktif === 'all' ? 'chip on' : 'chip'}
          onClick={() => setAktif('all')}
        >
          Tümü
        </span>
        {FILTRELER.map((f) => (
          <span
            key={f.key}
            className={aktif === f.key ? 'chip on' : 'chip'}
            onClick={() => setAktif(f.key)}
          >
            {f.label}
          </span>
        ))}
      </div>

      <div className="stocks">
        {gorunen.map((it) => {
          const { highlight: h, unit: u } = it
          const waHref = `https://wa.me/?text=${encodeURIComponent(waMessage(it, broker))}`
          const slug = SLUG[u.proje]
          return (
            <div className="stock" key={h.id}>
              <div className={`thumb ${THUMB[u.proje] ?? 'central'}`}>
                <span className="pl">{u.proje}</span>
                {h.badge === 'hot' && <span className="fire">🔥 Bu hafta</span>}
                {h.badge === 'premium' && (
                  <span className="fire" style={{ color: 'var(--gold-deep)' }}>
                    Premium
                  </span>
                )}
              </div>
              <div className="sbody">
                <h3>{unitTitle(u)}</h3>
                <div className="price">
                  {formatUSD(u.fiyatUSD)} <span>liste fiyatı</span>
                </div>
                <div className="why">
                  {h.whyAdvantaged.slice(0, 3).map((w, i) => (
                    <div key={i}>
                      <Check className="ic" />
                      {w}
                    </div>
                  ))}
                </div>
                {h.whyToday && (
                  <div className="urg">
                    <Clock className="ic" />
                    <span>
                      <b>Neden bugün:</b> {h.whyToday}
                    </span>
                  </div>
                )}
                <div className="fit">{h.fitAudience}</div>
                <div className="acts">
                  <a
                    className="btn wa"
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="ic" />
                    WhatsApp&apos;ta paylaş
                  </a>
                  {slug ? (
                    <Link className="btn" href={`/broker/projeler/${slug}`}>
                      Detay
                    </Link>
                  ) : (
                    <span className="btn" style={{ opacity: 0.5 }}>
                      Detay
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
