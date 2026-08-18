// ════════════════════════════════════════════════════════════════════════════
//  Store OS — GÖREV GEÇİŞ TABLOSU (saf)
//
//  `gorev.ts`ten AYRILDI ve tek satırı bile değişmedi. Sebep tek: Gün 8'de
//  görev ekranı durum değiştiren düğmeler kazandı ve tarayıcının "bu görevden
//  hangi düğmeler çıkar" sorusunu cevaplaması gerekiyor. `gorev.ts` depoyu,
//  denetimi ve `env`i import eder — onu bir istemci bileşenine sokmak sunucu
//  kodunu tarayıcı paketine taşırdı.
//
//  Bu dosya HİÇBİR ŞEY import etmez (tip hariç): saf tablo + saf sorgular.
//  `gorev.ts` buradan yeniden dışa aktarır; iki kopya YOKTUR, tek kaynak burası.
// ════════════════════════════════════════════════════════════════════════════

import type { GorevDurumu } from './tipler'

/**
 * Kaynak durum → izin verilen hedef durumlar.
 * Listede olmayan her geçiş REDDEDİLİR (whitelist, blacklist değil).
 */
export const GECISLER: Record<GorevDurumu, readonly GorevDurumu[]> = {
  yeni:          ['atandi', 'iptal', 'suresi_gecti'],
  atandi:        ['goruldu', 'basladi', 'reddedildi', 'atandi', 'iptal', 'suresi_gecti'],
  goruldu:       ['basladi', 'reddedildi', 'atandi', 'iptal', 'suresi_gecti'],
  basladi:       ['beklemede', 'onay_bekliyor', 'tamamlandi', 'iptal', 'suresi_gecti'],
  beklemede:     ['basladi', 'onay_bekliyor', 'tamamlandi', 'iptal', 'suresi_gecti'],
  onay_bekliyor: ['tamamlandi', 'reddedildi', 'basladi', 'iptal', 'suresi_gecti'],

  // ── Uç durumlar ──
  tamamlandi:    [],                     // nihai
  reddedildi:    ['atandi', 'iptal'],    // başkasına atanabilir
  suresi_gecti:  ['atandi', 'basladi', 'iptal', 'tamamlandi'],
  iptal:         [],                     // nihai
}

export const NIHAI_DURUMLAR: readonly GorevDurumu[] = ['tamamlandi', 'iptal']

export function nihaiMi(durum: GorevDurumu): boolean {
  return NIHAI_DURUMLAR.includes(durum)
}

export function gecisGecerliMi(kaynak: GorevDurumu, hedef: GorevDurumu): boolean {
  return (GECISLER[kaynak] ?? []).includes(hedef)
}

/** Geçiş reddedilirse insan-okur sebep. API 409 gövdesine bu yazılır. */
export function gecisSebebi(kaynak: GorevDurumu, hedef: GorevDurumu): string | null {
  if (gecisGecerliMi(kaynak, hedef)) return null
  if (kaynak === hedef) return `Görev zaten '${kaynak}' durumunda.`
  if (nihaiMi(kaynak)) return `'${kaynak}' nihai bir durum; görev artık değiştirilemez.`
  const izinli = GECISLER[kaynak] ?? []
  return `'${kaynak}' → '${hedef}' geçişine izin yok. İzin verilenler: ${izinli.join(', ') || '(yok)'}.`
}

// ─── Ekran eylemleri ─────────────────────────────────────────────────────────
//
// EKRAN, DURUM MAKİNESİNİN TAMAMINI GÖSTERMEZ. `GECISLER` 10 durum × ortalama
// 4 hedef = düğmeye çevrilirse okunamaz bir satır demektir. Buradaki liste
// bilinçli olarak DAR: bir mağaza çalışanının telefonda/panelde gerçekten
// yapacağı fiiller. Kalan geçişler (iptal, suresi_gecti, devretme) sistem,
// eskalasyon ya da API yoluyla olur — düğmesi yoktur.
//
// Kural: buradaki her hedef `GECISLER`de de olmalı. `gorev.test.ts` bunu
// doğrular; tabloyu daraltan biri sessizce ölü düğme bırakamaz.

export type EylemFiili = GorevDurumu | 'ertele'

export interface GorevEylemi {
  /** API gövdesindeki `hedef`. */
  hedef: EylemFiili
  etiket: string
  /** Ana eylem satırda vurgulanır; ikincil olanlar sade çizilir. */
  ana?: boolean
}

const ERTELE: GorevEylemi = { hedef: 'ertele', etiket: '5 dk ertele' }

const EYLEMLER: Record<GorevDurumu, GorevEylemi[]> = {
  yeni:          [{ hedef: 'atandi', etiket: 'Üstlen', ana: true }],
  atandi:        [{ hedef: 'basladi', etiket: 'Başla', ana: true }, { hedef: 'goruldu', etiket: 'Gördüm' }, ERTELE],
  goruldu:       [{ hedef: 'basladi', etiket: 'Başla', ana: true }, ERTELE],
  basladi:       [{ hedef: 'tamamlandi', etiket: 'Tamamla', ana: true }, { hedef: 'beklemede', etiket: 'Beklet' }],
  beklemede:     [{ hedef: 'basladi', etiket: 'Devam et', ana: true }, { hedef: 'tamamlandi', etiket: 'Tamamla' }],
  onay_bekliyor: [{ hedef: 'tamamlandi', etiket: 'Onayla', ana: true }, { hedef: 'reddedildi', etiket: 'Reddet' }],
  suresi_gecti:  [{ hedef: 'basladi', etiket: 'Başla', ana: true }, { hedef: 'tamamlandi', etiket: 'Tamamla' }],
  reddedildi:    [{ hedef: 'atandi', etiket: 'Yeniden ata', ana: true }],

  // Nihai durumlar — düğme yok. Gri düğme koymaktansa hiç koymamak (kabuktaki
  // "yakında" kuralının aynısı).
  tamamlandi:    [],
  iptal:         [],
}

export function gorevEylemleri(durum: GorevDurumu): readonly GorevEylemi[] {
  return EYLEMLER[durum] ?? []
}
