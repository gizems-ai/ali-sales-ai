// ════════════════════════════════════════════════════════════════════════════
//  Store OS — sayfa `searchParams` yardımcısı.
//
//  Next `?q=a&q=b` geldiğinde dizi verir. Üç sayfa da aynı düzleştirmeyi
//  yapmak zorunda; üç kopya yerine tek yer.
//
//  İLKİ kazanır (sonuncusu değil): kullanıcı bir bağlantıya kendi parametresini
//  eklediğinde bizim ürettiğimiz derin bağlantı önde olur ve ekran beklenen
//  kayda odaklanır.
// ════════════════════════════════════════════════════════════════════════════

export function tekDeger(x: string | string[] | undefined): string | null {
  if (Array.isArray(x)) return x[0] ?? null
  return x ?? null
}
