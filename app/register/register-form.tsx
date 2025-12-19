'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp } from '@/app/(auth)/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ALI = {
  accent: {
    cyan: '#06B6D4',
    blue: '#3B82F6',
  },
}

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await signUp(formData)

      if (result.ok && result.redirect) {
        router.push(result.redirect)
        router.refresh()
      } else {
        setError(result.message || 'Kayıt başarısız')
        setIsLoading(false)
      }
    } catch (err) {
      console.error(err)
      setError('Bir hata oluştu')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl p-3 text-sm text-red-600 bg-red-50 border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="adSoyad" className="text-gray-700">Ad Soyad</Label>
        <Input
          id="adSoyad"
          name="adSoyad"
          type="text"
          placeholder="Ahmet Yılmaz"
          required
          disabled={isLoading}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sirket" className="text-gray-700">Şirket Adı</Label>
        <Input
          id="sirket"
          name="sirket"
          type="text"
          placeholder="Şirket Adı"
          disabled={isLoading}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-700">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="ornek@email.com"
          required
          autoComplete="email"
          disabled={isLoading}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-700">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={6}
          autoComplete="new-password"
          disabled={isLoading}
          className="h-11"
        />
        <p className="text-xs text-gray-500">En az 6 karakter</p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${ALI.accent.cyan} 0%, ${ALI.accent.blue} 100%)`
        }}
      >
        {isLoading ? 'Kaydediliyor...' : 'Kaydol'}
      </button>
    </form>
  )
}

