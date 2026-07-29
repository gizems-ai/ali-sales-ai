'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_LANG, LANG_COOKIE, LOCALE_MAP, type Lang } from './config'
import { translate } from './dictionary'

interface LangContextValue {
  lang: Lang
  locale: string
  setLang: (next: Lang) => void
  t: (key: string) => string
}

const LangCtx = createContext<LangContextValue | null>(null)

export function LanguageProvider({
  lang: initialLang,
  children,
}: {
  lang: Lang
  children: React.ReactNode
}) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const router = useRouter()

  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return
      // 1 yıl kalıcı cookie — server component'ler bir sonraki render'da okur
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      setLangState(next)
      // Server component'leri (topbar, sayfalar) yeni cookie ile yeniden render et
      router.refresh()
    },
    [lang, router],
  )

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      locale: LOCALE_MAP[lang],
      setLang,
      t: (key: string) => translate(lang, key),
    }),
    [lang, setLang],
  )

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}

export function useLanguage(): LangContextValue {
  const ctx = useContext(LangCtx)
  if (!ctx) {
    // Provider dışında güvenli geri dönüş (varsayılan dil)
    return {
      lang: DEFAULT_LANG,
      locale: LOCALE_MAP[DEFAULT_LANG],
      setLang: () => {},
      t: (key: string) => translate(DEFAULT_LANG, key),
    }
  }
  return ctx
}

// Kısa yol: sadece çeviri fonksiyonu isteyen bileşenler için
export function useT(): (key: string) => string {
  return useLanguage().t
}
