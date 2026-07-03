'use client'

import { useState } from 'react'
import { Check, ChevronDown, Sparkles, Radio, Tag as TagIcon, MessageCircle, ShieldCheck, X, Building2, UserCheck } from 'lucide-react'
import {
  Z, LEVER_ETIKET, marjRenk, onaylaVeUret, ASSET_ETIKET, GUVEN_GOSTERIM,
  type CampaignRec,
} from '@/lib/kampanya'

function fmtTL(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}Mr ₺`
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M ₺`
  return `${Math.round(n).toLocaleString('tr-TR')} ₺`
}

function LeverChip({ label, birincil }: { label: string; birincil: boolean }) {
  return (
    <span className="inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-bold"
      style={birincil
        ? { background: Z.lavGrad, color: '#fff' }
        : { background: Z.lavSoft, color: '#5b51a8' }}>
      {birincil && <Sparkles size={10} className="mr-[4px]" />}{label}
    </span>
  )
}

function Metrik({ etiket, deger, renk }: { etiket: string; deger: React.ReactNode; renk?: { bg: string; fg: string } }) {
  return (
    <div className="rounded-[13px] px-[11px] py-[9px] text-center" style={{ background: renk?.bg ?? Z.surface }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: renk?.fg ?? '#8b988f' }}>{etiket}</p>
      <p className="mt-[2px] text-[13px] font-black leading-tight" style={{ color: renk?.fg ?? Z.text }}>{deger}</p>
    </div>
  )
}

export function KampanyaKarti({ card, onApprove }: { card: CampaignRec; onApprove: (approved: CampaignRec) => void }) {
  const [acikGuven, setAcikGuven] = useState(false)
  const approved = card.status === 'approved'
  const marj = marjRenk(card.marjLabel)
  const guvenText = GUVEN_GOSTERIM === 'yuzde' ? `%${card.guven.score}` : `${card.guven.matched.length}/${card.guven.total}`

  return (
    <div className="rounded-[22px] border bg-white shadow-sm overflow-hidden flex flex-col"
      style={{ borderColor: approved ? Z.green2 : Z.line }}>
      <div className="h-[5px]" style={{ background: approved ? Z.grad : Z.lavGrad }} />

      <div className="p-[16px] flex flex-col gap-[13px] flex-1">
        {/* Başlık: segment + audience + grup rozeti */}
        <div className="flex items-start justify-between gap-[8px]">
          <div>
            <p className="text-[15px] font-black" style={{ color: Z.text }}>{card.segmentEtiket}</p>
            <div className="mt-[5px] flex items-center gap-[6px]">
              <span className="rounded-full px-[8px] py-[2px] text-[10px] font-bold"
                style={{ background: card.audience === 'B2B' ? '#E0E7FF' : '#DCFCE7', color: card.audience === 'B2B' ? '#3730A3' : '#166534' }}>
                {card.audience}
              </span>
              <span className="rounded-full px-[8px] py-[2px] text-[10px] font-bold" style={{ background: Z.surface, color: '#475a4e' }}>
                {card.grup} grubu
              </span>
            </div>
            {/* Hakan referans sinyali — motorun segmenti ile yan yana (§7) */}
            {card.hakan && (
              <div className="mt-[5px] inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px] text-[10px] font-bold" style={{ background: '#FFF7ED', color: '#9a3412' }}>
                <UserCheck size={10} /> Hakan: {card.hakan.segment}
              </div>
            )}
          </div>
          <span className="grid place-items-center rounded-[11px] text-white shrink-0" style={{ width: 34, height: 34, background: approved ? Z.grad : Z.lavGrad }}>
            {approved ? <Check size={17} /> : <Sparkles size={16} />}
          </span>
        </div>

        {/* Kaldıraç çipleri (birincil vurgulu) */}
        <div className="flex flex-wrap gap-[6px]">
          {card.levers.map((l, i) => <LeverChip key={l} label={LEVER_ETIKET[l]} birincil={i === 0} />)}
        </div>

        {/* Hedeflenen daire alt-kümesi özeti (§5) */}
        {card.stokOzeti && (
          <div className="rounded-[12px] px-[11px] py-[9px] flex items-center gap-[8px]" style={{ background: Z.surface }}>
            <Building2 size={14} className="shrink-0" style={{ color: Z.green1 }} />
            <p className="text-[11.5px] leading-[16px]" style={{ color: '#33433a' }}>
              <b>{card.stokOzeti.daireSayisi} daire</b> · Blok {card.stokOzeti.bloklar.join('/')} · {card.stokOzeti.toplamM2.toLocaleString('tr-TR')} m² · {fmtTL(card.stokOzeti.toplamDegerTL)}
            </p>
          </div>
        )}

        {/* Kanal + teklif */}
        <div className="space-y-[7px]">
          <div className="flex items-start gap-[7px] text-[12px] leading-[17px]" style={{ color: '#33433a' }}>
            <Radio size={13} className="mt-[2px] shrink-0" style={{ color: Z.lavanta }} />
            <span>
              <b>Kanal:</b> {card.kanal}
              {card.hakan && <span className="block text-[11px] mt-[2px]" style={{ color: '#9a3412' }}>Hakan önerisi: {card.hakan.kanal}</span>}
            </span>
          </div>
          <div className="flex items-start gap-[7px] text-[12px] leading-[17px]" style={{ color: '#33433a' }}>
            <TagIcon size={13} className="mt-[2px] shrink-0" style={{ color: Z.lavanta }} />
            <span><b>Teklif:</b> {card.teklif}</span>
          </div>
        </div>

        {/* Broker Programı — yalnız B2B broker segmentleri (broker = kanal değil ekosistem, §2c) */}
        {(card.segment === 'yurtdisi_broker' || card.segment === 'yerli_acente') && (
          <div className="rounded-[12px] px-[12px] py-[10px]" style={{ background: Z.surface, border: `1px solid ${Z.line}` }}>
            <div className="flex items-center gap-[6px] mb-[6px]">
              <UserCheck size={12} style={{ color: Z.green1 }} />
              <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: Z.green1 }}>Broker Programı</span>
            </div>
            <ul className="grid grid-cols-1 gap-[4px]">
              {['Exclusive inventory', '48 saatte komisyon', 'VIP lansman', 'Broker portalı', 'WhatsApp hattı'].map(x => (
                <li key={x} className="flex items-center gap-[6px] text-[11.5px]" style={{ color: '#33433a' }}>
                  <Check size={12} className="shrink-0" style={{ color: Z.green2 }} /> {x}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mesaj */}
        <div className="rounded-[12px] px-[12px] py-[10px]" style={{ background: Z.lavSoft }}>
          <div className="flex items-center gap-[6px] mb-[4px]">
            <MessageCircle size={12} style={{ color: Z.lavanta }} />
            <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: Z.lavanta }}>Mesaj</span>
          </div>
          <p className="text-[12.5px] leading-[18px]" style={{ color: '#48417e' }}>{card.mesaj}</p>
        </div>

        {/* NEDEN — akan muhakeme (§2b) + 3 madde, yeşil tik */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide mb-[6px]" style={{ color: Z.green1 }}>Neden bu öneri?</p>
          {card.nedenAnlati && (
            <p className="text-[12.5px] leading-[18px] mb-[9px]" style={{ color: '#33433a' }}>{card.nedenAnlati}</p>
          )}
          <ul className="space-y-[5px]">
            {card.neden.map((n, i) => (
              <li key={i} className="flex items-start gap-[7px] text-[12px] leading-[17px]" style={{ color: '#33433a' }}>
                <Check size={13} className="mt-[1px] shrink-0" style={{ color: Z.green2 }} />{n}
              </li>
            ))}
          </ul>
        </div>

        {/* 3 metrik: erime / marj / güven */}
        <div className="grid grid-cols-3 gap-[7px]">
          <Metrik etiket="Tahmini erime" deger={`${card.erimeTahminiGun[0]}–${card.erimeTahminiGun[1]} gün`} />
          <Metrik etiket="Marj" deger={card.marjLabel} renk={marj} />
          <Metrik etiket="Güven" deger={guvenText} />
        </div>

        {/* Güven kırılımı (açılabilir) */}
        <div className="rounded-[12px] border" style={{ borderColor: Z.line }}>
          <button onClick={() => setAcikGuven(v => !v)}
            className="w-full flex items-center justify-between px-[12px] py-[8px] text-[11px] font-bold" style={{ color: Z.lavanta }}>
            <span className="flex items-center gap-[6px]"><ShieldCheck size={13} /> Güven kırılımı ({card.guven.matched.length}/{card.guven.total} eşleşti)</span>
            <ChevronDown size={14} style={{ transform: acikGuven ? 'rotate(180deg)' : 'none', transition: '.15s' }} />
          </button>
          {acikGuven && (
            <ul className="px-[12px] pb-[10px] space-y-[5px]">
              {card.guven.bilesenler.map((b, i) => (
                <li key={i} className="flex items-center gap-[7px] text-[11.5px]" style={{ color: b.eslesti ? '#33433a' : '#9a3b2a' }}>
                  {b.eslesti
                    ? <Check size={12} style={{ color: Z.green2 }} />
                    : <X size={12} style={{ color: Z.coral }} />}
                  {b.etiket}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Onay bloğu / onaylandı durumu */}
        <div className="mt-auto pt-[4px]">
          {!approved ? (
            <button onClick={() => onApprove(onaylaVeUret(card))}
              className="w-full h-[40px] rounded-[13px] text-[13px] font-black text-white transition-shadow hover:shadow-md"
              style={{ background: Z.lavGrad, boxShadow: '0 10px 20px -12px rgba(91,71,224,.6)' }}>
              Onayla → İçerik Üret
            </button>
          ) : (
            <div className="rounded-[13px] p-[12px]" style={{ background: '#F0FDF4', border: `1px solid ${Z.green3}44` }}>
              <p className="text-[12px] font-black flex items-center gap-[6px]" style={{ color: Z.green1 }}>
                <Check size={14} /> Onaylandı — içerik üretiliyor
              </p>
              <div className="mt-[9px] grid grid-cols-2 gap-[6px]">
                {card.assets?.map(a => (
                  <div key={a.type} className="rounded-[10px] px-[9px] py-[7px] flex items-center justify-between" style={{ background: '#fff', border: `1px solid ${Z.line}` }}>
                    <span className="text-[11px] font-semibold" style={{ color: '#33433a' }}>{ASSET_ETIKET[a.type]}</span>
                    <span className="rounded-full px-[6px] py-[1px] text-[9px] font-bold" style={{ background: Z.lavSoft, color: '#5b51a8' }}>QA bekliyor</span>
                  </div>
                ))}
              </div>
              <p className="mt-[9px] text-[11px] leading-[16px]" style={{ color: '#5a4a44' }}>
                <b>Üretim tamam · Marka QA&apos;ine düştü</b> — yayına insan onayıyla çıkar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
