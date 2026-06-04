import { currentUser } from '@clerk/nextjs/server'
import { UserButtonClient } from './user-button-client'
import { Bell } from 'lucide-react'
import { SearchBar } from './search-bar'

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
  const user = await currentUser()
  const firstName = user?.firstName ?? 'hoş geldin'
  const { text, emoji } = getGreeting()

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
