import {
  PlayCircle,
  FileText,
  LayoutGrid,
  Receipt,
  CalendarRange,
  HelpCircle,
  MessageCircle,
  Download,
} from 'lucide-react'
import type { ProjectMaterial, ProjectMaterialKind } from '@/lib/broker/types'

const ICON: Record<ProjectMaterialKind, React.ElementType> = {
  video: PlayCircle,
  sunum: FileText,
  brosur: LayoutGrid,
  fiyat: Receipt,
  odeme: CalendarRange,
  sss: HelpCircle,
  whatsapp: MessageCircle,
  indir: Download,
}

export function ProjectMaterials({ materials }: { materials: ProjectMaterial[] }) {
  return (
    <div className="mats">
      {materials.map((m) => {
        const Icon = ICON[m.kind]
        if (!m.href) {
          return (
            <div className="mat disabled" key={m.kind + m.label}>
              <Icon className="ic" />
              <span className="ml">{m.label}</span>
              <span className="soon">yakında</span>
            </div>
          )
        }
        const external = m.href.startsWith('/decks/') || m.href.startsWith('http')
        return (
          <a
            className="mat"
            key={m.kind + m.label}
            href={m.href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <Icon className="ic" />
            <span className="ml">{m.label}</span>
          </a>
        )
      })}
    </div>
  )
}
