import { redirect } from 'next/navigation'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { RaporlarClient } from './_components/raporlar-client'

export default async function RaporlarPage() {
  const izin = await getMusterilerIzni()
  if (izin.tip === 'yok') redirect('/sign-in')
  return <RaporlarClient izin={izin} />
}
