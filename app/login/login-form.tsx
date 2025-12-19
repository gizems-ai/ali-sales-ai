'use client'

import { useState } from 'react'
import { signIn } from '@/app/(auth)/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ALI = {
  accent: {
    cyan: '#06B6D4',
    blue: '#3B82F6',
  },
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn(formData)
      if (result?.error) {
        // Translate common errors to Turkish
        const errorMessage = result.error.toLowerCase()
        if (errorMessage.includes('invalid') || errorMessage.includes('credentials')) {
          setError('E-posta veya şifre hatalı')
        } else if (errorMessage.includes('email')) {
          setError('Geçersiz bir e-posta gir')
        } else if (errorMessage.includes('user') || errorMessage.includes('not found')) {
          setError('Bu hesap bulunamadı')
        } else {
          setError(result.error)
        }
      }
    } catch (err) {
      // Redirect throws, so this is expected
      // The redirect will happen automatically
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div 
          className="rounded-xl p-3 text-sm text-red-600 bg-red-50 border border-red-100"
        >
          {error}
        </div>
      )}
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
          autoComplete="current-password"
          disabled={isLoading}
          className="h-11"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${ALI.accent.cyan} 0%, ${ALI.accent.blue} 100%)`
        }}
      >
        {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
    </form>
  )
}


