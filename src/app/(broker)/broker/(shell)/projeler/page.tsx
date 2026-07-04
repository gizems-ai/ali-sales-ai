import Link from 'next/link'
import { PROJECTS } from '@/lib/broker/fixtures'
import { ProjectMaterials } from './_components/materials'

export default function ProjeMerkezi() {
  return (
    <section id="proje">
      <div className="sec-head">
        <h2>
          <span className="dot" style={{ background: 'var(--navy)' }} />
          Proje Merkezi
        </h2>
      </div>
      <p className="sec-note">
        Her proje tek sayfa. PDF istemek yok — her materyal her an burada, güncel
        hâliyle.
      </p>
      <div className="projects">
        {PROJECTS.map((p) => (
          <div className={p.full ? 'proj' : 'proj small'} key={p.slug}>
            <Link href={`/broker/projeler/${p.slug}`} className={`thumb ${p.thumb}`}>
              <span className="pl">{p.tagline}</span>
            </Link>
            <div className="pbody">
              <Link
                href={`/broker/projeler/${p.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <h3>{p.name}</h3>
                <p>{p.summary}</p>
              </Link>
              <ProjectMaterials materials={p.materials} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
