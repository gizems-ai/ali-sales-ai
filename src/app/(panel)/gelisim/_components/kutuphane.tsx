'use client'

import { useState } from 'react'
import {
  Search, Bell, Play, Target, Sparkles, Lightbulb, Flame, Gift,
  ChevronRight, MessageCircle, Zap, Map as MapIcon, GraduationCap,
  Building2, FileText, BookOpen, Bot,
} from 'lucide-react'
import {
  G, RADIUS, SECTION_NAME, MANIFESTO, REP, SKILL_META, KOC_MESAJI,
  GUNUN_DERSI, GUNUN_CHALLENGE, GUNUN_ROLYAP, GUNUN_WA,
  DEVAM_EDENLER, AKADEMI, LEADERBOARD, FEATURE_BAR, TIP_ETIKET, fmtXp,
  type Content,
} from '@/lib/gelisim'
import { ContentViewer } from './content-viewer'

// ── Ortak primitive'ler ──────────────────────────────────────────────────────
const sora = { fontFamily: 'var(--font-sora), system-ui, sans-serif' } as const
const mono = { fontFamily: 'var(--font-space-mono), ui-monospace, monospace' } as const

const cardBase: React.CSSProperties = {
  background: G.cardSolid,
  border: `1px solid ${G.line}`,
  borderRadius: RADIUS,
  boxShadow: '0 2px 6px rgba(40,60,45,.04), 0 22px 46px -30px rgba(40,70,50,.22)',
}

function Etiket({ children, tone = 'mono' }: { children: React.ReactNode; tone?: 'mono' | 'lav' | 'coral' | 'green' }) {
  const palette =
    tone === 'lav' ? { bg: G.lavSoft, fg: G.lavanta }
    : tone === 'coral' ? { bg: G.coralSofter, fg: G.coral }
    : tone === 'green' ? { bg: '#E4F2E9', fg: G.green2 }
    : { bg: '#F1F2F4', fg: G.sub }
  return (
    <span style={{
      ...mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em',
      textTransform: 'uppercase', background: palette.bg, color: palette.fg,
      padding: '4px 8px', borderRadius: 999, whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function CanliRozet() {
  return (
    <span style={{
      ...mono, display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase',
      background: '#E4F2E9', color: G.green2, padding: '4px 8px', borderRadius: 999,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: G.green3, display: 'inline-block' }} />
      Canlı içerik
    </span>
  )
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, margin: '4px 2px 14px' }}>
      <h2 style={{ ...sora, fontSize: 20, fontWeight: 700, color: G.text, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
      {action && (
        <button onClick={onAction} style={{
          background: 'none', border: 0, cursor: 'pointer', color: G.lavanta,
          fontWeight: 600, fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>
          {action} <ChevronRight size={15} />
        </button>
      )}
    </div>
  )
}

function Bar({ value, grad = G.lavGrad, h = 7 }: { value: number; grad?: string; h?: number }) {
  return (
    <div style={{ height: h, borderRadius: 999, background: '#EEF0F2', overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, borderRadius: 999, background: grad }} />
    </div>
  )
}

// Proje görseli yerine marka tonlu placeholder (gerçek foto kaynaklamadan)
function GorselPlaceholder({ tint = 'lav' }: { tint?: 'lav' | 'green' | 'coral' }) {
  const grad =
    tint === 'green' ? 'linear-gradient(135deg,#bfe6cd,#7fc79c)'
    : tint === 'coral' ? 'linear-gradient(135deg,#f7cfc3,#f0a48d)'
    : 'linear-gradient(135deg,#ddd5f7,#b3a6ec)'
  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 14,
      background: grad, overflow: 'hidden', display: 'grid', placeItems: 'center',
    }}>
      <Building2 size={30} color="rgba(255,255,255,.85)" strokeWidth={1.6} />
    </div>
  )
}

// ── Header ───────────────────────────────────────────────────────────────────
function Header() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
      <div>
        <h1 style={{ ...sora, fontSize: 28, fontWeight: 800, color: G.text, margin: 0, letterSpacing: '-0.02em' }}>
          Günaydın, {REP.ad.split(' ')[0]}! <span aria-hidden>👋</span>
        </h1>
        <p style={{ fontSize: 14.5, color: G.sub, margin: '6px 0 0' }}>
          Bugün daha iyi bir satışçı olmak için harika bir gün.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, background: '#fff',
          border: `1px solid ${G.line}`, borderRadius: 14, padding: '10px 14px',
          minWidth: 'min(340px, 60vw)', boxShadow: '0 2px 6px rgba(40,60,45,.04)',
        }}>
          <Search size={17} color={G.faint} />
          <input
            placeholder="Ara: ders, konu, senaryo, proje…"
            style={{ border: 0, outline: 0, background: 'none', fontSize: 14, color: G.text, width: '100%', fontFamily: 'inherit' }}
          />
        </div>
        <button aria-label="Bildirimler" style={{
          position: 'relative', width: 42, height: 42, borderRadius: 13, background: '#fff',
          border: `1px solid ${G.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          <Bell size={18} color={G.sub} />
          <span style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: '50%', background: G.coral, border: '1.5px solid #fff' }} />
        </button>
        <div style={{
          width: 42, height: 42, borderRadius: 13, background: G.greenGrad, color: '#fff',
          ...sora, fontWeight: 800, fontSize: 14, display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>GB</div>
      </div>
    </div>
  )
}

// ── Hero A: Koçun Ali ────────────────────────────────────────────────────────
function CoachCard({ onChat, onRolYap }: { onChat: () => void; onRolYap: () => void }) {
  return (
    <div style={{
      ...cardBase, background: 'linear-gradient(135deg,#F5F3FF 0%,#ECE7FE 60%,#E6E0FC 100%)',
      border: '1px solid rgba(124,103,224,.18)', padding: 20, display: 'flex', gap: 18, alignItems: 'center',
    }}>
      {/* Ali avatarı — paneldeki Ali ile aynı */}
      <div style={{
        width: 112, height: 112, borderRadius: 24, overflow: 'hidden', flexShrink: 0,
        background: G.lavGrad, display: 'grid', placeItems: 'end center',
        boxShadow: '0 18px 36px -18px rgba(91,71,224,.6)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ali-avatar.png" alt="AI Koçun Ali" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <span style={{ ...sora, fontSize: 18, fontWeight: 800, color: G.lavanta }}>AI Koçun Ali</span>
          <Sparkles size={16} color={G.lavAccent} />
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: '#34304a', margin: '0 0 16px', maxWidth: 460 }}>
          {KOC_MESAJI}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onChat} style={{
            background: G.lavGrad, color: '#fff', border: 0, borderRadius: 13, padding: '11px 18px',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 12px 22px -12px rgba(91,71,224,.7)', fontFamily: 'inherit',
          }}>
            <MessageCircle size={16} /> Koçumla Sohbet Et
          </button>
          <button onClick={onRolYap} style={{
            background: '#fff', color: G.lavanta, border: `1px solid ${G.line}`, borderRadius: 13,
            padding: '11px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Rol Yapalım
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hero B: Dünün Özeti ──────────────────────────────────────────────────────
function DununOzetiCard() {
  const d = REP.dununOzeti
  const rows = [
    { label: 'Görüşme', value: `${d.gorusme}`, icon: MessageCircle },
    { label: 'Teklif', value: `${d.teklif}`, icon: FileText },
    { label: 'Kapanış Oranı', value: `%${d.kapanisOrani}`, icon: Target, delta: `↗%${d.kapanisDelta}` },
    { label: 'Yeni Müşteri', value: `${d.yeniMusteri}`, icon: Sparkles },
  ]
  return (
    <div style={{ ...cardBase, padding: 18, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ ...sora, fontWeight: 700, fontSize: 15, color: G.text }}>Dünün Özeti</span>
        <button style={{ background: 'none', border: 0, cursor: 'pointer', color: G.lavanta, fontWeight: 600, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          Detaylar <ChevronRight size={13} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <r.icon size={15} color={G.faint} />
            <span style={{ fontSize: 13.5, color: G.sub, flex: 1 }}>{r.label}</span>
            {r.delta && <span style={{ fontSize: 12, fontWeight: 700, color: G.green2 }}>{r.delta}</span>}
            <span style={{ ...sora, fontSize: 16, fontWeight: 800, color: G.text }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Hero C: Öğrenme Serin ────────────────────────────────────────────────────
function OgrenmeSeriCard() {
  return (
    <div style={{ ...cardBase, padding: 18, display: 'flex', flexDirection: 'column' }}>
      <span style={{ ...sora, fontWeight: 700, fontSize: 15, color: G.text }}>Öğrenme Serin</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 4px' }}>
        <Flame size={26} color={G.coral} fill={G.coral} />
        <span style={{ ...sora, fontSize: 30, fontWeight: 800, color: G.text, lineHeight: 1 }}>{REP.streak}</span>
        <span style={{ fontSize: 13, color: G.sub, fontWeight: 600 }}>gün</span>
        <Gift size={22} color={G.lavAccent} style={{ marginLeft: 'auto' }} />
      </div>
      <p style={{ fontSize: 13, color: G.sub, margin: '6px 0 12px' }}>Harika gidiyorsun!</p>
      <Bar value={68} grad="linear-gradient(90deg,#6D5BE0,#EF6B4F)" h={8} />
      <button style={{
        marginTop: 14, background: 'none', border: 0, cursor: 'pointer', color: G.lavanta,
        fontWeight: 600, fontSize: 13, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 3,
      }}>
        Rozetlerini Gör <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ── "Bugün Senin İçin" kartları ──────────────────────────────────────────────
function BugunGununDersi() {
  return (
    <div style={{ ...cardBase, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13.5, color: G.text }}>
          <BookOpen size={16} color={G.lavanta} /> Günün Dersi
        </span>
        <Etiket>{GUNUN_DERSI.sure}</Etiket>
      </div>
      <GorselPlaceholder tint="lav" />
      <p style={{ ...sora, fontSize: 14, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.3 }}>{GUNUN_DERSI.baslik}</p>
      <button style={{
        marginTop: 'auto', alignSelf: 'flex-end', width: 38, height: 38, borderRadius: '50%',
        border: 0, cursor: 'pointer', background: G.lavGrad, color: '#fff', display: 'grid', placeItems: 'center',
        boxShadow: '0 10px 18px -10px rgba(91,71,224,.7)',
      }} aria-label="Dersi oynat">
        <Play size={16} fill="#fff" />
      </button>
    </div>
  )
}

function BugunChallenge() {
  const c = GUNUN_CHALLENGE
  return (
    <div style={{ ...cardBase, background: 'linear-gradient(160deg,#FDEFEA 0%,#fff 55%)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13.5, color: G.coral }}>
        <Target size={16} /> Günün Challenge&apos;ı
      </span>
      <p style={{ ...sora, fontSize: 14.5, fontWeight: 700, color: G.text, margin: '2px 0 6px', lineHeight: 1.35 }}>{c.gorev}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: G.sub }}>{c.tamamlanan}/{c.hedef}</span>
        <div style={{ flex: 1 }}><Bar value={(c.tamamlanan / c.hedef) * 100} grad={`linear-gradient(90deg,${G.coral},#f3a48d)`} /></div>
        <Sparkles size={15} color={G.coral} />
      </div>
      <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: G.coral, textTransform: 'uppercase', letterSpacing: '.03em' }}>
        Ödül: {fmtXp(c.xp)}
      </span>
    </div>
  )
}

function BugunRolYap({ onStart }: { onStart: () => void }) {
  const r = GUNUN_ROLYAP
  return (
    <div style={{ ...cardBase, background: 'linear-gradient(160deg,#E9F4ED 0%,#fff 55%)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13.5, color: G.green2 }}>
          <Bot size={16} /> AI Rol Yap
        </span>
        {r.etiket && <Etiket tone="green">{r.etiket}</Etiket>}
      </div>
      <p style={{ ...sora, fontSize: 14.5, fontWeight: 700, color: G.text, margin: 0 }}>{r.baslik}</p>
      <p style={{ fontSize: 12.5, color: G.sub, margin: 0, lineHeight: 1.45 }}>{r.altMetin}</p>
      <button onClick={onStart} style={{
        marginTop: 'auto', alignSelf: 'flex-start', background: '#fff', color: G.green2,
        border: `1px solid ${G.line}`, borderRadius: 11, padding: '8px 14px', fontWeight: 700, fontSize: 13,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
      }}>
        Başla <ChevronRight size={14} />
      </button>
    </div>
  )
}

function BugunOneri({ onShow }: { onShow: () => void }) {
  return (
    <div style={{ ...cardBase, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13.5, color: G.lavanta }}>
        <Lightbulb size={16} /> Bugünün Önerisi
      </span>
      <p style={{ ...sora, fontSize: 14.5, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.35 }}>{GUNUN_WA.senaryo}</p>
      <p style={{ fontSize: 12.5, color: G.sub, margin: 0, lineHeight: 1.45 }}>WhatsApp şablonunu denemeni öneririm.</p>
      <button onClick={onShow} style={{
        marginTop: 'auto', alignSelf: 'flex-start', background: 'none', border: 0, cursor: 'pointer',
        color: G.lavanta, fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'inherit',
      }}>
        Şablonu Gör <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ── "Devam Etmek İstediklerin" kartı (canlı → viewer) ────────────────────────
const TIP_ICON: Record<string, React.ElementType> = {
  ders: BookOpen, rolYap: Bot, oyunKitabi: FileText, projeAkademisi: GraduationCap, persona: Sparkles, hikaye: BookOpen,
}
const TIP_TONE: Record<string, 'lav' | 'green' | 'coral'> = {
  ders: 'lav', rolYap: 'green', oyunKitabi: 'coral', projeAkademisi: 'green', persona: 'lav', hikaye: 'lav',
}

function DevamKart({ c, onOpen }: { c: Content; onOpen: (c: Content) => void }) {
  const Icon = TIP_ICON[c.tip] ?? BookOpen
  const tone = TIP_TONE[c.tip] ?? 'lav'
  const clickable = c.canli && !!c.src
  return (
    <button
      onClick={() => clickable && onOpen(c)}
      style={{
        ...cardBase, padding: 12, display: 'flex', flexDirection: 'column', gap: 9,
        textAlign: 'left', cursor: clickable ? 'pointer' : 'default', fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <Etiket tone={tone}>{TIP_ETIKET[c.tip]}</Etiket>
        {c.etiket ? <Etiket tone="green">{c.etiket}</Etiket>
          : c.ilerleme != null ? <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: G.sub }}>%{c.ilerleme}</span> : null}
      </div>
      <div style={{ position: 'relative' }}>
        <GorselPlaceholder tint={tone} />
        <div style={{ position: 'absolute', top: 7, left: 7 }}>
          <span style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(255,255,255,.85)', display: 'grid', placeItems: 'center' }}>
            <Icon size={15} color={tone === 'green' ? G.green2 : tone === 'coral' ? G.coral : G.lavanta} />
          </span>
        </div>
      </div>
      <p style={{ ...sora, fontSize: 13.5, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.3 }}>{c.baslik}</p>
      <p style={{ fontSize: 11.5, color: G.faint, margin: 0 }}>{c.altMetin}</p>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {c.ilerleme != null
          ? <div style={{ flex: 1 }}><Bar value={c.ilerleme} grad={tone === 'green' ? 'linear-gradient(90deg,#2c8a52,#4f9f6c)' : tone === 'coral' ? `linear-gradient(90deg,${G.coral},#f3a48d)` : G.lavGrad} h={6} /></div>
          : <div style={{ flex: 1 }} />}
        {c.canli && <CanliRozet />}
      </div>
    </button>
  )
}

// ── Sağ ray: Yetenek Skorların ───────────────────────────────────────────────
function SkillRail() {
  return (
    <div style={{ ...cardBase, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ ...sora, fontWeight: 700, fontSize: 16, color: G.text }}>Yetenek Skorların</span>
        <span style={{ ...mono, fontSize: 10.5, color: G.faint, textTransform: 'uppercase', letterSpacing: '.04em' }}>Bu hafta</span>
      </div>
      {/* Gözetim değil, senin aynan */}
      <p style={{ fontSize: 11.5, color: G.faint, margin: '0 0 14px' }}>Senin gelişimin · kimse seni sıralamıyor.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {SKILL_META.map(s => {
          const v = REP.skills[s.key]
          return (
            <div key={s.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: G.sub, fontWeight: 500 }}>{s.label}</span>
                <span style={{ ...sora, fontSize: 13, fontWeight: 800, color: G.text }}>{v}</span>
              </div>
              <Bar value={v} grad={G.greenGrad} h={6} />
            </div>
          )
        })}
      </div>
      <button style={{
        marginTop: 16, width: '100%', background: G.lavSoft, color: G.lavanta, border: 0, borderRadius: 12,
        padding: '11px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'inherit',
      }}>
        Gelişim Raporunu Gör <ChevronRight size={15} />
      </button>
    </div>
  )
}

// ── Sağ ray: Haftanın Liderleri (Kurumsal toggle'a bağlı) ────────────────────
function LeaderRail({ isKurumsal }: { isKurumsal: boolean }) {
  if (!isKurumsal) {
    return (
      <div style={{ ...cardBase, padding: 18 }}>
        <span style={{ ...sora, fontWeight: 700, fontSize: 16, color: G.text }}>Haftanın Liderleri</span>
        <p style={{ fontSize: 12.5, color: G.faint, margin: '10px 0 0', lineHeight: 1.5 }}>
          Liderlik tablosu yalnızca <strong style={{ color: G.sub }}>Kurumsal</strong> modda açıktır. Bireysel modda
          gelişimin sadece sana aittir.
        </p>
      </div>
    )
  }
  return (
    <div style={{ ...cardBase, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ ...sora, fontWeight: 700, fontSize: 16, color: G.text }}>Haftanın Liderleri</span>
        <button style={{ background: 'none', border: 0, cursor: 'pointer', color: G.lavanta, fontWeight: 600, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          Detaylar <ChevronRight size={13} />
        </button>
      </div>
      {/* XP = öğrenme + pratik; ciro değil */}
      <p style={{ fontSize: 11.5, color: G.faint, margin: '0 0 12px' }}>XP = öğrenme + pratik aktivitesi · ciro değil.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {LEADERBOARD.map(row => (
          <div key={row.sira} style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 12,
            background: row.ben ? '#E9F4ED' : 'transparent',
            border: row.ben ? '1px solid rgba(46,157,94,.3)' : '1px solid transparent',
          }}>
            <span style={{ ...sora, fontSize: 13, fontWeight: 800, color: row.ben ? G.green2 : G.faint, width: 14, textAlign: 'center' }}>{row.sira}</span>
            <span style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: row.ben ? G.greenGrad : 'linear-gradient(135deg,#cfd6f0,#a9b3e0)',
              color: '#fff', ...sora, fontWeight: 800, fontSize: 11, display: 'grid', placeItems: 'center',
            }}>{row.ad === 'Sen' ? 'GB' : row.ad.split(' ').map(p => p[0]).join('').slice(0, 2)}</span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: row.ben ? 800 : 600, color: row.ben ? G.green1 : G.text }}>{row.ad}</span>
            <span style={{ ...sora, fontSize: 13, fontWeight: 800, color: row.ben ? G.green2 : G.sub }}>{fmtXp(row.xp)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Alt şerit (feature bar) ──────────────────────────────────────────────────
const FEATURE_ICON: Record<string, React.ElementType> = { zap: Zap, play: Play, map: MapIcon, spark: Sparkles }

function FeatureBar() {
  return (
    <div style={{
      ...cardBase, background: 'linear-gradient(120deg,#F5F3FF 0%,#fff 40%,#FDEFEA 100%)',
      padding: 20, display: 'grid', gridTemplateColumns: '1fr', gap: 18,
    }} className="gx-feature">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 46, height: 46, borderRadius: 14, background: G.lavGrad, display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 12px 22px -12px rgba(91,71,224,.7)' }}>
          <BookOpen size={22} color="#fff" />
        </span>
        <div>
          <p style={{ ...sora, fontSize: 16, fontWeight: 800, color: G.text, margin: 0 }}>{SECTION_NAME}</p>
          <p style={{ fontSize: 12.5, color: G.sub, margin: '4px 0 0', maxWidth: 360, lineHeight: 1.45 }}>
            Sana özel, her gün büyüyen içeriklerle satışta fark yarat. {MANIFESTO}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }} className="gx-feature-mini">
        {FEATURE_BAR.map(f => {
          const Icon = FEATURE_ICON[f.icon] ?? Sparkles
          return (
            <div key={f.baslik} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 11, background: '#fff', border: `1px solid ${G.line}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon size={17} color={G.lavanta} />
              </span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: G.text, margin: 0 }}>{f.baslik}</p>
                <p style={{ ...mono, fontSize: 10.5, color: G.faint, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '.03em' }}>{f.alt}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ ...sora, fontSize: 13.5, fontWeight: 700, color: G.text, margin: 0 }}>Yeni içerikleri kaçırma!</p>
          <p style={{ fontSize: 12, color: G.sub, margin: '3px 0 0' }}>Her hafta yeni dersler ve senaryolar seni bekliyor.</p>
        </div>
        <button style={{
          background: G.lavGrad, color: '#fff', border: 0, borderRadius: 12, padding: '11px 18px',
          fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
          fontFamily: 'inherit', boxShadow: '0 12px 22px -12px rgba(91,71,224,.7)',
        }}>
          <Bell size={15} /> Bildirimleri Aç
        </button>
      </div>
    </div>
  )
}

// ── Ana bileşen ──────────────────────────────────────────────────────────────
export function Kutuphane({ isKurumsal }: { isKurumsal: boolean }) {
  const [viewer, setViewer] = useState<{ src: string; baslik: string } | null>(null)
  const openContent = (c: Content) => { if (c.src) setViewer({ src: c.src, baslik: c.baslik }) }

  // "Devam" + akademi gömülü deck'leri birlikte; canlı olanlar viewer'da açılır
  const devam = DEVAM_EDENLER
  const akademi = AKADEMI

  return (
    <div
      style={{
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        color: G.text,
        padding: 'clamp(16px, 2.4vw, 30px)',
        maxWidth: 1560,
        margin: '0 auto',
      }}
    >
      <Header />

      {/* Hero — üçlü blok */}
      <div className="gx-hero" style={{ display: 'grid', gap: 16, marginBottom: 26, gridTemplateColumns: '1fr' }}>
        <CoachCard onChat={() => { /* readOnly: fixture */ }} onRolYap={() => { /* readOnly */ }} />
        <DununOzetiCard />
        <OgrenmeSeriCard />
      </div>

      {/* Gövde: sol içerik + sağ ray */}
      <div className="gx-body" style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr', alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <SectionHead title="Bugün Senin İçin" action="Tümünü Gör" />
          <div className="gx-grid4" style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr', marginBottom: 28 }}>
            <BugunGununDersi />
            <BugunChallenge />
            <BugunRolYap onStart={() => { /* readOnly */ }} />
            <BugunOneri onShow={() => { /* readOnly: WhatsApp taslağı fixture */ }} />
          </div>

          <SectionHead title="Devam Etmek İstediklerin" action="Tümünü Gör" />
          <div className="gx-grid4" style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr', marginBottom: 28 }}>
            {devam.map(c => <DevamKart key={c.id} c={c} onOpen={openContent} />)}
          </div>

          <SectionHead title="Proje Akademisi & Persona Kütüphanesi" />
          <div className="gx-grid4" style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr' }}>
            {akademi.map(c => <DevamKart key={c.id} c={c} onOpen={openContent} />)}
          </div>
        </div>

        {/* Sağ ray — <1180px gizlenir */}
        <aside className="gx-rail" style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 16 }}>
          <SkillRail />
          <LeaderRail isKurumsal={isKurumsal} />
        </aside>
      </div>

      {/* Alt şerit */}
      <div style={{ marginTop: 26 }}>
        <FeatureBar />
      </div>

      <ContentViewer
        open={!!viewer}
        src={viewer?.src ?? ''}
        baslik={viewer?.baslik ?? ''}
        onClose={() => setViewer(null)}
      />

      {/* Responsive — mobile-first; sağ ray <1180px gizlenir, kartlar tek kolona iner */}
      <style>{`
        @media (min-width: 720px) {
          .gx-grid4 { grid-template-columns: repeat(2, 1fr) !important; }
          .gx-feature-mini { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (min-width: 980px) {
          .gx-hero { grid-template-columns: 1.5fr 1fr 1fr !important; }
        }
        @media (min-width: 1180px) {
          .gx-body { grid-template-columns: minmax(0,1fr) 348px !important; }
          .gx-grid4 { grid-template-columns: repeat(4, 1fr) !important; }
          .gx-feature { grid-template-columns: 1.3fr 1.4fr 1.1fr !important; align-items: center; }
        }
        @media (max-width: 1179px) {
          .gx-rail { display: none !important; }
        }
      `}</style>
    </div>
  )
}
