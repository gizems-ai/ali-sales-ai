import type { Campaign } from '../types'

// Kampanyalar (brief §5.5, Sprint 2). readyMessage: broker ağzından, admin düzenler.
export const CAMPAIGNS: Campaign[] = [
  {
    id: 'cmp_altin',
    kind: 'Varlık rotasyonu',
    title: 'Altınını Getir',
    body: 'Altın zirvedeyken kâr realize eden müşteri, birikimini kira getiren m²’ye çevirir. Ekspertiz ve takas süreci Babacan’da.',
    fitAudience: 'Kime uygun: birikimi altında duran Türk yatırımcı',
    readyMessage:
      'Merhaba, altın şu an zirvede. Birikiminizi kira getiren bir daireye çevirmek için Babacan’da ekspertiz ve takas sürecini sizin adınıza yönetiyorum. Uygun bir zamanda 10 dakika konuşalım mı?',
    activeFrom: '2026-06-25',
    activeTo: '2026-08-31',
  },
  {
    id: 'cmp_48saat',
    kind: 'Broker teşviki',
    title: '2 Günde Komisyon',
    body: 'Bu ay Lagoon avantajlı stok satışlarında komisyon, kapora sonrası 48 saatte hesabında.',
    fitAudience: 'Kime uygun: tüm partnerler · Lagoon stokları',
    readyMessage:
      'Bu ay Lagoon’da öne çıkan üniteler için özel bir koşul var: kapora sonrası komisyon 48 saatte ödeniyor. İlgilenen alıcınız varsa hemen ilerleyelim.',
    activeFrom: '2026-07-01',
    activeTo: '2026-07-31',
  },
  {
    id: 'cmp_iphone',
    kind: 'Dönem ödülü',
    title: 'iPhone 17 Pro Max',
    body: 'Temmuz–Ağustos döneminde 3 satışı tamamlayan her partnere. Gold+ partnerlerde 2 satışta kazanılır.',
    fitAudience: 'Kime uygun: dönem hedefi kovalayan partnerler',
    readyMessage:
      'Temmuz–Ağustos döneminde 3 satış tamamlayan partnerlere iPhone 17 Pro Max hediye. Hedefi birlikte yakalayalım — bu hafta gösterim ayarlayabileceğimiz alıcınız var mı?',
    activeFrom: '2026-07-01',
    activeTo: '2026-08-31',
  },
]
