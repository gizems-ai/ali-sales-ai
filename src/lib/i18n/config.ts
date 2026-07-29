// ── i18n çekirdek yapılandırması ───────────────────────────────────
// Panel dili cookie tabanlı tutulur: server component'ler cookie'yi okur,
// client tarafı LanguageProvider + toggle cookie'yi yazıp router.refresh() yapar.

export const LANGS = ['tr', 'en'] as const
export type Lang = (typeof LANGS)[number]

export const DEFAULT_LANG: Lang = 'tr'
export const LANG_COOKIE = 'ali_lang'

// Tarih/sayı biçimleme için BCP-47 locale eşlemesi
export const LOCALE_MAP: Record<Lang, string> = {
  tr: 'tr-TR',
  en: 'en-US',
}

export function normalizeLang(value: string | undefined | null): Lang {
  return value === 'en' ? 'en' : 'tr'
}
