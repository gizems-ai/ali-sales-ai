import { getTenantConfigFromRequest } from '@/lib/yetki'
import { getKullanicıProfili } from '@/lib/yetki'
import { redirect } from 'next/navigation'
import { adaptStok, KUR, type AdaptedUnit, type Defect } from '@/lib/stok-adapter'
import { BABACAN_STOK } from '@/data/babacan-stok'
import { tureSinyal, haftaEtiket, type StokSinyal, type Isi } from '@/lib/stok-sinyal'
import { Building2, Eye, Users, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { AliReason } from '@/components/emlak/ali-reason'

export const dynamic = 'force-dynamic'

const E = {
  green1: '#0E5132', green2: '#1B7A47', green3: '#2E9D5E',
  surface: '#EFF5EF', coral: '#EF6B4F', line: '#E7EAF2', text: '#071B3A',
}

// Envanter TEK KAYNAK: gerçek 507 daire (BABACAN_STOK) → adapter → sinyal (deterministik).
// Kampanya Motoru ile AYNI kaynak. Isı sinyalleri src/lib/stok-sinyal.ts'te türetilir.
const PROJE_SIRA = ['Central', 'Lagoon', 'Port Royal', 'Premium'] as const
const PROJE_IL: Record<string, string> = {
  Central: 'İstanbul / Beylikdüzü', Lagoon: 'İstanbul / 5. Levent',
  'Port Royal': 'İstanbul / Sefaköy', Premium: 'İstanbul / Esenyurt',
}

type Row = { u: AdaptedUnit; s: StokSinyal }

function fmtFiyat(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M ₺`
  if (n >= 1_000)    return `${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}K ₺`
  return n.toLocaleString('tr-TR') + ' ₺'
}

function isiRenk(isi: Isi): { bg: string; fg: string; bar: string } {
  if (isi === 'Hızlı')    return { bg: '#D1FAE5', fg: '#065F46', bar: E.green2 }
  if (isi === 'Ortalama') return { bg: '#FEF3C7', fg: '#92400E', bar: '#F59E0B' }
  return { bg: '#FEE2E2', fg: '#991B1B', bar: E.coral }
}

function talepRenk(aktifTalep: number): string {
  if (aktifTalep >= 4) return E.green2
  if (aktifTalep >= 1) return '#F59E0B'
  return E.coral
}

// ── Ali önerisi (§6): uydurma "talep 0" DEĞİL — türetilmiş grup+defect+emsal+segment ──
const DEFECT_ETIKET: Record<Defect, string> = {
  zemin: 'zemin kat', buyuk_m2: 'büyük m²', pahali: 'emsal üstü fiyat', kuzey: 'kuzey cephe',
}
const EMSAL_ETIKET: Record<AdaptedUnit['emsal'], string> = {
  altinda: 'emsalin altında', emsalde: 'emsal seviyesinde', ustunde: 'emsalin üstünde',
}
function aliOneriMetni(u: AdaptedUnit): string {
  const defs = u.defects.map(d => DEFECT_ETIKET[d]).filter(Boolean).join(' · ')
  const parcalar = [`${u.grup} grubu`, defs, EMSAL_ETIKET[u.emsal]].filter(Boolean).join(' · ')
  const gerekce = u.defects.includes('buyuk_m2') ? 'geniş metrekare talebi dar'
    : u.defects.includes('zemin') ? 'zemin kat standart konut talebini daraltıyor'
    : u.defects.includes('pahali') ? 'emsal üstü fiyat talebi yavaşlatıyor'
    : 'yavaş eriyen stok — kitle daraltması var'
  return `${parcalar} — ${gerekce}. Kanal: ${u.hakanKanal}. “${u.hakanSegment}” segmentine yeniden hedefle; paket satış / erken alım primi vurgula.`
}

// Sıralama: sorun önce (riskli → Yavaş → Orta → Hızlı; içinde yavaştan hızlıya)
const ISI_RANK: Record<Isi, number> = { 'Yavaş/Risk': 2, Ortalama: 1, Hızlı: 0 }
function siraSkoru(r: Row): number {
  return (r.s.riskli ? 1000 : 0) + ISI_RANK[r.s.isi] * 100 + r.s.tahminiSatisHafta
}

function StokKarti({ row }: { row: Row }) {
  const { u, s } = row
  const isi = isiRenk(s.isi)
  const durumBg = s.uiDurum === 'Müsait' ? '#D1FAE5' : '#F1F5F9'
  const durumFg = s.uiDurum === 'Müsait' ? '#065F46' : '#64748B'

  return (
    <div
      className="rounded-[22px] border bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      style={{ borderColor: s.riskli ? E.coral : E.line }}
    >
      {/* Üst şerit — ısı rengi */}
      <div className="h-[5px]" style={{ background: s.riskli ? E.coral : isi.bar }} />

      <div className="p-[16px]">
        {/* Başlık + durum */}
        <div className="flex items-start justify-between mb-[10px]">
          <div>
            <p className="text-[13px] font-black" style={{ color: E.text }}>{u.proje} · {u.tip}</p>
            <p className="text-[11px] text-slate-400 mt-[1px]">{PROJE_IL[u.proje] ?? u.proje}</p>
          </div>
          <span
            className="inline-flex items-center gap-[4px] rounded-[8px] px-[8px] py-[3px] text-[11px] font-bold shrink-0"
            style={{ background: durumBg, color: durumFg }}
          >
            {s.uiDurum === 'Müsait' ? <CheckCircle2 size={10} /> : null}
            {s.uiDurum}
          </span>
        </div>

        {/* Blok / Kat / Daire */}
        <div className="grid grid-cols-3 gap-[6px] mb-[12px]">
          {[
            { l: 'Blok', v: u.blok },
            { l: 'Kat', v: u.katInt === null ? '—' : u.katInt <= 0 ? 'Zemin' : String(u.katInt) },
            { l: 'Daire', v: String(u.daireNo) },
          ].map(({ l, v }) => (
            <div key={l} className="rounded-[8px] text-center py-[5px]" style={{ background: E.surface }}>
              <p className="text-[9px] text-slate-400 uppercase tracking-wide">{l}</p>
              <p className="text-[12px] font-black mt-[1px]" style={{ color: E.text }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Isı rozeti + grup */}
        <div className="flex items-center gap-[6px] mb-[10px]">
          <span className="rounded-[7px] px-[8px] py-[2px] text-[10px] font-bold" style={{ background: isi.bg, color: isi.fg }}>
            {s.isi}
          </span>
          <span className="rounded-[7px] px-[7px] py-[2px] text-[10px] font-bold text-slate-500" style={{ background: '#F1F5F9' }}>
            Grup {u.grup}
          </span>
        </div>

        {/* Metrik satırları (türetilmiş sinyaller) */}
        <div className="border-t pt-[10px] space-y-[5px]" style={{ borderColor: E.line }}>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-[5px] text-slate-500"><Eye size={11} /> Görüntülenme/hafta</span>
            <span className="font-bold" style={{ color: E.text }}>{s.goruntulenme}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-[5px] text-slate-500"><Users size={11} /> Aktif talep</span>
            <span className="font-bold" style={{ color: talepRenk(s.aktifTalep) }}>{s.aktifTalep}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-[5px] text-slate-500"><Clock size={11} /> Tahmini satış</span>
            <span className="font-bold" style={{ color: E.text }}>{haftaEtiket(s.tahminiSatisHafta)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Son gösterim</span>
            <span className="font-medium text-slate-500">
              {s.sonGosterimGun === 0 ? 'Bugün' : `${s.sonGosterimGun} gün önce`}
            </span>
          </div>
        </div>

        {/* Fiyat (TL = USD × KUR) */}
        <div className="flex items-center justify-between mt-[10px] pt-[8px] border-t" style={{ borderColor: E.line }}>
          <span className="text-[11px] text-slate-400">{Math.round(u.brutM2)} m²</span>
          <p className="text-[15px] font-black" style={{ color: E.green2 }}>{fmtFiyat(Math.round(u.fiyatUSD * KUR))}</p>
        </div>

        {/* Ali önerisi — yalnız riskli (D + yavaş), türetilmiş gerekçe */}
        {s.riskli && <AliReason>{aliOneriMetni(u)}</AliReason>}
      </div>
    </div>
  )
}

export default async function StokPage() {
  const [profil, cfg] = await Promise.all([
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
  ])
  if (!profil) redirect('/login')
  if (!cfg) redirect('/login')
  if (!cfg.modules.stok) redirect('/')

  // TEK KAYNAK — gerçek 507 daire + deterministik sinyaller
  const rows: Row[] = adaptStok(BABACAN_STOK).map(u => ({
    u, s: tureSinyal({ id: u.id, grup: u.grup, emsal: u.emsal, durum: u.durum }),
  }))

  const isiSayisi = (t: Isi) => rows.filter(r => r.s.isi === t).length
  const hizli = isiSayisi('Hızlı')
  const orta = isiSayisi('Ortalama')
  const yavas = isiSayisi('Yavaş/Risk')
  const musait = rows.filter(r => r.s.uiDurum === 'Müsait').length
  const opsiyonlu = 0
  const satildi = 0
  const riskli = rows.filter(r => r.s.riskli).length

  const gruplu = PROJE_SIRA
    .map(proje => ({
      proje,
      dogrulanmamis: proje === 'Port Royal',   // stok mutabakatı bekliyor (§10 / kampanya.ts ile tutarlı)
      items: rows.filter(r => r.u.proje === proje).sort((a, b) => siraSkoru(b) - siraSkoru(a)),
    }))
    .filter(g => g.items.length > 0)

  return (
    <div className="max-w-7xl mx-auto space-y-5" style={{ padding: '24px 32px 48px' }}>

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <div className="h-[36px] w-[36px] rounded-full grid place-items-center text-white"
            style={{ background: `linear-gradient(135deg, ${E.green1}, ${E.green2})` }}>
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="text-[20px] font-black" style={{ color: E.text }}>Stok / Envanter</h1>
            <p className="text-[12px] text-slate-400">{rows.length} daire · Isı haritası · Portföy sağlığı</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-50 border border-amber-200 px-[11px] py-[5px] text-[11px] font-bold text-amber-700">
          Örnek / doğrulanmamış veri
        </span>
      </div>

      {/* Stok Sağlığı Şeridi (507 gerçek daire üstünde) */}
      <div className="rounded-[22px] border bg-white p-[18px] shadow-sm" style={{ borderColor: E.line }}>
        <p className="text-[13px] font-black mb-[14px]" style={{ color: E.text }}>Portföy Sağlığı</p>
        <div className="grid grid-cols-3 gap-[10px] mb-[14px]">
          {[
            { label: 'Hızlı Satış',  count: hizli, bg: '#D1FAE5', fg: '#065F46', bar: E.green2  },
            { label: 'Ortalama',     count: orta,  bg: '#FEF3C7', fg: '#92400E', bar: '#F59E0B' },
            { label: 'Yavaş / Risk', count: yavas, bg: '#FEE2E2', fg: '#991B1B', bar: E.coral   },
          ].map(({ label, count, bg, fg, bar }) => (
            <div key={label} className="rounded-[14px] p-[12px] text-center" style={{ background: bg }}>
              <p className="text-[22px] font-black" style={{ color: fg }}>{count}</p>
              <p className="text-[11px] font-semibold mt-[2px]" style={{ color: fg }}>{label}</p>
              <div className="mt-[8px] h-[3px] rounded-full" style={{ background: bar }} />
            </div>
          ))}
        </div>
        {/* Toplam özet */}
        <div className="grid grid-cols-4 gap-[8px]">
          {[
            { l: 'Müsait',    v: musait,    c: '#065F46' },
            { l: 'Opsiyonlu', v: opsiyonlu, c: '#92400E' },
            { l: 'Satıldı',   v: satildi,   c: '#64748B' },
            { l: 'Riskli',    v: riskli,    c: E.coral   },
          ].map(({ l, v, c }) => (
            <div key={l} className="text-center">
              <p className="text-[18px] font-black" style={{ color: c }}>{v}</p>
              <p className="text-[11px] text-slate-400 mt-[1px]">{l}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-[12px] leading-[15px]">
          Sinyaller (görüntülenme · talep · tahmini satış) grup/emsal-tutarlı, deterministik türetilir.
          Faz 2: portal (sahibinden/emlakjet) + CRM lead verisinden gerçek değerlerle değişecek.
        </p>
      </div>

      {/* Proje bazlı portföy — sorun önce sıralı */}
      {gruplu.map(({ proje, dogrulanmamis, items }) => (
        <div key={proje} className="space-y-[10px]">
          <div className="flex items-center gap-[8px] pt-[4px]">
            <h2 className="text-[15px] font-black" style={{ color: E.text }}>{proje}</h2>
            <span className="text-[12px] text-slate-400">{items.length} daire</span>
            {dogrulanmamis && (
              <span className="inline-flex items-center gap-[4px] rounded-full bg-amber-50 border border-amber-200 px-[9px] py-[3px] text-[10px] font-bold text-amber-700">
                <AlertTriangle size={10} /> stok mutabakatı bekliyor
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
            {items.map(row => <StokKarti key={row.u.id} row={row} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
