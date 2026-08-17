// ════════════════════════════════════════════════════════════════════════════
//  Store OS — PANO AÇILIŞ TOHUMU (madde C: "ekran asla boş açılmasın")
//
//  Sorun: pano ilk açıldığında alarm yok, görev yok, sağlık skoru 100 ve
//  gerekçesi "ceza kalemi yok" yazıyordu. Boş panel her temada zayıf görünür
//  ve 100/100 bir mağaza gerçekçi değildir.
//
//  ── ÇÖZÜM: SAHTE KAYIT DEĞİL, GERÇEK ZİNCİR ────────────────────────────────
//  Alarm ve görev tablosuna elle satır BASILMAZ. Bunun yerine birkaç olay
//  zincirin normal girişinden (`olaylariAl`) geçirilir:
//      olay → adapter → doğrulama → idempotency → kural motoru → görev
//           → bildirim → kanal → denetim
//  Yani ekranda görünen her alarm ve görev, jüriye anlatılan hattın gerçek
//  çıktısıdır. Panelde "demo veri" yazan tek şey METRİKLER olarak kalır
//  (`demo-metrikler.ts`), zincirin kendisi değil.
//
//  ── SAĞLIK SKORU ───────────────────────────────────────────────────────────
//  Tohum bilerek 80'ler bandına oturur: 5 alarm (1 yüksek · 2 orta · 2 düşük)
//  + 3 açık görev + gecikmiş görev yok → 100 − 15 − 4,5 ≈ 81 "İyi".
//  Sayı elle yazılmaz, `toplayici.ts` formülünden çıkar; zamanlamalar SLA'ları
//  aşmayacak şekilde seçildi ki skor gecikme cezası yemesin.
//
//  ── GÜVENLİK ───────────────────────────────────────────────────────────────
//   · Kanal AÇIKÇA konsoldur — tohum hiçbir koşulda WhatsApp'a çıkmaz.
//   · Yalnız BELLEK deposunda çalışır; Airtable'a tohum yazılmaz.
//   · Olay ID'leri sabittir → ikinci kez koşarsa "yinelenen" döner, çoğalmaz.
// ════════════════════════════════════════════════════════════════════════════

import type { Depo } from './depo/tipler'
import { KonsolKanali } from './kanal/konsol'
import { olaylariAl } from './olay-alim'

const MAGAZA = '0178'

/** Mağaza saati (+03:00) — panelin geri kalanıyla aynı ofset. */
function isoTr(ms: number): string {
  const d = new Date(ms + 180 * 60_000)
  return `${d.toISOString().slice(0, 19)}+03:00`
}

interface TohumOlayi {
  id: string
  /** Kaç dakika önce gerçekleşmiş sayılacak. */
  dakikaOnce: number
  tip: string
  kamera: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  metadata: Record<string, unknown>
}

/**
 * Beş olay. Üçü kural yakalar (→ 3 açık görev), ikisi FAZ 2 tipidir ve
 * BİLEREK kuralsızdır: panoda "kural yok" rozetiyle görünür. Demoda her
 * olayın bir görev doğurmadığını göstermek, hepsinin doğurmasından dürüsttür.
 */
const TOHUM: TohumOlayi[] = [
  {
    id: 'evt_tohum_01', dakikaOnce: 150,
    tip: 'store.camera.degraded', kamera: `${MAGAZA}-depo`,
    severity: 'low', confidence: 0.74,
    metadata: { issue: 'dusuk_isik' },
  },
  {
    id: 'evt_tohum_02', dakikaOnce: 70,
    tip: 'store.shelf.gap_detected', kamera: `${MAGAZA}-kozmetik`,
    severity: 'low', confidence: 0.81,
    metadata: { zoneId: 'kozmetik', shelfId: 'KZ-11', gapRatio: 0.28 },
  },
  {
    id: 'evt_tohum_03', dakikaOnce: 40,
    tip: 'store.shelf.stock_low', kamera: `${MAGAZA}-kozmetik`,
    severity: 'medium', confidence: 0.79,
    metadata: { zoneId: 'kozmetik', shelfId: 'KZ-04', fillRatePercent: 24, missingFacings: 8 },
  },
  {
    id: 'evt_tohum_04', dakikaOnce: 8,
    tip: 'store.queue.length_changed', kamera: `${MAGAZA}-kasa`,
    severity: 'medium', confidence: 0.88,
    metadata: { registerId: 'kasa-3', queueLength: 5, avgWaitSeconds: 268, maxWaitSeconds: 310 },
  },
  {
    id: 'evt_tohum_05', dakikaOnce: 3,
    tip: 'store.queue.threshold_exceeded', kamera: `${MAGAZA}-kasa`,
    severity: 'high', confidence: 0.93,
    metadata: { registerId: 'kasa-2', queueLength: 7, avgWaitSeconds: 251, maxWaitSeconds: 300 },
  },
]

export interface TohumSonucu {
  kabul: number
  yinelenen: number
  reddedilen: number
}

/**
 * Panoyu dolu başlatır. Idempotenttir: aynı ID'lerle ikinci çağrı her olayı
 * "yinelenen" olarak döndürür, kayıt çoğaltmaz.
 *
 * @param simdiMs Testler için sabitlenebilir "şimdi". Verilmezse `Date.now()`.
 * @param etiket  Olay ID'lerine eklenen sonek. Kalıcı depoda (Airtable) tohum
 *   BİR KEZ yazılır ve zaman damgaları donar; günler sonra görevler gecikmiş
 *   görünür ve skor düşer. Prova/jüri sabahı `scripts/storeos/tohum.ts` bu
 *   parametreyle TAZE bir parti yazar — eskisini silmez (denetim defteri
 *   append-only), sadece üstüne yenisini koyar; pano en yeni 20 alarmı gösterir.
 */
export async function panoyuTohumla(
  depo: Depo, simdiMs?: number, etiket?: string,
): Promise<TohumSonucu> {
  const taban = simdiMs ?? Date.now()
  const sonek = etiket ? `_${etiket}` : ''
  const kanal = new KonsolKanali()
  const sonuc: TohumSonucu = { kabul: 0, yinelenen: 0, reddedilen: 0 }

  for (const t of TOHUM) {
    const an = isoTr(taban - t.dakikaOnce * 60_000)
    const r = await olaylariAl({
      depo,
      kanal,
      govde: {
        id: `${t.id}${sonek}`,
        storeCode: MAGAZA,
        cameraId: t.kamera,
        eventType: t.tip,
        occurredAt: an,
        severity: t.severity,
        confidence: t.confidence,
        metadata: t.metadata,
      },
      aktor: 'demo-tohum',
      aktorTipi: 'system',
      kaynak: 'simulator',
      simdi: an,
    })
    sonuc.kabul += r.kabul
    sonuc.yinelenen += r.yinelenen
    sonuc.reddedilen += r.reddedilen
  }

  return sonuc
}
