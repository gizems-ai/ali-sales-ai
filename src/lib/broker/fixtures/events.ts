import type { PartnerEvent } from '../types'

// Etkinlikler (brief §5.7). Lagoon lansmanı — sahaya çıkış anı (18 Temmuz).
export const EVENTS: PartnerEvent[] = [
  {
    id: 'evt_lagoon_lansman',
    title: 'Lagoon Broker Lansmanı',
    date: '2026-07-18T14:00:00+03:00',
    timeLabel: '14:00',
    venue: 'Lagoon Satış Ofisi, Beylikdüzü',
    capacityNote: '~100 acente · 500 broker',
    rsvpOpen: true,
    eyebrow: 'Etkinlik · Kayıt açık',
    body: 'Yeni dönemin stok avantajları, kademe programı ve lansmana özel komisyon koşulları ilk kez açıklanıyor. Platform kaydını etkinlikte QR ile tamamla, Silver kademesiyle başla.',
  },
]

export function getEnYakinEtkinlik(): PartnerEvent | null {
  return EVENTS.length ? EVENTS[0] : null
}
