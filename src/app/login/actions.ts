'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function signIn(formData: FormData) {
  // Clerk handles sign-in automatically
  // This is just a placeholder for form action
  return { ok: true }
}

export async function signUp(formData: FormData) {
  // Clerk handles sign-up automatically
  // This is just a placeholder for form action
  return { ok: true }
}

export async function signOut() {
  // Clerk handles sign-out
  revalidatePath('/', 'layout')
  return { ok: true, redirect: '/login' }
}