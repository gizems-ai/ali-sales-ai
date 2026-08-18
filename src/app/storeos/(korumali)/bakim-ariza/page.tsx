// ════════════════════════════════════════════════════════════════════════════
//  /storeos/bakim-ariza — BAKIM & ARIZA (kapsam gösterisi · 18 Ağu 2026)
//
//  Varlık envanteri (kamera, NVR, switch, POS, HVAC, aydınlatma), açık arıza
//  kayıtları SLA sayacıyla ve önleyici bakım takvimi.
//
//  NOT: store.camera.offline / store.camera.degraded olayları bugün de gerçek
//  kurallarla görev üretiyor (bkz. modül haritası). Bu ekran o hattın
//  görselleştirilmiş hâlidir ama şu an seed'den beslenir.
//
//  SALT OKUNUR · seed.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulEkrani, ModulIkili, ModulListe, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { bakimModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

const VARLIK_DURUMU = { calisiyor: 'Çalışıyor', uyari: 'Uyarı', ariza: 'Arıza' } as const

function kalanYaz(dk: number): string {
  if (dk <= 0) return 'kapandı'
  if (dk < 60) return `${dk} dk kaldı`
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk kaldı`
}

export default function BakimArizaSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, varliklar, arizalar, takvim } = bakimModulu(gun)
  const sorunlu = varliklar.filter(v => v.durum !== 'calisiyor').length

  return (
    <Kabuk aktif="/storeos/bakim-ariza">
      <ModulEkrani
        baslik="Bakım & Arıza"
        aciklama="Cihaz envanteri, açık arıza kayıtları SLA sayacıyla ve önleyici bakım takvimi."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{sorunlu} varlık dikkat gerektiriyor</span>}
      >
        <ModulTablo
          baslik="Varlık envanteri"
          basliklar={['Varlık', 'Tür', 'Konum', 'Durum', 'Son bakım', 'Garanti']}
          sutunlar="1.1fr 1fr 1.1fr .8fr .9fr .7fr"
          satirlar={varliklar.map(v => ({
            anahtar: v.ad,
            hucreler: [v.ad, v.tur, v.konum, VARLIK_DURUMU[v.durum], v.sonBakim, v.garanti],
            vurgu: v.durum === 'ariza' ? ('kritik' as const)
              : v.durum === 'uyari' ? ('dikkat' as const) : ('iyi' as const),
          }))}
        />

        <ModulIkili>
          <ModulTablo
            baslik="Arıza kayıtları"
            basliklar={['Kayıt', 'Varlık', 'Açılış', 'SLA', 'Durum']}
            sutunlar=".9fr 1fr .7fr 1.2fr .8fr"
            satirlar={arizalar.map(a => ({
              anahtar: a.no,
              hucreler: [a.no, a.varlik, a.acilis, `${a.sla} · ${kalanYaz(a.kalanDk)}`, a.durum],
              vurgu: a.kalanDk === 0 ? ('iyi' as const)
                : a.kalanDk < 60 ? ('kritik' as const) : ('dikkat' as const),
            }))}
          />

          <ModulListe
            baslik="Önleyici bakım takvimi"
            sag={<span className="so-kart-not">{takvim.length} planlı iş</span>}
            satirlar={takvim.map((t, i) => ({
              anahtar: `${t.tarih}-${i}`,
              sol: t.tarih,
              ana: t.is,
              alt: t.sorumlu,
            }))}
          />
        </ModulIkili>
      </ModulEkrani>
    </Kabuk>
  )
}
