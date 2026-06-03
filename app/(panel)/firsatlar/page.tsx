import { getFiresatlar } from '@/lib/airtable'
import { getKullanicıProfili, getTenantConfig } from '@/lib/yetki'
import { redirect } from 'next/navigation'
import { FirsatlarList } from './_components/firsatlar-list'

export const revalidate = 300

export default async function FirsatlarPage() {
  const profil = await getKullanicıProfili()
  if (!profil) redirect('/login')

  const cfg = getTenantConfig(profil)
  let records = []
  try {
    records = await getFiresatlar(cfg)
  } catch {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <p className="text-sm text-gray-400">Fırsatlar yüklenemedi. Bağlantıyı kontrol et.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Fırsatlar</h1>
        <p className="text-xs text-gray-400 mt-0.5">Signal Engine · {records.length} kayıt</p>
      </div>
      <FirsatlarList records={records} />
    </div>
  )
}
