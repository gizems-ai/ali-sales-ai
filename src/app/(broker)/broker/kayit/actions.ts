'use server'

import { redirect } from 'next/navigation'
import { addBroker, INVITE_CODE } from '@/lib/broker/store'

// QR onboarding (brief §5.7). Davet kodu doğrulanır → Broker(tier:silver) yaratılır.
// NOT: Clerk hesap oluşturma (rol='broker' metadata) Faz 2'de bu akışa eklenecek;
// Faz 1'de kayıt store'a düşer ve broker Silver kademesiyle başlar.
export async function kayitAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const agency = String(formData.get('agency') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const code = String(formData.get('code') ?? '').trim().toUpperCase()
  const src = String(formData.get('src') ?? '')

  const qs = new URLSearchParams()
  if (src) qs.set('src', src)

  if (!name || !agency || !phone) {
    qs.set('err', 'eksik')
    redirect(`/broker/kayit?${qs}`)
  }
  if (code !== INVITE_CODE) {
    qs.set('err', 'kod')
    redirect(`/broker/kayit?${qs}`)
  }

  const broker = addBroker({ name, agency, phone })
  qs.set('ok', broker.name.split(' ')[0])
  redirect(`/broker/kayit?${qs}`)
}
