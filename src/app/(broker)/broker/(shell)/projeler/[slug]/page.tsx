import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { getProject, PROJECTS } from '@/lib/broker/fixtures'
import { unitsByProject, formatUSD, type BrokerProje } from '@/lib/broker/stok'
import { ProjectMaterials } from '../_components/materials'

const SLUG_TO_PROJE: Record<string, BrokerProje> = {
  lagoon: 'Lagoon',
  central: 'Central',
  'port-royal': 'Port Royal',
}

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }))
}

export default async function ProjeSayfasi({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const proje = getProject(slug)
  if (!proje) notFound()

  const projeAdi = SLUG_TO_PROJE[slug]
  const units = projeAdi ? unitsByProject(projeAdi) : []
  const enUcuz = units.length
    ? units.reduce((a, b) => (a.fiyatUSD < b.fiyatUSD ? a : b))
    : null

  return (
    <section id="proje-tek">
      <div className="sec-head">
        <h2>
          <span className="dot" style={{ background: 'var(--navy)' }} />
          {proje.name}
        </h2>
        <Link href="/broker/projeler">
          Tüm projeler <ArrowRight className="ic" style={{ width: 13, height: 13 }} />
        </Link>
      </div>
      <p className="sec-note">
        {proje.summary}
        {enUcuz ? ` · ${units.length} ünite · ${formatUSD(enUcuz.fiyatUSD)}’den başlayan` : ''}
      </p>

      <div className={proje.full ? 'proj' : 'proj small'} style={{ maxWidth: proje.full ? 720 : 520 }}>
        <div className={`thumb ${proje.thumb}`}>
          <span className="pl">{proje.tagline}</span>
        </div>
        <div className="pbody">
          <h3>{proje.name}</h3>
          <p>{proje.summary}</p>
          <ProjectMaterials materials={proje.materials} />
        </div>
      </div>
    </section>
  )
}
