'use client'

import { LANGS } from '@/lib/i18n/config'
import { useLanguage } from '@/lib/i18n/context'

// TR / EN dil değiştirici — cam (glass) ve düz iki stil destekler.
export function LanguageToggle({ variant = 'default' }: { variant?: 'default' | 'glass' }) {
  const { lang, setLang, t } = useLanguage()
  const glass = variant === 'glass'

  return (
    <div
      role="group"
      aria-label={t('lang.toggleAria')}
      style={{
        display: 'flex',
        gap: 2,
        padding: 3,
        borderRadius: glass ? 12 : 10,
        border: glass ? '1px solid rgba(255,255,255,.72)' : '1px solid #e7eaf2',
        background: glass ? 'rgba(255,255,255,.55)' : '#f5f6fa',
        flexShrink: 0,
      }}
    >
      {LANGS.map((l) => {
        const active = l === lang
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            style={{
              border: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              padding: '6px 9px',
              borderRadius: glass ? 9 : 7,
              transition: '.15s',
              ...(active
                ? {
                    background: glass ? '#1c2a22' : '#5B38E8',
                    color: '#fff',
                    boxShadow: glass
                      ? '0 8px 16px -10px rgba(20,40,25,.6)'
                      : '0 8px 16px -10px rgba(91,56,232,.6)',
                  }
                : { background: 'transparent', color: glass ? '#57655b' : '#6b7280' }),
            }}
          >
            {t(`lang.${l}`)}
          </button>
        )
      })}
    </div>
  )
}
