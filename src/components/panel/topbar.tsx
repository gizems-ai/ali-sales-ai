import { currentUser } from '@clerk/nextjs/server'
import { UserButtonClient } from './user-button-client'
import { Bell } from 'lucide-react'
import { SearchBar } from './search-bar'
import { getTenantConfigFromRequest } from '@/lib/yetki'

function getTurkishDate() {
  return new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Günaydın', emoji: '🌞' }
  if (h < 18) return { text: 'İyi günler', emoji: '☀️' }
  return { text: 'İyi akşamlar', emoji: '🌙' }
}

export async function Topbar() {
  const [user, cfg] = await Promise.all([currentUser(), getTenantConfigFromRequest()])
  const firstName = user?.firstName ?? 'hoş geldin'
  const { text, emoji } = getGreeting()
  const isEmlak = cfg?.id === 'emlak_demo'

  if (isEmlak) {
    const initials = (
      ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || 'GB'
    )
    return (
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        padding: '18px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        // Frosted glass — sticky'ken altından kayan içerik bulanıklaşır, selamlama okunur kalır
        background: 'rgba(247, 246, 251, .72)',
        backdropFilter: 'blur(22px) saturate(165%)',
        WebkitBackdropFilter: 'blur(22px) saturate(165%)',
        borderBottom: '1px solid rgba(255,255,255,.6)',
      }}>
        {/* Greeting */}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', margin: 0, color: '#1c2a22' }}>
            {text}, {firstName} {emoji}
          </h1>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: '#57655b', margin: '2px 0 0' }}>
            {getTurkishDate()}
          </p>
        </div>

        {/* Search */}
        <div style={{ marginLeft: 'auto', position: 'relative', width: 300, maxWidth: '32vw' }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="1.8"
            strokeLinecap="round"
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 17,
              height: 17,
              stroke: '#8b988f',
              pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <input
            type="text"
            placeholder="Müşteri, portföy veya fırsat ara…"
            style={{
              width: '100%',
              border: '1px solid rgba(255,255,255,.72)',
              background: 'rgba(255,255,255,.55)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRadius: 13,
              padding: '12px 14px 12px 40px',
              fontFamily: 'inherit',
              fontSize: 13.5,
              color: '#1c2a22',
              boxShadow: '0 1px 3px rgba(40,60,45,.04),0 12px 26px -18px rgba(40,70,50,.22)',
              outline: 'none',
            }}
          />
        </div>

        {/* Bell button */}
        <button
          aria-label="Bildirimler"
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            border: '1px solid rgba(255,255,255,.72)',
            background: 'rgba(255,255,255,.55)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            position: 'relative',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(40,60,45,.04),0 12px 26px -18px rgba(40,70,50,.22)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ width: 19, height: 19, stroke: '#57655b' }}>
            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
            <path d="M10 19a2 2 0 0 0 4 0" />
          </svg>
          <span style={{
            position: 'absolute',
            top: 9,
            right: 10,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#d9572a',
            boxShadow: '0 0 0 2px #fff',
          }} />
        </button>

        {/* Avatar button */}
        <button
          aria-label="Profil"
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: 'linear-gradient(135deg,#7fd49a,#5aa9c4)',
            flexShrink: 0,
            cursor: 'pointer',
            border: '2px solid #fff',
            boxShadow: '0 6px 14px -8px rgba(40,80,50,.5)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        >
          {initials}
        </button>
      </header>
    )
  }

  return (
    <header className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-100 shrink-0">
      {/* Sol: selam */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          {text}, {firstName}. <span>{emoji}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{getTurkishDate()}</p>
      </div>

      {/* Orta: arama */}
      <SearchBar />

      {/* Sağ: eylemler */}
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors">
          <Bell size={17} />
        </button>

        <UserButtonClient />
      </div>
    </header>
  )
}
