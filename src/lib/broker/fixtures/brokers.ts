import type { Broker } from '../types'

// Faz 1 fixture broker'ları. QR onboarding ile eklenenler runtime store'a yazılır
// (bkz. lib/broker/store.ts); bunlar tohum kayıtlar.
export const BROKERS: Broker[] = [
  {
    id: 'brk_ahmet',
    name: 'Ahmet Yılmaz',
    agency: 'Yılmaz Gayrimenkul',
    phone: '+90 532 000 00 00',
    tier: 'gold',
    periodSales: 5,
  },
  {
    id: 'brk_selin',
    name: 'Selin Demir',
    agency: 'Demir Emlak',
    phone: '+90 533 000 00 00',
    tier: 'platinum',
    periodSales: 9,
  },
  {
    id: 'brk_kaan',
    name: 'Kaan Aksoy',
    agency: 'Aksoy Yatırım',
    phone: '+90 534 000 00 00',
    tier: 'silver',
    periodSales: 1,
  },
]

// Demo aktif broker (mockup: Ahmet Yılmaz · Yılmaz Gayrimenkul · GOLD).
// Faz 1'de sabit; Faz 2'de Clerk userId → Broker eşlemesi buraya bağlanır.
export const AKTIF_BROKER_ID = 'brk_ahmet'

export function getAktifBroker(): Broker {
  return BROKERS.find((b) => b.id === AKTIF_BROKER_ID) ?? BROKERS[0]
}
