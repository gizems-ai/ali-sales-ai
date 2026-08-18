'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — ALİ ASİSTAN SOHBETİ (18 Ağu 2026 · kapsam gösterisi)
//
//  ── NE YAPAR, NE YAPMAZ ────────────────────────────────────────────────────
//  Doğal dil sorgusu YOK. Bu ekran altı HAZIR soruyu yanıtlar; serbest metin
//  kutusu bilinçli olarak konulmadı — olmayan bir yeteneği ima eden boş bir
//  giriş kutusu, jüri bir şey yazınca demoyu bitirir. Ekranda bunu açıkça
//  söyleyen bir not var ve kaldırılmaz.
//
//  ── SAYILAR GERÇEK ─────────────────────────────────────────────────────────
//  Cevap GÖVDESİ seed'dir (`ALI_SENARYOLARI`), ama içindeki `{alarm}`,
//  `{gorev}`, `{uyari}` yer tutucuları kural motorunun ŞU ANKİ çıktısıyla
//  doldurulur: `/api/storeos/dashboard?katman=canli` bir kez okunur ve
//  `aliOzeti()` ile — panonun kullandığı AYNI fonksiyon — sayılara çevrilir.
//  Panoya bakan biri aynı üç sayıyı görür; ekranlar birbirini yalanlayamaz.
//
//  ── ZİNCİRE YÜK BİNMEZ ─────────────────────────────────────────────────────
//  ANKET YOK. Tek istek, yalnız ilk açılışta. Airtable istek bütçesi (base
//  başına ~5 istek/sn) canlı ekranlarındır; bu ekran ondan pay almaz.
//
//  ── SALT OKUNUR ────────────────────────────────────────────────────────────
//  Aksiyon düğmeleri ya var olan bir ekrana GÖTÜRÜR ya da devre dışıdır.
//  Hiçbiri görev yaratmaz, hiçbiri mesaj göndermez: bu ekran zincire yazmaz.
// ════════════════════════════════════════════════════════════════════════════

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AliCevabi } from '@/lib/storeos/depo/demo-metrikler'
import { ALI_SENARYOLARI } from '@/lib/storeos/depo/demo-metrikler'
import type { DashboardVerisi } from '@/lib/storeos/dashboard/tipler'
import { aliOzeti } from './ali'
import type { AliOzeti } from './ali'
import { Kart } from './temel'

const AVATAR = '/storeos/ali-avatar.png'

/** "Yazıyor…" süresi (ms). Sabit — `Math.random` yasak, hız da tahmin edilebilir. */
const YAZIYOR_MS = 550

/**
 * Aksiyon etiketi → gidilecek ekran. Listede olmayan etiket DEVRE DIŞI çizilir:
 * ölü düğme yerine "yakında" diyen dürüst düğme.
 */
const AKSIYON_YOLU: Record<string, string> = {
  'Görev Ekranını Aç': '/storeos/gorevler',
  'Analiz Ekranını Aç': '/storeos/magaza-analizleri',
  'Raf Ekranını Aç': '/storeos/raf-stok',
  'Kasa Planını Aç': '/storeos/kasa-kuyruk',
}

interface Mesaj {
  id: string
  kim: 'kullanici' | 'ali'
  metin?: string
  cevap?: AliCevabi
}

const ACILIS: Mesaj = {
  id: 'acilis',
  kim: 'ali',
  metin: 'Merhaba. Mağazanın bugünkü durumunu takip ediyorum — kuyruk, raf, kamera ve '
    + 'görev akışını. Aşağıdaki hazır sorulardan birini seçin; cevabı durum, neden, etki, '
    + 'öneri ve aksiyon sırasıyla veriyorum.',
}

/** `{alarm}` / `{gorev}` / `{uyari}` → kural motorunun gerçek sayıları. */
function doldur(metin: string, o: AliOzeti): string {
  return metin
    .replace(/\{alarm\}/g, String(o.gelisme))
    .replace(/\{gorev\}/g, String(o.gorev))
    .replace(/\{uyari\}/g, String(o.uyari))
}

export function AliSohbet() {
  const [ozet, setOzet] = useState<AliOzeti | null>(null)
  const [okundu, setOkundu] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([ACILIS])
  const [yaziyor, setYaziyor] = useState(false)
  const [sorulan, setSorulan] = useState<Set<number>>(new Set())

  const canli = useRef(true)
  const akisSonu = useRef<HTMLDivElement | null>(null)
  useEffect(() => () => { canli.current = false }, [])

  // TEK istek — anket yok. Sayılar gelene kadar sorular kilitli: uydurulmuş bir
  // "3 açık alarm" cümlesi kurmaktansa yarım saniye beklemek yeğdir.
  useEffect(() => {
    void (async () => {
      try {
        const y = await fetch('/api/storeos/dashboard?katman=canli', { cache: 'no-store' })
        if (!canli.current) return
        if (!y.ok) { setHata('Kural motoru okunamadı'); setOkundu(true); return }
        const v = (await y.json()) as DashboardVerisi
        if (!canli.current) return
        setOzet(aliOzeti(v.alarmlar, v.gorevOzeti))
        setOkundu(true)
      } catch {
        if (!canli.current) return
        setHata('Sunucuya ulaşılamadı')
        setOkundu(true)
      }
    })()
  }, [])

  // Yeni mesaj gelince akışın sonuna kaydır.
  useEffect(() => {
    akisSonu.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [mesajlar, yaziyor])

  const sor = useCallback((i: number) => {
    if (yaziyor || ozet === null) return
    const s = ALI_SENARYOLARI[i]
    setSorulan(o => new Set(o).add(i))
    setMesajlar(o => [...o, { id: `s${i}-${o.length}`, kim: 'kullanici', metin: s.soru }])
    setYaziyor(true)
    const z = setTimeout(() => {
      if (!canli.current) return
      setYaziyor(false)
      setMesajlar(o => [...o, {
        id: `c${i}-${o.length}`,
        kim: 'ali',
        cevap: {
          durum: doldur(s.cevap.durum, ozet),
          neden: doldur(s.cevap.neden, ozet),
          etki: doldur(s.cevap.etki, ozet),
          oneri: doldur(s.cevap.oneri, ozet),
          aksiyonlar: s.cevap.aksiyonlar,
        },
      }])
    }, YAZIYOR_MS)
    return () => clearTimeout(z)
  }, [ozet, yaziyor])

  return (
    <>
      <Kart
        baslik="Ali Asistan"
        ornek="demo"
        sag={
          <span className="so-kart-not">
            {hata
              ? `${hata} — sayılar gösterilmiyor`
              : ozet
                ? `${ozet.gelisme} açık alarm · ${ozet.gorev} açık görev · canlı zincirden`
                : 'kural motoru okunuyor…'}
          </span>
        }
      >
        <div className="so-ali-akis">
          {mesajlar.map(m => (
            <div key={m.id} className="so-ali-balon" data-kim={m.kim}>
              {m.metin}
              {m.cevap && <CevapGovdesi cevap={m.cevap} />}
            </div>
          ))}
          {yaziyor && (
            <div className="so-ali-yazan">
              <Image src={AVATAR} alt="" width={18} height={18} style={{ borderRadius: '50%' }} />
              {' '}Ali yazıyor<span>…</span>
            </div>
          )}
          <div ref={akisSonu} />
        </div>

        <div className="so-ali-oneriler">
          {ALI_SENARYOLARI.map((s, i) => (
            <button
              key={s.soru}
              type="button"
              className="so-ali-oneri"
              onClick={() => sor(i)}
              disabled={ozet === null || yaziyor || sorulan.has(i)}
              title={ozet === null
                ? 'Kural motorunun sayıları okunuyor — cevaptaki rakamlar gerçek olsun diye bekleniyor.'
                : undefined}
            >
              {s.soru}
            </button>
          ))}
        </div>

        <p className="so-modul-dipnot">
          Doğal dil sorgusu pilotta; bu demoda Ali yalnız yukarıdaki altı hazır senaryoyu
          yanıtlar. Cevap metinleri örnek veridir — <b>içindeki alarm ve görev sayıları
          gerçektir</b>, panonun okuduğu aynı kural motoru çıktısından gelir. Ali bu ekrandan
          görev yaratmaz ve mesaj göndermez.
          {okundu && hata && ' Şu an kural motoru okunamadığı için sorular kilitli.'}
        </p>
      </Kart>
    </>
  )
}

function CevapGovdesi({ cevap }: { cevap: AliCevabi }) {
  return (
    <div>
      <div className="so-ali-satir">
        <span className="so-ali-etiket">Durum</span>
        <span className="so-ali-metin">{cevap.durum}</span>
      </div>
      <div className="so-ali-satir">
        <span className="so-ali-etiket">Neden</span>
        <span className="so-ali-metin">{cevap.neden}</span>
      </div>
      <div className="so-ali-satir">
        <span className="so-ali-etiket">Etki</span>
        <span className="so-ali-metin">{cevap.etki}</span>
      </div>
      <div className="so-ali-satir">
        <span className="so-ali-etiket">Öneri</span>
        <span className="so-ali-metin">{cevap.oneri}</span>
      </div>
      <div className="so-eylemler" style={{ marginTop: 10 }}>
        {cevap.aksiyonlar.map(a => {
          const yol = AKSIYON_YOLU[a]
          return yol
            ? <Link key={a} className="so-dugme" href={yol}>{a}</Link>
            : (
              <button
                key={a}
                type="button"
                className="so-dugme"
                disabled
                title="Bu ekran salt okunurdur — Ali buradan görev yaratmaz. Görev üretimi kural motorunda çalışıyor (Görevler ekranı)."
              >
                {a}
              </button>
            )
        })}
      </div>
    </div>
  )
}
