'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function signIn(formData: FormData) {
  console.log("ALİ: Giriş denemesi başladı...")
  
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '').trim()

  if (!email || !password) {
    return { ok: false, message: 'Email ve şifre gerekli' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ 
    email, 
    password 
  })

  if (error) {
    console.error("ALİ: Hata aldım!", error.message)
    return { ok: false, message: error.message }
  }

  console.log("ALİ: Giriş başarılı!")
  revalidatePath('/', 'layout')
  
  return { ok: true, redirect: '/dashboard' }
}

export async function signUp(formData: FormData) {
  const adSoyad = String(formData.get('adSoyad') ?? '').trim()
  const sirket = String(formData.get('sirket') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '').trim()

  if (!email || !password || !adSoyad) {
    return { ok: false, message: 'Tüm alanları doldurun' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: adSoyad,
        company_name: sirket,
      },
    },
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath('/', 'layout')
  return { ok: true, redirect: '/onboarding' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return { ok: true, redirect: '/login' }
}