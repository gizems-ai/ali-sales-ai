import type { BrokerProject } from '../types'

// Proje Merkezi (brief §5.3). Lagoon tam grid; Central/Port Royal kısaltılmış.
// Materyal href varsa aktif, yoksa "yakında". Mevcut Babacan deck'leri
// (public/decks/…) Lagoon'dan linklenebilir. Broker materyalleri auth arkasında.
export const PROJECTS: BrokerProject[] = [
  {
    slug: 'lagoon',
    name: 'Lagoon',
    tagline: 'Lansman Projesi',
    summary: 'Beylikdüzü · 1.240 ünite · teslim 2027',
    thumb: 'lagoon',
    full: true,
    materials: [
      { kind: 'video', label: 'Tanıtım videosu' },
      { kind: 'sunum', label: 'Satış sunumu', href: '/decks/Babacan_Revenue_OS.html' },
      { kind: 'brosur', label: 'Broşür' },
      { kind: 'fiyat', label: 'Fiyat listesi' },
      { kind: 'odeme', label: 'Ödeme planı' },
      { kind: 'sss', label: 'Sık sorulanlar' },
      { kind: 'whatsapp', label: 'WhatsApp mesajı' },
      { kind: 'indir', label: 'Tümünü indir' },
    ],
  },
  {
    slug: 'central',
    name: 'Central',
    tagline: 'Satışta',
    summary: 'Merkezi yaşam · hazır teslim',
    thumb: 'central',
    full: false,
    materials: [
      { kind: 'sunum', label: 'Sunum' },
      { kind: 'fiyat', label: 'Fiyat' },
      { kind: 'whatsapp', label: 'WhatsApp' },
      { kind: 'indir', label: 'İndir' },
    ],
  },
  {
    slug: 'port-royal',
    name: 'Port Royal',
    tagline: 'Satışta',
    summary: 'Marina yaşamı · premium',
    thumb: 'port',
    full: false,
    materials: [
      { kind: 'sunum', label: 'Sunum' },
      { kind: 'fiyat', label: 'Fiyat' },
      { kind: 'whatsapp', label: 'WhatsApp' },
      { kind: 'indir', label: 'İndir' },
    ],
  },
]

export function getProject(slug: string): BrokerProject | null {
  return PROJECTS.find((p) => p.slug === slug) ?? null
}
