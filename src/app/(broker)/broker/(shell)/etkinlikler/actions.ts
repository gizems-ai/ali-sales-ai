'use server'

import { revalidatePath } from 'next/cache'
import { addRSVP } from '@/lib/broker/store'
import { getAktifBroker } from '@/lib/broker/fixtures'

export async function rsvpAction(formData: FormData) {
  const eventId = String(formData.get('eventId') ?? '')
  if (!eventId) return
  const broker = getAktifBroker()
  addRSVP(eventId, broker.id)
  revalidatePath('/broker/etkinlikler')
}
