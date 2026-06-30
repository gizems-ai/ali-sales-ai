'use client'

import { useState } from 'react'
import { TrendingUp, EyeOff, AlertTriangle, Layers, TrendingDown, Target, FileText, ChevronRight } from 'lucide-react'
import { Z, PERSONA_ETIKET, fmtFiyat, yoneticiOzet } from '@/lib/ali-zeka'
import { ContentViewer } from '@/app/(panel)/gelisim/_components/content-viewer'

function Kart({ baslik, icon, accent, children }: {
  baslik: string; icon: React.ReactNode; accent: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-[22px] border bg-white p-[18px] shadow-sm" style={{ borderColor: Z.line }}>
      <div className="flex items-center gap-[8px] mb-[13px]">
        <span className="grid place-items-center rounded-[10px] text-white" style={{ width: 30, height: 30, background: accent }}>{icon}</span>
        <p className="text-[14px] font-black" style={{ color: Z.text }}>{baslik}</p>
      </div>
      {children}
    </div>
  )
}

function Satir({ ad, alt, deger, degerRenk = Z.text, bar }: {
  ad: string; alt?: string; deger: string; degerRenk?: string; bar?: { val: number; max: number; renk: string }
}) {
  return (
    <div className="py-[8px]" style={{ borderTop: `1px solid ${Z.line}` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: Z.text }}>{ad}</p>
          {alt && <p className="text-[11px] text-slate-400 truncate">{alt}</p>}
        </div>
        <p className="text-[13px] font-black shrink-0" style={{ color: degerRenk }}>{deger}</p>
      </div>
      {bar && (
        <div className="mt-[6px] h-[6px] rounded-full overflow-hidden" style={{ background: '#EEF2EE' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (bar.val / bar.max) * 100)}%`, background: bar.renk }} />
        </div>
      )}
    </div>
  )
}

export function Yonetici() {
  const o = yoneticiOzet()
  const maxOneri = Math.max(1, ...o.enCokOnerilen.map(x => x.sayi))
  const [panoAcik, setPanoAcik] = useState(false)

  return (
    <div className="space-y-[16px]">
      <div className="rounded-[16px] px-[14px] py-[11px] flex items-start gap-[9px]" style={{ background: Z.lavSoft }}>
        <Target size={15} style={{ color: Z.lavanta }} className="shrink-0 mt-[1px]" />
        <p className="text-[12px] leading-[18px]" style={{ color: '#48417e' }}>
          <b>Yönetici görünümü</b> — stok/öneri sağlığını tek ekrandan gör. Skorlar CRM&apos;e özel iç bilgidir; alıcıya bakan yüzeylere taşınmaz.
        </p>
      </div>

      {/* Portföy Durum Panosu — gömülü canlı rapor */}
      <button onClick={() => setPanoAcik(true)}
        className="w-full text-left rounded-[22px] border bg-white p-[16px] shadow-sm flex items-center gap-[14px] transition-shadow hover:shadow-md"
        style={{ borderColor: Z.line }}>
        <span className="grid place-items-center rounded-[13px] text-white shrink-0" style={{ width: 44, height: 44, background: Z.lavGrad }}>
          <FileText size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[8px] flex-wrap">
            <p className="text-[15px] font-black" style={{ color: Z.text }}>Portföy Durum Panosu</p>
            <span className="inline-flex items-center gap-[5px] rounded-full px-[8px] py-[2px] text-[10px] font-bold" style={{ background: '#D1FAE5', color: '#065F46' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />Canlı içerik
            </span>
          </div>
          <p className="text-[12px] text-slate-400 mt-[2px] truncate">Stok analizi + risk-fırsat · Esenyurt · 507 daire / $129,3M</p>
        </div>
        <ChevronRight size={18} className="text-slate-300 shrink-0" />
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        {/* En çok önerilen */}
        <Kart baslik="En çok önerilen stoklar" icon={<TrendingUp size={16} />} accent={Z.green2}>
          {o.enCokOnerilen.map(x => (
            <Satir key={x.unit.id} ad={`${x.unit.daire} · ${x.unit.tip}`} alt={fmtFiyat(x.unit.fiyat)}
              deger={`${x.sayi} öneri`} degerRenk={Z.green2}
              bar={{ val: x.sayi, max: maxOneri, renk: Z.green2 }} />
          ))}
        </Kart>

        {/* Hiç önerilmeyen */}
        <Kart baslik="Hiç önerilmeyen stoklar" icon={<EyeOff size={16} />} accent="#94A3B8">
          {o.hicOnerilmeyen.length === 0 ? (
            <p className="text-[12px] text-slate-400 pt-[4px]">Tüm birimler en az bir müşteriye öneriliyor. 👍</p>
          ) : o.hicOnerilmeyen.map(u => (
            <Satir key={u.id} ad={`${u.daire} · ${u.tip}`} alt={`${u.yaslanmaGunu} gündür stokta · ${fmtFiyat(u.fiyat)}`}
              deger="0 öneri" degerRenk="#94A3B8" />
          ))}
        </Kart>

        {/* Yanlış / zor eşleşmeler */}
        <Kart baslik="Zor eşleşen stoklar" icon={<AlertTriangle size={16} />} accent={Z.coral}>
          <p className="text-[11px] text-slate-400 mb-[2px] -mt-[6px]">En iyi 3 müşteriyle ortalama uyum skoru düşük olanlar</p>
          {o.yanlisEslesmeler.map(x => (
            <Satir key={x.unit.id} ad={`${x.unit.daire} · ${x.unit.tip}`}
              alt={x.unit.nedenZor ?? `${x.unit.yaslanmaGunu} gündür stokta`}
              deger={`%${x.ortSkor}`} degerRenk={x.ortSkor < 60 ? Z.coral : '#F59E0B'} />
          ))}
        </Kart>

        {/* Temsilci doğruluk */}
        <Kart baslik="Temsilci öneri doğruluğu" icon={<Target size={16} />} accent={Z.lavanta}>
          <p className="text-[11px] text-slate-400 mb-[2px] -mt-[6px]">Öneri → dönüşüm oranı (fixture)</p>
          {o.temsilciDogruluk.map(t => {
            const oran = Math.round((t.donusum / t.oneri) * 100)
            return (
              <Satir key={t.ad} ad={t.ad} alt={`${t.oneri} öneri · ${t.donusum} dönüşüm`}
                deger={`%${oran}`} degerRenk={Z.lavanta}
                bar={{ val: oran, max: 100, renk: Z.lavGrad }} />
            )
          })}
        </Kart>

        {/* Segment birikmesi */}
        <Kart baslik="Hangi segmentte stok birikiyor?" icon={<Layers size={16} />} accent="#F59E0B">
          {o.segmentBirikme.map(s => (
            <Satir key={s.segment} ad={s.segment} alt={`Ortalama ${s.ortYas} gün stokta`}
              deger={s.sayi > 0 ? `${s.sayi} yaşlanan` : 'sağlıklı'}
              degerRenk={s.sayi >= 2 ? Z.coral : s.sayi === 1 ? '#F59E0B' : Z.green2} />
          ))}
        </Kart>

        {/* Azalan persona talebi */}
        <Kart baslik="Hangi müşteri tipi azalıyor?" icon={<TrendingDown size={16} />} accent="#94A3B8">
          <p className="text-[11px] text-slate-400 mb-[2px] -mt-[6px]">Havuzdaki persona dağılımı (en düşük talep üstte)</p>
          {o.azalanPersona.map(p => (
            <Satir key={p.persona} ad={PERSONA_ETIKET[p.persona]}
              deger={`${p.talep} müşteri`}
              degerRenk={p.talep <= 1 ? Z.coral : p.talep === 2 ? '#F59E0B' : Z.green2}
              bar={{ val: p.talep, max: 4, renk: p.talep <= 1 ? Z.coral : p.talep === 2 ? '#F59E0B' : Z.green2 }} />
          ))}
        </Kart>
      </div>

      <ContentViewer
        open={panoAcik}
        baslik="Portföy Durum Panosu"
        src="/decks/Babacan_Portfoy_Durum_Panosu.html"
        onClose={() => setPanoAcik(false)}
      />
    </div>
  )
}
