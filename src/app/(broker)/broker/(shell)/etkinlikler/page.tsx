import { Check } from 'lucide-react'
import { EVENTS, getAktifBroker } from '@/lib/broker/fixtures'
import { hasRSVP } from '@/lib/broker/store'
import { rsvpAction } from './actions'

const trTarih = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export default function Etkinlikler() {
  const broker = getAktifBroker()

  return (
    <section id="etkinlik">
      <div className="sec-head">
        <h2>
          <span className="dot" style={{ background: 'var(--gold)' }} />
          Etkinlikler
        </h2>
      </div>
      <p className="sec-note">
        Babacan partner etkinlikleri ve lansmanlar. Yerini ayırt, salonda QR ile
        platform kaydını tamamla.
      </p>

      {EVENTS.map((event) => {
        const joined = hasRSVP(event.id, broker.id)
        return (
          <div className="eventbig" key={event.id} style={{ marginBottom: 16 }}>
            <div>
              <span className="ek">{event.eyebrow}</span>
              <h3>{event.title}</h3>
              <p>{event.body}</p>
              <div className="meta">
                <span>
                  {trTarih.format(new Date(event.date))} · {event.timeLabel}
                </span>
                <span>{event.venue}</span>
                <span>{event.capacityNote}</span>
              </div>
            </div>
            {joined ? (
              <button className="ebtn" disabled style={{ opacity: 0.9 }}>
                <Check className="ic" style={{ display: 'inline', verticalAlign: -3 }} />{' '}
                Yerini ayırdın
              </button>
            ) : (
              <form action={rsvpAction}>
                <input type="hidden" name="eventId" value={event.id} />
                <button className="ebtn" type="submit">
                  Yerini ayırt
                </button>
              </form>
            )}
          </div>
        )
      })}
    </section>
  )
}
