import 'server-only'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Broker } from './types'
import { store } from './store'

// ════════════════════════════════════════════════════════════════════════════
//  Aktif broker çözümleme (Faz 1.5). Artık sabit fixture DEĞİL: Clerk oturumunun
//  userId'si → Broker.clerkUserId eşlemesi. QR/profil kaydında bu alan yazılır;
//  demo hesabı (Ahmet) env BROKER_DEMO_CLERK_ID ile bağlanır (store init).
// ════════════════════════════════════════════════════════════════════════════

/** Oturum açan Clerk kullanıcısına eşlenen Broker; eşleşme yoksa null. */
export async function getCurrentBroker(): Promise<Broker | null> {
  const { userId } = await auth()
  if (!userId) return null
  return store().brokers.find((b) => b.clerkUserId === userId) ?? null
}

/**
 * Sayfalar için: aktif broker'ı döndürür. Broker kaydı yoksa (Clerk oturumu var
 * ama eşleşen Broker yok) /broker/kayit'a yönlendirir — profil tamamlama modu.
 * Böylece broker-rollü kullanıcı hata sayfası değil kayıt akışını görür.
 */
export async function requireBroker(): Promise<Broker> {
  const broker = await getCurrentBroker()
  if (!broker) redirect('/broker/kayit')
  return broker
}
