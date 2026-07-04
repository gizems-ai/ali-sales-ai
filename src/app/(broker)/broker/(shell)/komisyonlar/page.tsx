import { Check, MessageCircle } from 'lucide-react'
import type { CommissionStatus } from '@/lib/broker/types'
import { getAktifBroker } from '@/lib/broker/fixtures'
import {
  commissionsByBroker,
  COMMISSION_FLOW,
  SARPNET_LIVE,
} from '@/lib/broker/store'
import { formatTRY } from '@/lib/broker/stok'

const trTarih = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' })

const STEPS: { label: string; sys?: string }[] = [
  { label: 'Satış' },
  { label: 'Kapora geldi' },
  { label: 'Komisyon hak edildi' },
  { label: 'Finansta', sys: 'SARPNET' },
  { label: 'Ödeme tarihi' },
  { label: 'Ödendi' },
]

function stepClass(i: number, status: CommissionStatus): string {
  const cur = COMMISSION_FLOW.indexOf(status)
  if (i < cur) return 'step done'
  if (i === cur) return status === 'paid' ? 'step done' : 'step now'
  return 'step'
}

export default function Komisyonlar() {
  const broker = getAktifBroker()
  const komisyonlar = commissionsByBroker(broker.id)
  const aktif = komisyonlar.filter((c) => c.status !== 'paid')

  const bekleyen = aktif.reduce((t, c) => t + c.amountTRY, 0)
  const odemeTarihleri = aktif
    .map((c) => c.expectedPaymentDate)
    .filter((d): d is string => !!d)
    .sort()
  const enYakin = odemeTarihleri[0]

  return (
    <section id="komisyon">
      <div className="sec-head">
        <h2>
          <span className="dot" style={{ background: 'var(--green)' }} />
          Komisyonlarım
        </h2>
      </div>
      <p className="sec-note">
        Satıştan ödemeye kadar her adım şeffaf. Finans adımı SarpNet’ten beslenir.
      </p>

      <div className="ksum">
        <div>
          <div className="kn">{formatTRY(bekleyen)}</div>
          <div className="kl">Bekleyen komisyon</div>
        </div>
        <div className="div" />
        <div>
          <div className="kn" style={{ color: 'var(--ink)' }}>
            {aktif.length}
          </div>
          <div className="kl">Aktif süreç</div>
        </div>
        <div className="div" />
        <div>
          <div className="kn" style={{ color: 'var(--ink)' }}>
            {enYakin ? trTarih.format(new Date(enYakin)) : '—'}
          </div>
          <div className="kl">En yakın ödeme</div>
        </div>
        <span className={SARPNET_LIVE ? 'sarp' : 'sarp pending'}>
          <i>S</i>SarpNet · Finans{' '}
          <em>{SARPNET_LIVE ? 'canlı' : 'entegrasyon hazırlanıyor'}</em>
        </span>
      </div>

      <div className="kwrap">
        {komisyonlar.map((c) => (
          <div className="krow" key={c.id}>
            <div className="khead">
              <div className="kd">
                {c.unitLabel}
                <span>
                  Satış: {trTarih.format(new Date(c.saleDate))} · Müşteri:{' '}
                  {c.customerInitials}
                </span>
              </div>
              <div className="amt">
                {formatTRY(c.amountTRY)}
                <small>
                  {c.status === 'paid'
                    ? 'ödendi'
                    : c.expectedPaymentDate
                      ? `tahmini ödeme: ${trTarih.format(new Date(c.expectedPaymentDate))}`
                      : 'kapora bekleniyor'}
                </small>
              </div>
            </div>
            <div className="steps">
              {STEPS.map((s, i) => (
                <div className={stepClass(i, c.status)} key={i}>
                  <div className="b">
                    {stepClass(i, c.status).includes('done') && (
                      <Check className="ic" />
                    )}
                  </div>
                  <div className="sl">{s.label}</div>
                  {s.sys && <span className="sys">{s.sys}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {komisyonlar.length === 0 && (
          <div className="krow">
            <p className="sec-note" style={{ margin: 0 }}>
              Henüz komisyon süreci yok.
            </p>
          </div>
        )}
      </div>

      <div className="kfoot">
        <span className="kfl">
          <MessageCircle className="ic" />
          Durum değişince <b>&nbsp;WhatsApp bildirimi&nbsp;</b> alırsın — her gün
          kontrol etmene gerek yok.
        </span>
        <span>
          <b>SarpNet entegrasyonu</b> · Faz 2’de canlı
        </span>
      </div>
    </section>
  )
}
