import { redirect } from 'next/navigation'
import { getKullanicıProfili, getTenantConfig } from '@/lib/yetki'
import { AjandaAdminView } from './_components/ajanda-admin-view'

export const dynamic = 'force-dynamic'

// n8n endpoint: {N8N_BASE_URL}/{n8nSlug}/sabah-ajanda?user={temsilciSlug}&mode=web
// Orijinal AJANDA_URL: https://n8n.alisales.ai/webhook/sigortambiz/sabah-ajanda
async function fetchAjandaHtml(n8nSlug: string, temsilciSlug: string): Promise<string | null> {
  try {
    const base = process.env.N8N_BASE_URL ?? 'https://n8n.alisales.ai/webhook'
    const url = `${base}/${n8nSlug}/sabah-ajanda?user=${temsilciSlug}&mode=web`
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${process.env.BRIFING_BASIC}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function temsilciSlugFromAd(ad: string, slugMap: Record<string, string>): string {
  const norm = ad.toLowerCase()
    .replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ş/g, 's')
    .replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ç/g, 'c')
  for (const [k, v] of Object.entries(slugMap)) {
    if (norm.startsWith(k)) return v
  }
  return norm
}

function AjandaFrame({ html }: { html: string }) {
  return (
    <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-6">
      <iframe
        srcDoc={html}
        className="w-full border-0 block"
        style={{ height: 'calc(100vh - 73px)' }}
        sandbox="allow-same-origin"
        title="Sabah Ajandası"
      />
    </div>
  )
}

function AjandaBoş({ slug }: { slug: string }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <p className="text-gray-500 text-sm">Ajanda yüklenemedi.</p>
        <p className="text-gray-400 text-xs mt-1">{slug} için güncel rapor bulunamadı.</p>
      </div>
    </div>
  )
}

export default async function AjandaPage() {
  const profil = await getKullanicıProfili()
  if (!profil) redirect('/login')

  const cfg = getTenantConfig(profil)
  const n8nSlug = cfg.n8nSlug

  const slugMap: Record<string, string> = Object.fromEntries(
    cfg.temsilciler.map(t => [
      t.ad.toLowerCase()
        .replace(/ü/g, 'u').replace(/ı/g, 'i').replace(/ş/g, 's')
        .replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ç/g, 'c'),
      t.slug,
    ])
  )

  if (profil.rol === 'satış_temsilcisi' && profil.temsilciAdi) {
    const slug = temsilciSlugFromAd(profil.temsilciAdi, slugMap)
    const html = await fetchAjandaHtml(n8nSlug, slug)
    return html ? <AjandaFrame html={html} /> : <AjandaBoş slug={slug} />
  }

  // Admin / Yönetici — tüm temsilcilerin ajandası
  const htmlMap: Record<string, string | null> = {}
  await Promise.all(
    cfg.temsilciler.map(async t => {
      htmlMap[t.slug] = await fetchAjandaHtml(n8nSlug, t.slug)
    })
  )

  return <AjandaAdminView temsilciler={cfg.temsilciler} htmlMap={htmlMap} />
}
