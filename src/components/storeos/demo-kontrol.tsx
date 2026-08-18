'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — DEMO KONTROL PANELİ (Gün 8, "asla kesilmez" listesi)
//
//  Sunum sırasında panelin canlı gitmesini sağlayan tek şey bu ekran. Tasarım
//  kararları jüri odasına göre alındı, geliştirici masasına göre değil:
//
//   · TERMİNAL YOK. Prova sabahı `npx tsx …` yazmak kırılgan; her şey tek
//     tıkla. Terminal script'leri duruyor, ama sunucu onlara mecbur değil.
//   · HER TIKLAMA SONUCU YAZAR. Günlük şeridi ne olduğunu, kaç ms sürdüğünü
//     ve zincirin ne ürettiğini gösterir — "bir şey oldu mu?" sorusu kalmaz.
//   · SÜRE ÖLÇÜLÜR. "Olay → mesaj" ve "buton → panel" sayılarının SUNUCU payı
//     buradan okunur; telefonun titrediği an gözle eklenir (Gün 8 madde 2).
//   · YALAN YOK. Sıfırlama kalıcı depoda çalışmaz; düğme bunu 409 ile söyler
//     ve doğru düğmeyi ("taze tohum") gösterir.
//
//  Bu ekran ürün modülü DEĞİL: `moduller.ts` listesine girmez, menüde yalnız
//  merkez rolüne görünür, uçları `yonetim-kimlik.ts` korur.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { SENARYOLAR, TANIMLAR } from '@/lib/storeos/senaryolar'
import type { Senaryo } from '@/lib/storeos/senaryolar'
import { Kabuk } from './kabuk'
import { Kart, tarihSaatYaz } from './temel'

/** Sağlık anketi — bu ekran veri toplamaz, yalnız hattın nabzını tutar. */
const SAGLIK_ARALIK_MS = 10_000

interface Saglik {
  olculdu: string
  kanal: string
  depo: string
  magazaKodu: string
  whatsapp: { webhookTanimli: boolean; webhookHost: string; tokenTanimli: boolean; inboundTokenTanimli: boolean }
  telefonKilidi: { acik: boolean; hedef: string; engel: string | null }
  sonBildirimler: {
    bildirimId: string; gorevNo: string | null; kanal: string; durum: string
    zaman: string; gidenTelefon: string; hata: string | null; yanit: string | null
  }[]
  sorunlar: string[]
  saglikli: boolean
}

interface GunlukSatiri {
  sira: number
  baslik: string
  ms: number
  basarili: boolean
  ozet: string
  ham: string
}

export function DemoKontrol() {
  const [saglik, setSaglik] = useState<Saglik | null>(null)
  const [saglikHatasi, setSaglikHatasi] = useState<string | null>(null)
  const [gunluk, setGunluk] = useState<GunlukSatiri[]>([])
  const [mesgul, setMesgul] = useState<string | null>(null)
  const [vendorBicimi, setVendorBicimi] = useState(false)
  const [etiket, setEtiket] = useState('')
  const [gorevNo, setGorevNo] = useState('')
  const [aksiyon, setAksiyon] = useState<'kabul' | 'devret' | 'ertele'>('kabul')

  const sira = useRef(0)
  const sonOlay = useRef<{ olayId: string; senaryo: Senaryo; ms: number } | null>(null)

  const saglikCek = useCallback(async () => {
    try {
      const y = await fetch('/api/storeos/demo', { cache: 'no-store' })
      if (!y.ok) {
        const g = (await y.json().catch(() => null)) as { hata?: string } | null
        setSaglikHatasi(g?.hata ?? `Sunucu ${y.status}`)
        return
      }
      setSaglik((await y.json()) as Saglik)
      setSaglikHatasi(null)
    } catch {
      setSaglikHatasi('Sunucuya ulaşılamadı')
    }
  }, [])

  useEffect(() => {
    void saglikCek()
    const z = setInterval(() => { if (document.visibilityState === 'visible') void saglikCek() }, SAGLIK_ARALIK_MS)
    return () => clearInterval(z)
  }, [saglikCek])

  /** Tek gönderim yolu: süre ölçümü, günlük satırı ve sağlık tazeleme burada. */
  const calistir = useCallback(async (
    baslik: string,
    govde: Record<string, unknown>,
    yol = '/api/storeos/demo',
  ) => {
    setMesgul(baslik)
    const t0 = performance.now()
    let basarili = false
    let ozet = ''
    let ham = ''
    try {
      const y = await fetch(yol, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(govde),
      })
      const veri = (await y.json().catch(() => null)) as Record<string, unknown> | null
      basarili = y.ok
      ham = JSON.stringify(veri, null, 2)
      ozet = y.ok ? ozetle(veri) : `HTTP ${y.status} — ${String(veri?.hata ?? 'sebep yok')}${veri?.oneri ? ` · ${String(veri.oneri)}` : ''}`
      if (y.ok && veri?.olayId && typeof veri.olayId === 'string' && veri.senaryo) {
        sonOlay.current = {
          olayId: veri.olayId,
          senaryo: veri.senaryo as Senaryo,
          ms: Number(String(veri.olayId).split('_').at(-2) ?? Date.now()),
        }
      }
    } catch {
      ozet = 'Sunucuya ulaşılamadı — hiçbir şey gönderilmedi.'
      ham = ''
    } finally {
      const ms = Math.round(performance.now() - t0)
      sira.current += 1
      setGunluk(g => [{ sira: sira.current, baslik, ms, basarili, ozet, ham }, ...g].slice(0, 12))
      setMesgul(null)
      void saglikCek()
    }
  }, [saglikCek])

  const kilitliMi = mesgul !== null

  return (
    <Kabuk aktif="/storeos/demo-kontrol">
      <header className="so-ust">
        <h1>Demo kontrol</h1>
        <span className="so-nabiz" data-durum={saglik?.saglikli ? 'iyi' : 'hata'}>
          <span className="so-nabiz-nokta" />
          {saglikHatasi ? 'bağlantı sorunu'
            : saglik ? (saglik.saglikli ? `hat hazır · ${saglik.kanal}` : `${saglik.sorunlar.length} uyarı`)
            : 'bağlanıyor'}
        </span>
        <div className="so-ust-sag">
          <button type="button" className="so-dugme" onClick={() => void saglikCek()}>Yenile</button>
        </div>
      </header>

      <div className="so-govde">
        <p className="so-alt-baslik">
          Sunum aracı — ürün modülü değil. Buradan tetiklenen her olay GERÇEK zincirden geçer:
          adapter → doğrulama → idempotency → kural → görev → bildirim → denetim.
        </p>

        <div className="so-dk-izgara">
          {/* ── Senaryolar ── */}
          <Kart baslik="Senaryo tetikle" sag={
            <label className="so-dk-onay">
              <input
                type="checkbox"
                checked={vendorBicimi}
                onChange={e => setVendorBicimi(e.target.checked)}
              />
              vendor biçimi
            </label>
          }>
            <div className="so-eylemler">
              {SENARYOLAR.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`so-dugme${TANIMLAR[s].faz === 1 ? ' so-dugme-ana' : ''}`}
                  disabled={kilitliMi}
                  title={TANIMLAR[s].aciklama}
                  onClick={() => void calistir(
                    `senaryo · ${TANIMLAR[s].etiket}`,
                    { eylem: 'senaryo', senaryo: s, vendor: vendorBicimi },
                  )}
                >
                  {TANIMLAR[s].etiket}
                  {TANIMLAR[s].faz === 2 && <span className="so-ipucu"> · faz 2</span>}
                </button>
              ))}
            </div>
            <p className="so-altbilgi">
              Mor düğmeler kural üretir (görev + WhatsApp). Faz 2 senaryoları BİLEREK kuralsızdır:
              olay kabul edilir, görev doğmaz — panoda &quot;kural yok&quot; rozetiyle görünür.
            </p>
            <div className="so-eylemler">
              <button
                type="button"
                className="so-dugme so-dugme-kucuk"
                disabled={kilitliMi || !sonOlay.current}
                title="Son olayı AYNI id ile yeniden gönderir — ikinci kayıt oluşmamalı."
                onClick={() => {
                  const o = sonOlay.current
                  if (!o) return
                  void calistir('idempotency · aynı olay tekrar', {
                    eylem: 'tekrar', olayId: o.olayId, senaryo: o.senaryo, ms: o.ms,
                  })
                }}
              >
                Aynı olayı tekrar gönder (idempotency)
              </button>
            </div>
          </Kart>

          {/* ── Tohum / sıfırlama ── */}
          <Kart baslik="Demoyu tazele">
            <div className="so-eylemler">
              <input
                className="so-arama"
                placeholder="etiket (boşsa saat: p1432)"
                value={etiket}
                onChange={e => setEtiket(e.target.value)}
                aria-label="Tohum etiketi"
              />
              <button
                type="button"
                className="so-dugme so-dugme-ana"
                disabled={kilitliMi}
                onClick={() => void calistir('taze tohum', { eylem: 'tohum', etiket })}
              >
                Taze tohum yaz
              </button>
              <button
                type="button"
                className="so-dugme"
                disabled={kilitliMi}
                title="Kalıcı depoda çalışmaz — düğme bunu açıkça söyler."
                onClick={() => void calistir('sıfırla', { eylem: 'sifirla' })}
              >
                Depoyu sıfırla
              </button>
            </div>
            <p className="so-altbilgi">
              Tohum kayıtları kalıcı depoda BİR KEZ yazılır ve zaman damgaları donar; günler sonra
              görevler gecikmiş görünür ve sağlık skoru düşer. &quot;Taze tohum&quot; aynı beş olayı O ANIN
              saatiyle yeniden yazar. Eskisini SİLMEZ — denetim defteri append-only, pano en yeni
              20 alarmı gösterir.
            </p>
          </Kart>

          {/* ── WhatsApp ── */}
          <Kart baslik="WhatsApp hattı">
            {saglik ? (
              <>
                <dl className="so-detay">
                  <Satir ad="Kanal" deger={saglik.kanal} />
                  <Satir ad="Webhook" deger={saglik.whatsapp.webhookTanimli ? saglik.whatsapp.webhookHost : 'TANIMSIZ'} />
                  <Satir ad="n8n token" deger={saglik.whatsapp.tokenTanimli ? 'var' : 'YOK'} />
                  <Satir ad="Gelen token" deger={saglik.whatsapp.inboundTokenTanimli ? 'var' : 'YOK'} />
                  <Satir
                    ad="Demo telefon kilidi"
                    deger={saglik.telefonKilidi.acik ? `AÇIK → ${saglik.telefonKilidi.hedef}` : 'KAPALI'}
                  />
                </dl>
                {saglik.sorunlar.length > 0 && (
                  <ul className="so-dk-sorunlar">
                    {saglik.sorunlar.map(s => <li key={s}>{s}</li>)}
                  </ul>
                )}
              </>
            ) : (
              <p className="so-ipucu">{saglikHatasi ?? 'Sağlık bilgisi alınıyor…'}</p>
            )}

            <div className="so-eylemler">
              <input
                className="so-arama"
                placeholder="görev no (boşsa en son bildirim)"
                value={gorevNo}
                onChange={e => setGorevNo(e.target.value)}
                aria-label="Görev numarası"
              />
              <select
                className="so-arama"
                value={aksiyon}
                onChange={e => setAksiyon(e.target.value as 'kabul' | 'devret' | 'ertele')}
                aria-label="Buton aksiyonu"
              >
                <option value="kabul">Kabul Et</option>
                <option value="devret">Başkasına Ata</option>
                <option value="ertele">5 Dakika Ertele</option>
              </select>
              <button
                type="button"
                className="so-dugme so-dugme-ana"
                disabled={kilitliMi}
                title="Canlı hat düşerse zincirin GELEN yönü buradan akar."
                onClick={() => void calistir(
                  `WhatsApp yanıtı · ${aksiyon}`,
                  { eylem: 'yanit', aksiyon, gorevNo: gorevNo.trim() || undefined },
                )}
              >
                WhatsApp yanıtını simüle et
              </button>
              <button
                type="button"
                className="so-dugme"
                disabled={kilitliMi}
                title="Süresi geçmiş görevleri bir kademe yukarı taşır."
                onClick={() => void calistir('eskalasyon kontrolü', {}, '/api/storeos/escalation/kontrol')}
              >
                Eskalasyon kontrolü
              </button>
            </div>
          </Kart>

          {/* ── Son gönderimler ── */}
          <Kart baslik="Son gönderimler">
            {saglik && saglik.sonBildirimler.length > 0 ? (
              <div className="so-tablo">
                {saglik.sonBildirimler.map(b => (
                  <div key={b.bildirimId} className="so-tablo-satir so-tablo-satir-duz">
                    <span className="so-zaman">{tarihSaatYaz(b.zaman)}</span>
                    <span className="so-satir-ana">
                      <span className="so-satir-baslik">{b.gorevNo ?? b.bildirimId}</span>
                      <span className="so-satir-alt">
                        {b.kanal} · {b.gidenTelefon}
                        {b.yanit && ` · yanıt: ${b.yanit}`}
                        {b.hata && ` · ${b.hata}`}
                      </span>
                    </span>
                    <span className="so-rozet so-notr">{b.durum}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="so-ipucu">
                Henüz gönderim yok. Bir senaryo tetikleyin — kural eşleşirse mesaj buraya düşer.
              </p>
            )}
          </Kart>
        </div>

        {/* ── Günlük ── */}
        <Kart baslik="Günlük" sag={mesgul ? <span className="so-ipucu">{mesgul}…</span> : undefined}>
          {gunluk.length === 0 ? (
            <p className="so-ipucu">Henüz bir şey tetiklenmedi.</p>
          ) : (
            <div className="so-tablo">
              {gunluk.map(g => (
                <details key={g.sira} className="so-tablo-satir">
                  <summary>
                    <span className={`so-rozet ${g.basarili ? 'so-sev-low' : 'so-sev-critical'}`}>
                      {g.basarili ? 'tamam' : 'hata'}
                    </span>
                    <span className="so-satir-ana">
                      <span className="so-satir-baslik">{g.baslik}</span>
                      <span className="so-satir-alt">{g.ozet}</span>
                    </span>
                    {/* Sunucu payı: "olay → mesaj" ölçümünün panelden okunan yarısı. */}
                    <span className="so-rozet so-notr">{g.ms} ms</span>
                  </summary>
                  <pre className="so-dk-ham">{g.ham || '(yanıt yok)'}</pre>
                </details>
              ))}
            </div>
          )}
          <p className="so-altbilgi">
            Süre SUNUCU payıdır: tarayıcıdan isteğin dönüşüne kadar. Telefonun titrediği an buna
            n8n + 360Dialog gecikmesi eklenerek bulunur; o kısım gözle ölçülür.
          </p>
        </Kart>
      </div>
    </Kabuk>
  )
}

function Satir({ ad, deger }: { ad: string; deger: string }) {
  return (
    <div className="so-alan">
      <dt>{ad}</dt>
      <dd>{deger}</dd>
    </div>
  )
}

/** Yanıtı tek satırlık insan cümlesine indirger — ham JSON detayda duruyor. */
function ozetle(v: Record<string, unknown> | null): string {
  if (!v) return 'boş yanıt'
  const s = v.sonuc as Record<string, unknown> | undefined
  if (s && typeof s.kabul === 'number') {
    const gorevler = Array.isArray(s.sonuclar)
      ? (s.sonuclar as Record<string, unknown>[]).flatMap(x => (x.uretilenGorevler as string[]) ?? [])
      : []
    return `kabul:${s.kabul} yinelenen:${s.yinelenen} reddedilen:${s.reddedilen}` +
           (gorevler.length ? ` · görev: ${gorevler.join(', ')}` : ' · görev üretilmedi')
  }
  if (s && typeof s.durum === 'string') {
    return s.durum === 'uygulandi'
      ? `${String(s.gorevNo)} → ${String(s.yeniDurum)}`
      : `${String(s.durum)}${s.sebep ? ` — ${String(s.sebep)}` : ''}${s.not ? ` — ${String(s.not)}` : ''}`
  }
  if (typeof v.etiket === 'string') return `${String(v.not ?? '')} (etiket: ${v.etiket})`
  if (typeof v.not === 'string') return v.not
  if (Array.isArray(v.tetiklenen)) {
    return `eskalasyon: ${v.bakilan} görev bakıldı · ${v.geciken} geciken · ${v.tetiklenen.length} kademe tetiklendi`
  }
  return JSON.stringify(v).slice(0, 160)
}
