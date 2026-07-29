import 'server-only'
import { cookies } from 'next/headers'
import { LANG_COOKIE, LOCALE_MAP, normalizeLang, type Lang } from './config'
import { translate } from './dictionary'

// Server component'lerde aktif dili cookie'den okur.
export async function getLang(): Promise<Lang> {
  const store = await cookies()
  return normalizeLang(store.get(LANG_COOKIE)?.value)
}

// Server component'ler için { lang, locale, t } döndürür.
export async function getServerT(): Promise<{
  lang: Lang
  locale: string
  t: (key: string) => string
}> {
  const lang = await getLang()
  return {
    lang,
    locale: LOCALE_MAP[lang],
    t: (key: string) => translate(lang, key),
  }
}
