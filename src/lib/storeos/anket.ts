// ════════════════════════════════════════════════════════════════════════════
//  Store OS — ANKET ARALIKLARI (tek kaynak)
//
//  Bu sayılar üç yerde birden kullanılıyordu ve kaymaya açıktı:
//    · `use-pano.ts` / `use-liste.ts` — tarayıcı gerçekten bu hızda ister
//    · `scripts/storeos/istek-butcesi.ts` — sürekli yükü bu hızlarla hesaplar
//    · runbook'taki tek-sekme kuralı — marjı bu hesaba dayandırır
//  Ölçümün beyan edilen aralıkla aynı olduğunu garanti eden tek şey burasıdır.
//
//  ── NEDEN BU DEĞERLER (18 Ağu 2026 ölçümü) ─────────────────────────────────
//  Airtable base başına ~5 istek/sn veriyor; `airtable.ts` kendini 4'te
//  sınırlıyor ve bu bütçe anket ile olay zinciri arasında PAYLAŞILIYOR.
//  Anket ne kadar hızlıysa zincire (olay → görev → WhatsApp) o kadar az kalır.
//
//  gorevler 10 sn → 3 sn: görev ekranı Gün 8'de yazma yolu kazandı. Butona
//  basan kişi sonucu görmek için 10 saniye bekleyemez; iyimser UI anında
//  gösterse bile sunucu gerçeğinin dönmesi 3 sn'yi geçmemeli. Bedeli ölçüldü
//  ve marj hâlâ pozitif (bkz. `scripts/storeos/olcum-prod.ts` çıktısı).
// ════════════════════════════════════════════════════════════════════════════

import type { Gorunum } from './liste/tipler'

/** Pano — iki kademeli anket (ms). */
export const PANO_ARALIK = { canli: 4_000, yavas: 30_000 } as const

/** Liste ekranları — görünüm başına tek kademe (ms). */
export const LISTE_ARALIK: Record<Gorunum, number> = {
  alarmlar: 5_000,
  // Yazma yolu olan tek ekran. Gerekçe dosya başlığında.
  gorevler: 3_000,
  denetim: 15_000,
}
