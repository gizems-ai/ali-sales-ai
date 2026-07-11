// ════════════════════════════════════════════════════════════════════════════
//  Ali Sohbet — demo soru seti
//  Yalnız retrieval'ın KESİN cevaplayabildiği sorular. Boş durum chip'leri buradan.
//  (Stok yaşı sorusu YOK — Faz 1 dışı.)
// ════════════════════════════════════════════════════════════════════════════

// Boş durumda gösterilen 3 hızlı başlangıç sorusu
export const DEMO_CHIPS: string[] = [
  'Lagoon\'da satılık 2+1 daireler neler?',
  'Şu an yayında olan kampanyalar hangileri?',
  'Karim Al-Rashid için hangi daireler uygun?',
]

// Kabul kriteri spot-check'i için 5 demo sorusu (her rakam kaynakta bulunmalı)
export const DEMO_SORULAR: string[] = [
  'Lagoon\'da satılık 2+1 daireler neler?',                 // stok: proje + tip + durum
  'Central\'da D grubu zor satılan stok ne durumda?',       // stok: proje + grup
  'Şu an yayında olan kampanyalar hangileri?',              // kampanya
  'Elimizde hangi müşteriler var?',                          // müşteri listesi (fixture)
  'Karim Al-Rashid için hangi daireler uygun?',            // eşleştirme (fixture motor)
]
