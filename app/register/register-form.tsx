'use client'

import { useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setIsLoading(true)

    // Validate required fields
    const fullName = formData.get('full_name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const companyName = formData.get('company_name') as string

    if (!fullName || !fullName.trim()) {
      setError('Ad Soyad zorunlu')
      setIsLoading(false)
      return
    }

    if (!email || !email.trim()) {
      setError('Geçerli bir e-posta gir')
      setIsLoading(false)
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Geçerli bir e-posta gir')
      setIsLoading(false)
      return
    }

    if (!password || password.length < 6) {
      setError('Şifre en az 6 karakter olmalı')
      setIsLoading(false)
      return
    }

    if (!companyName || !companyName.trim()) {
      setError('Şirket Adı zorunlu')
      setIsLoading(false)
      return
    }

    try {
      const result = await signUp(formData)
      if (result?.error) {
        // Translate common errors to Turkish
        const errorMessage = result.error.toLowerCase()
        if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
          setError('Bu e-posta adresi zaten kayıtlı')
        } else if (errorMessage.includes('email')) {
          setError('Geçerli bir e-posta gir')
        } else if (errorMessage.includes('password')) {
          setError('Şifre en az 6 karakter olmalı')
        } else {
          setError(result.error)
        }
      } else if (result?.requiresEmailConfirmation) {
        // Email confirmation is required
        setEmailSent(true)
      }
      // If no error and no email confirmation required, redirect will happen (throws)
    } catch (err) {
      // Redirect throws, so this is expected if user is logged in
      // The redirect will happen automatically
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-4">
        <div 
          className="rounded-xl p-4 text-sm bg-cyan-50 border border-cyan-100"
          style={{ color: ALI.accent.cyan }}
        >
          <p className="font-semibold mb-1">E-postanı doğrula</p>
          <p className="text-gray-700">
            Kayıt başarılı! Hesabınızı aktifleştirmek için e-posta adresinize gönderilen doğrulama linkine tıklayın.
          </p>
        </div>
      </div>
    )
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
        <Label htmlFor="full_name" className="text-gray-700">Ad Soyad</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Ahmet Yılmaz"
          required
          autoComplete="name"
          disabled={isLoading}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company_name" className="text-gray-700">Şirket Adı</Label>
        <Input
          id="company_name"
          name="company_name"
          type="text"
          placeholder="Şirket Adı"
          required
          autoComplete="organization"
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
          autoComplete="new-password"
          minLength={6}
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
        {isLoading ? 'Kayıt yapılıyor...' : 'Kaydol'}
      </button>
    </form>
  )
}


