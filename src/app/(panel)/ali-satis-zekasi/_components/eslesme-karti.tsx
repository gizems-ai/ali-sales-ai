'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MessageCircle, MessagesSquare, ChevronDown, ArrowRight } from 'lucide-react'
import {
  Z, TIERS, PERSONA_ETIKET, PROJE_ADI, fmtFiyat, unitById, customerById,
  type Match, type Customer, type Unit,
} from '@/lib/ali-zeka'
import { TaslakModal, type TaslakIcerik } from './taslak-modal'

function waTaslak(c: Customer, u: Unit): string {
  return `Merhaba ${c.ad.split(' ')[0]} Bey/Hanım,\n\n` +
    `${PROJE_ADI} projesinde sizin için çok uygun bir daire buldum: ${u.daire} (${u.tip}, ${u.metrekare} m²).\n` +
    `• ${u.etiketler.filter(e => e.tone === 'positive').slice(0, 3).map(e => e.label).join('\n• ')}\n` +
    `• ${u.teslimAy === 0 ? 'Hazır teslim' : `Teslim ${u.teslimAy} ay`} · ${fmtFiyat(u.fiyat)}\n\n` +
    `Size detayları ve örnek ödeme planını iletmemi ister misiniz?`
}

function stratejiTaslak(c: Customer, u: Unit, m: Match): string {
  return `${c.ad} · ${u.daire} eşleşmesi için konuşma akışı:\n\n` +
    `1. Açılış: ${c.konusmaOnerisi}\n` +
    `2. Güçlü yön: ${m.nedenler.slice(0, 2).join(' · ')}\n` +
    `3. İtiraz gelirse: "${m.olasiItirazlar[0]?.itiraz ?? '—'}" → ${m.olasiItirazlar[0]?.yanit ?? '—'}\n` +
    `4. Kapanış: ${u.teslimAy <= 3 ? 'Hızlı teslim avantajını' : 'Erken alım/prim avantajını'} hatırlat, randevu öner.`
}

export function EslesmeKarti({ match }: { match: Match }) {
  const [acikItiraz, setAcikItiraz] = useState(false)
  const [taslak, setTaslak] = useState<TaslakIcerik | null>(null)

  const unit = unitById(match.unitId)
  const customer = customerById(match.customerId)
  if (!unit || !customer) return null

  const tier = TIERS[match.tier]
  const altUnits = match.alternatifler.map(unitById).filter(Boolean) as Unit[]

  return (
    <div className="rounded-[22px] border bg-white shadow-sm overflow-hidden" style={{ borderColor: Z.line }}>
      {/* Skor şeridi */}
      <div className="h-[5px]" style={{ background: tier.bar }} />

      <div className="p-[16px]">
        {/* Üst: skor + tier + birim kimliği */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-[10px] min-w-0">
            <div className="grid place-items-center rounded-[14px] text-white shrink-0"
              style={{ width: 52, height: 52, background: tier.bar }}>
              <span className="text-[18px] font-black leading-none">%{match.skor}</span>
            </div>
            <div className="min-w-0">
              <span className="inline-block rounded-full px-[9px] py-[3px] text-[11px] font-bold"
                style={{ background: tier.bg, color: tier.fg }}>{tier.label}</span>
              <p className="text-[12px] text-slate-400 mt-[3px] truncate">
                {customer.ad}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[15px] font-black" style={{ color: Z.text }}>{unit.daire}</p>
            <p className="text-[12px] font-bold text-slate-500">{unit.tip} · {unit.metrekare} m²</p>
            <p className="text-[12px] font-black mt-[1px]" style={{ color: Z.green2 }}>{fmtFiyat(unit.fiyat)}</p>
          </div>
        </div>

        {/* Neden? */}
        <div className="mt-[13px]">
          <p className="text-[11px] font-black uppercase tracking-wide mb-[7px]" style={{ color: Z.green1 }}>Neden?</p>
          <ul className="space-y-[5px]">
            {match.nedenler.map((n, i) => {
              const uyari = n.startsWith('⚠')
              return (
                <li key={i} className="flex items-start gap-[7px] text-[12.5px] leading-[18px]"
                  style={{ color: uyari ? '#9a3b2a' : '#33433a' }}>
                  <span className="mt-[1px] shrink-0 font-black" style={{ color: uyari ? Z.coral : Z.green2 }}>
                    {uyari ? '!' : '✓'}
                  </span>
                  {uyari ? n.replace('⚠ ', '') : n}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Olası itiraz */}
        {match.olasiItirazlar.length > 0 && (
          <button
            onClick={() => setAcikItiraz(v => !v)}
            className="mt-[12px] w-full text-left rounded-[12px] px-[12px] py-[9px] transition-colors"
            style={{ background: Z.coralSoft }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold" style={{ color: '#9a3b2a' }}>
                Olası itiraz: &ldquo;{match.olasiItirazlar[0].itiraz}&rdquo;
              </span>
              <span className="flex items-center gap-[4px] text-[11px] font-bold" style={{ color: Z.coral }}>
                yanıt <ChevronDown size={13} style={{ transform: acikItiraz ? 'rotate(180deg)' : 'none', transition: '.15s' }} />
              </span>
            </div>
            {acikItiraz && (
              <p className="mt-[7px] text-[12px] leading-[18px]" style={{ color: '#5a4a44' }}>
                {match.olasiItirazlar[0].yanit}
              </p>
            )}
          </button>
        )}

        {/* Ali rozeti + aksiyonlar */}
        <div className="mt-[13px] flex flex-wrap gap-[8px]">
          <button
            onClick={() => setTaslak({ tur: 'strateji', baslik: `${unit.daire} için konuşma akışı`, alici: customer.ad, govde: stratejiTaslak(customer, unit, match) })}
            className="flex items-center gap-[6px] h-[36px] rounded-[11px] px-[13px] text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: Z.lavGrad }}
          >
            <span className="grid place-items-center rounded-full bg-white/25" style={{ width: 18, height: 18 }}>
              <Image src="/ali-avatar.png" alt="Ali" width={18} height={18} className="rounded-full object-cover" />
            </span>
            Konuşma stratejisi
          </button>
          <button
            onClick={() => setTaslak({ tur: 'whatsapp', baslik: `${customer.ad} için ilk mesaj`, alici: customer.ad, govde: waTaslak(customer, unit) })}
            className="flex items-center gap-[6px] h-[36px] rounded-[11px] px-[13px] text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#25D366' }}
          >
            <MessageCircle size={14} /> WhatsApp taslağı
          </button>
        </div>

        {/* Satış sırası */}
        {altUnits.length > 0 && (
          <div className="mt-[13px] pt-[12px]" style={{ borderTop: `1px solid ${Z.line}` }}>
            <div className="flex items-center gap-[6px] mb-[7px]">
              <MessagesSquare size={13} style={{ color: Z.lavanta }} />
              <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: Z.lavanta }}>Satış sırası</p>
            </div>
            <div className="flex items-center flex-wrap gap-[6px] text-[12px]">
              <span className="rounded-[9px] px-[9px] py-[4px] font-black text-white" style={{ background: Z.lavGrad }}>
                Önce {unit.daire}
              </span>
              {altUnits.map(a => (
                <span key={a.id} className="flex items-center gap-[6px]">
                  <ArrowRight size={12} className="text-slate-300" />
                  <span className="rounded-[9px] px-[9px] py-[4px] font-bold" style={{ background: Z.surface, color: '#475a4e' }}>
                    {a.daire}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-[6px] text-[11px] text-slate-400">Olmazsa sıradaki en uygun alternatife geç.</p>
          </div>
        )}
      </div>

      {taslak && <TaslakModal icerik={taslak} onClose={() => setTaslak(null)} />}
    </div>
  )
}

// Kompakt eşleşme satırı — stoktan müşteriye yönünde müşteri havuzu için
export function EslesmeSatiri({ match }: { match: Match }) {
  const customer = customerById(match.customerId)
  if (!customer) return null
  const tier = TIERS[match.tier]

  return (
    <div className="flex items-center gap-[12px] rounded-[16px] border bg-white p-[12px]" style={{ borderColor: Z.line }}>
      <div className="grid place-items-center rounded-[12px] text-white shrink-0" style={{ width: 46, height: 46, background: tier.bar }}>
        <span className="text-[15px] font-black">%{match.skor}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-black truncate" style={{ color: Z.text }}>{customer.ad}</p>
        <p className="text-[11px] text-slate-400">{PERSONA_ETIKET[customer.persona]} · {customer.lokasyonTercihi[0]}</p>
        <p className="text-[11px] mt-[2px] truncate" style={{ color: '#475a4e' }}>{match.nedenler[0]}</p>
      </div>
      <span className="rounded-full px-[9px] py-[3px] text-[10px] font-bold shrink-0" style={{ background: tier.bg, color: tier.fg }}>
        {tier.label}
      </span>
    </div>
  )
}
