'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — LİSTE EKRANLARI (Alarmlar · Görevler · Denetim kaydı)
//
//  Üç ekran TEK bileşen ailesidir: aynı kabuk, aynı filtre şeridi, aynı boş/
//  hata/tavan davranışı. Sadece tablo gövdesi görünüme göre değişir. Gerekçe:
//  üç ayrı ekran dosyası, üçüncü haftada üç farklı boş-durum metnine ve iki
//  farklı "yenile" düğmesine dönüşür.
//
//  APTAL BİLEŞEN KURALI KORUNUYOR: veri `useListe()`'den TEK yerde gelir,
//  tablolar prop alır, hiçbiri kendi isteğini atmaz.
//
//  ── SALT OKUNUR (Gün 4 sınırı) ─────────────────────────────────────────────
//  Bu ekranlarda görev durumu değiştiren bir düğme YOKTUR. Görev geçişi
//  (`gorev.ts:gecisYap`) yazma yolu demektir ve yazma yolu denetim kaydı,
//  yetki kontrolü ve 409 davranışı ister — kendi başına bir gün. Gri bir
//  "Tamamla" düğmesi koymaktansa hiç koymamak dürüst.
//
//  ── ZİNCİR GÖRÜNÜR ─────────────────────────────────────────────────────────
//  Ekranlar birbirine bağlı: alarm → doğurduğu görev → görevin denetim izi.
//  Bağlantılar `?entity=` taşır; sunucu bunu `entityId` filtresine çevirir.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import type {
  AlarmDetayi, DenetimGorunumu, GorevDetayi, Gorunum, ListeFiltresi,
  ListeVerisi, SecenekSayaci,
} from '@/lib/storeos/liste/tipler'
import {
  gorevDurumEtiketi, oncelikEtiketi, oncelikSinifi, severityEtiketi,
  severitySinifi,
} from '@/lib/storeos/tema'
import { Kabuk } from './kabuk'
import {
  BosDurum, HataDurumu, Iskelet, Kart, OrnekVeri, gecenSure, sayiYaz, saatYaz,
  tarihSaatYaz,
} from './temel'
import { useListe } from './use-liste'

// ─── Ekran metinleri ─────────────────────────────────────────────────────────

interface EkranMetni {
  yol: string
  baslik: string
  altBaslik: string
  bosBaslik: string
  bosMetin: string
  birim: string
}

const METIN: Record<Gorunum, EkranMetni> = {
  alarmlar: {
    yol: '/storeos/alarmlar',
    baslik: 'Alarmlar',
    altBaslik: 'Kameralardan gelen olayların tam kaydı — kurala eşleşen de, eşleşmeyen de.',
    bosBaslik: 'Bu filtreyle olay yok',
    bosMetin: 'Filtreyi genişletin ya da olay simülatörünü çalıştırın. Boş liste bir hata değildir.',
    birim: 'olay',
  },
  gorevler: {
    yol: '/storeos/gorevler',
    baslik: 'Görevler',
    altBaslik: 'Kural eşleşmesinden doğan işler; önceliğe ve son teslime göre sıralı.',
    bosBaslik: 'Bu filtreyle görev yok',
    bosMetin: 'Bir kural eşleştiğinde görev otomatik oluşur ve ilgili kişiye bildirim gider.',
    birim: 'görev',
  },
  denetim: {
    yol: '/storeos/denetim',
    baslik: 'Denetim kaydı',
    altBaslik: 'Zincirin her adımı — kim, ne zaman, neyi değiştirdi. Kayıtlar silinemez.',
    bosBaslik: 'Denetim kaydı boş',
    bosMetin: 'Sisteme ilk olay ulaştığında buraya satır düşer.',
    birim: 'kayıt',
  },
}

// ─── Filtre şeridi ───────────────────────────────────────────────────────────

function SuzgecSeridi({
  secenekler, secili, tiklanabilir, sec,
}: {
  secenekler: SecenekSayaci[]
  secili: string
  /** Denetimde sayaçlar bilgi amaçlıdır; düğme değil, şerittir. */
  tiklanabilir: boolean
  sec: (deger: string) => void
}) {
  if (secenekler.length <= 1) return null
  return (
    <div className="so-suzgec" role={tiklanabilir ? 'group' : undefined} aria-label="Süzgeçler">
      {secenekler.map(s => (
        tiklanabilir ? (
          <button
            key={s.deger}
            type="button"
            className="so-suzgec-oge"
            aria-pressed={s.deger === secili}
            onClick={() => sec(s.deger)}
          >
            {s.etiket}
            <span className="so-suzgec-adet">{sayiYaz(s.adet)}</span>
          </button>
        ) : (
          <span key={s.deger} className="so-suzgec-oge" data-bilgi="1">
            {s.etiket}
            <span className="so-suzgec-adet">{sayiYaz(s.adet)}</span>
          </span>
        )
      ))}
    </div>
  )
}

/** Yazarken her tuşta istek atmasın diye 400 ms geciktirilir. */
function AramaKutusu({ deger, ara }: { deger: string | null; ara: (q: string | null) => void }) {
  const [metin, setMetin] = useState(deger ?? '')

  // Dışarıdan (derin bağlantı / filtre temizleme) değişirse kutu da güncellensin.
  useEffect(() => { setMetin(deger ?? '') }, [deger])

  useEffect(() => {
    const kirp = metin.trim()
    if (kirp === (deger ?? '')) return
    const z = setTimeout(() => ara(kirp || null), 400)
    return () => clearTimeout(z)
  }, [metin, deger, ara])

  return (
    <input
      type="search"
      className="so-arama"
      placeholder="Ara…"
      value={metin}
      onChange={e => setMetin(e.target.value)}
      aria-label="Listede ara"
    />
  )
}

/** Derin bağlantıyla gelen `entity` filtresi — görünür ve kaldırılabilir olmalı. */
function EntityRozeti({ entity, temizle }: { entity: string; temizle: () => void }) {
  return (
    <span className="so-entity">
      <span className="so-entity-etiket">tek kayıt</span>
      <code>{entity}</code>
      <button type="button" className="so-entity-kapat" onClick={temizle} aria-label="Kayıt filtresini kaldır">×</button>
    </span>
  )
}

/**
 * SESSİZ KIRPMA YOK. Tavana dayanıldığında ekran bunu söyler — "listede 12
 * kritik var" ile "taranan son 200 kayıtta 12 kritik var" farklı cümlelerdir.
 */
function TavanUyarisi({ veri }: { veri: ListeVerisi }) {
  if (!veri.tavanaUlasildi) return null
  return (
    <div className="so-tavan" role="status">
      En yeni <strong>{sayiYaz(veri.tavan)}</strong> kayıt tarandı; daha eskisi bu ekrana
      hiç getirilmedi. Sayılar ve süzgeçler yalnız taranan bu küme için geçerlidir.
      (Sayfalama Airtable canlıya bağlandığında eklenecek.)
    </div>
  )
}

// ─── Ortak satır parçaları ───────────────────────────────────────────────────

function Bag({ yol, children, baslik }: { yol: string; children: React.ReactNode; baslik?: string }) {
  return <a className="so-bag" href={yol} title={baslik}>{children}</a>
}

function Alan({ ad, children }: { ad: string; children: React.ReactNode }) {
  return (
    <div className="so-alan">
      <dt>{ad}</dt>
      <dd>{children}</dd>
    </div>
  )
}

// ─── Alarm tablosu ───────────────────────────────────────────────────────────

function AlarmSatiri({ a, simdiMs }: { a: AlarmDetayi; simdiMs: number }) {
  // Uçtan uca gecikme: olayın gerçekleştiği an ile bizim kabul ettiğimiz an.
  // Partner entegrasyonunun sağlığını gösteren tek sayı budur.
  const olustuMs = Date.parse(a.olustu)
  const alindiMs = Date.parse(a.alindi)
  const gecikmeSn = Number.isNaN(olustuMs) || Number.isNaN(alindiMs)
    ? null
    : Math.max(0, Math.round((alindiMs - olustuMs) / 1000))

  return (
    <details className="so-tablo-satir">
      <summary>
        <span className={severitySinifi(a.severity)}>{severityEtiketi(a.severity)}</span>
        <span className="so-satir-ana">
          <span className="so-satir-baslik">{a.baslik}</span>
          <span className="so-satir-alt">
            {a.kameraAdi ?? 'kamera yok'} · {saatYaz(a.olustu)} · {gecenSure(a.olustu, simdiMs)}
          </span>
        </span>
        {a.gorevNo
          ? <span className="so-rozet so-sev-low">{a.gorevNo}</span>
          : a.eslesenKural
            // Kural eşleşmiş ama görev listede yok: tavanın dışında kalmış olabilir.
            ? <span className="so-rozet so-notr" title="Kural eşleşti; görev kaydı taranan kümede bulunamadı.">görev bulunamadı</span>
            : <span className="so-rozet so-notr" title="Bu olay tipi için tanımlı kural yok — olay kaydedildi, görev üretilmedi.">kural yok</span>}
        <OrnekVeri veriTipi={a.veriTipi} />
      </summary>

      <dl className="so-detay">
        <Alan ad="Olay ID"><code>{a.olayId}</code></Alan>
        <Alan ad="Olay tipi"><code>{a.olayTipi}</code></Alan>
        <Alan ad="Gerçekleşti">{tarihSaatYaz(a.olustu)}</Alan>
        <Alan ad="Bize ulaştı">
          {tarihSaatYaz(a.alindi)}
          {gecikmeSn !== null && <span className="so-ipucu"> · {sayiYaz(gecikmeSn)} sn gecikme</span>}
        </Alan>
        <Alan ad="Güven">%{sayiYaz(Math.round(a.guven * 100))}</Alan>
        <Alan ad="Adapter"><code>{a.kaynakAdapter}</code></Alan>
        <Alan ad="Kural">{a.eslesenKural ?? <span className="so-ipucu">eşleşme yok</span>}</Alan>
        <Alan ad="İşlendi">{a.islendi ? 'evet' : 'hayır'}</Alan>

        {a.metadata.length > 0 && (
          <div className="so-alan so-alan-genis">
            <dt>Metadata</dt>
            <dd>
              <div className="so-metadata">
                {a.metadata.map(m => (
                  <span key={m.anahtar} className="so-metadata-cift">
                    <code>{m.anahtar}</code>
                    <b>{m.deger}</b>
                  </span>
                ))}
              </div>
            </dd>
          </div>
        )}

        <div className="so-alan so-alan-genis">
          <dt>Zincir</dt>
          <dd className="so-baglar">
            {a.gorevNo && <Bag yol={`/storeos/gorevler?entity=${encodeURIComponent(a.gorevNo)}`}>doğan görev →</Bag>}
            <Bag yol={`/storeos/denetim?entity=${encodeURIComponent(a.olayId)}`}>denetim izi →</Bag>
          </dd>
        </div>
      </dl>
    </details>
  )
}

// ─── Görev tablosu ───────────────────────────────────────────────────────────

/** Kalan süreyi insan diline çevirir. Negatif = gecikme. */
function kalanYaz(dk: number): string {
  const mutlak = Math.abs(dk)
  const metin = mutlak < 60
    ? `${sayiYaz(mutlak)} dk`
    : mutlak < 1440 ? `${sayiYaz(Math.round(mutlak / 60))} sa` : `${sayiYaz(Math.round(mutlak / 1440))} gün`
  return dk < 0 ? `${metin} gecikme` : `${metin} kaldı`
}

function GorevSatiri({ g }: { g: GorevDetayi }) {
  return (
    <details className="so-tablo-satir">
      <summary>
        <span className={`so-rozet ${oncelikSinifi(g.oncelik)}`}>{g.gorevNo}</span>
        <span className="so-satir-ana">
          <span className="so-satir-baslik">{g.baslik}</span>
          <span className="so-satir-alt">
            {g.atananAd ?? g.atananRol} · son teslim {tarihSaatYaz(g.sonTeslim)}
            {g.kalanDk !== null && ` · ${kalanYaz(g.kalanDk)}`}
          </span>
        </span>
        {g.gecikti && <span className="so-rozet so-sev-critical">gecikti</span>}
        <span className="so-rozet so-notr">{gorevDurumEtiketi(g.durum)}</span>
        <OrnekVeri veriTipi={g.veriTipi} />
      </summary>

      <dl className="so-detay">
        <div className="so-alan so-alan-genis">
          <dt>Açıklama</dt>
          <dd>{g.aciklama || <span className="so-ipucu">—</span>}</dd>
        </div>
        <Alan ad="Öncelik">{oncelikEtiketi(g.oncelik)}</Alan>
        <Alan ad="Atanan">{g.atananAd ?? <span className="so-ipucu">atanmadı</span>} · {g.atananRol}</Alan>
        <Alan ad="Oluşturuldu">{tarihSaatYaz(g.olusturuldu)}</Alan>
        <Alan ad="Son teslim">{tarihSaatYaz(g.sonTeslim)}</Alan>
        <Alan ad="Görüldü">{g.goruldu ? tarihSaatYaz(g.goruldu) : <span className="so-ipucu">—</span>}</Alan>
        <Alan ad="Başlandı">{g.baslandi ? tarihSaatYaz(g.baslandi) : <span className="so-ipucu">—</span>}</Alan>
        <Alan ad="Tamamlandı">{g.tamamlandi ? tarihSaatYaz(g.tamamlandi) : <span className="so-ipucu">—</span>}</Alan>
        <Alan ad="Kanıt">
          {g.kanitGerekli
            ? (g.kanitUrl ? <a className="so-bag" href={g.kanitUrl} target="_blank" rel="noreferrer">yüklendi →</a> : <span className="so-ipucu">gerekli, henüz yok</span>)
            : <span className="so-ipucu">gerekmiyor</span>}
        </Alan>

        {/* Kararın gerekçesi — "bu görev neden açıldı" sorusunun cevabı. */}
        <div className="so-alan so-alan-genis">
          <dt>Neden açıldı</dt>
          <dd>
            {g.kural ? <><code>{g.kural}</code> kuralı eşleşti. </> : 'Kural bilgisi yok. '}
            {g.gerekce || null}
          </dd>
        </div>

        <div className="so-alan so-alan-genis">
          <dt>Zincir</dt>
          <dd className="so-baglar">
            {g.kaynakOlayId && <Bag yol={`/storeos/alarmlar?entity=${encodeURIComponent(g.kaynakOlayId)}`}>kaynak olay →</Bag>}
            <Bag yol={`/storeos/denetim?entity=${encodeURIComponent(g.gorevNo)}`}>denetim izi →</Bag>
          </dd>
        </div>
      </dl>
    </details>
  )
}

// ─── Denetim tablosu ─────────────────────────────────────────────────────────

const AKTOR_ETIKETLERI: Record<string, string> = {
  kullanici: 'kullanıcı', system: 'sistem', partner: 'partner',
}

function DenetimSatiri({ s, simdiMs }: { s: DenetimGorunumu; simdiMs: number }) {
  const hedefYol = s.entityTipi === 'gorev' ? '/storeos/gorevler'
    : s.entityTipi === 'olay' ? '/storeos/alarmlar'
    : null
  return (
    <div className="so-tablo-satir so-tablo-satir-duz">
      <span className="so-zaman">{tarihSaatYaz(s.zaman)}</span>
      <span className="so-satir-ana">
        <span className="so-satir-baslik">{s.aksiyonEtiketi}</span>
        <span className="so-satir-alt">
          {s.entityTipi}:{' '}
          {hedefYol
            ? <Bag yol={`${hedefYol}?entity=${encodeURIComponent(s.entityId)}`}>{s.entityId}</Bag>
            : <code>{s.entityId}</code>}
          {s.ozet && <> · {s.ozet}</>}
        </span>
      </span>
      <span className="so-rozet so-notr" title={`Aktör tipi: ${s.aktorTipi}`}>
        {AKTOR_ETIKETLERI[s.aktorTipi] ?? s.aktorTipi}
        {s.aktor && s.aktor !== s.aktorTipi ? ` · ${s.aktor}` : ''}
      </span>
      <span className="so-ipucu so-zaman-gecen">{gecenSure(s.zaman, simdiMs)}</span>
    </div>
  )
}

// ─── Ekran ───────────────────────────────────────────────────────────────────

function Govde({ veri, simdiMs }: { veri: ListeVerisi; simdiMs: number }) {
  // `gorunum` ayırt edici alan: TypeScript burada satır tipini daraltıyor,
  // yani yanlış tabloyu yanlış veriyle çizmek DERLEME hatası verir.
  if (veri.gorunum === 'alarmlar') {
    return <>{veri.satirlar.map(a => <AlarmSatiri key={a.olayId} a={a} simdiMs={simdiMs} />)}</>
  }
  if (veri.gorunum === 'gorevler') {
    return <>{veri.satirlar.map(g => <GorevSatiri key={g.gorevNo} g={g} />)}</>
  }
  return <>{veri.satirlar.map(s => <DenetimSatiri key={s.kayitId} s={s} simdiMs={simdiMs} />)}</>
}

export function ListeEkrani({
  gorunum, baslangic,
}: {
  gorunum: Gorunum
  /** Sunucudan gelen ilk filtre — derin bağlantı (`?entity=…`) bunu taşır. */
  baslangic: ListeFiltresi
}) {
  const {
    veri, hata, yukleniyor, yenileniyor, duraklatildi, filtre, filtreDegistir, yenile,
  } = useListe(gorunum, baslangic)

  const m = METIN[gorunum]
  // "Şimdi" sunucunun ürettiği andan gelir — istemci saatinden değil. Pano ile
  // aynı kural: hydration uyuşmazlığını da böyle engelliyoruz.
  const simdiMs = veri ? Date.parse(veri.uretildi) : 0

  return (
    <Kabuk aktif={m.yol}>
      <header className="so-ust">
        <h1>{m.baslik}</h1>
        {veri && <span className="so-nabiz">{sayiYaz(veri.toplam)} {m.birim}</span>}
        <div className="so-ust-sag">
          {veri?.veriTipi === 'demo' && <OrnekVeri veriTipi="demo" />}
          <span className="so-nabiz" data-durum={hata ? 'hata' : 'iyi'}>
            <span className="so-nabiz-nokta" />
            {hata ? 'bağlantı sorunu'
              : duraklatildi ? 'duraklatıldı'
              : yenileniyor ? 'yenileniyor'
              : veri ? `güncel · ${saatYaz(veri.uretildi)}`
              : 'bağlanıyor'}
          </span>
          <button type="button" className="so-dugme" onClick={yenile}>Yenile</button>
        </div>
      </header>

      <div className="so-govde">
        <p className="so-alt-baslik">{m.altBaslik}</p>

        {/* Elde HİÇ veri yokken hata → tam ekran. Veri varken → şerit, ekran ayakta kalır. */}
        {hata && !veri ? (
          <Kart>
            <HataDurumu metin={hata.hata} tekrarDene={hata.tekrarDenenebilir ? yenile : undefined} />
          </Kart>
        ) : (
          <>
            {hata && (
              <Kart className="so-durum-hata">
                <div style={{ fontSize: 12.5 }}>
                  Son güncelleme başarısız: {hata.hata}. Ekrandaki satırlar bir önceki turdan.
                </div>
              </Kart>
            )}

            <div className="so-filtre-cubugu">
              <SuzgecSeridi
                secenekler={veri?.secenekler ?? []}
                secili={gorunum === 'alarmlar' ? filtre.severity : filtre.durum}
                tiklanabilir={gorunum !== 'denetim'}
                sec={d => filtreDegistir(gorunum === 'alarmlar'
                  ? { severity: d as ListeFiltresi['severity'] }
                  : { durum: d as ListeFiltresi['durum'] })}
              />
              <div className="so-filtre-sag">
                {filtre.entity && (
                  <EntityRozeti entity={filtre.entity} temizle={() => filtreDegistir({ entity: null })} />
                )}
                <AramaKutusu deger={filtre.q} ara={q => filtreDegistir({ q })} />
              </div>
            </div>

            {veri && <TavanUyarisi veri={veri} />}

            <Kart>
              {yukleniyor ? (
                <div className="so-tablo">
                  {Array.from({ length: 8 }, (_, i) => <Iskelet key={i} yukseklik={44} />)}
                </div>
              ) : veri && veri.bos ? (
                <BosDurum baslik={m.bosBaslik} metin={m.bosMetin} />
              ) : veri ? (
                <div className="so-tablo">
                  <Govde veri={veri} simdiMs={simdiMs} />
                </div>
              ) : null}
            </Kart>

            {veri && (
              <p className="so-altbilgi">
                {sayiYaz(veri.tarandi)} kayıt tarandı, {sayiYaz(veri.toplam)} tanesi bu filtreye uyuyor.
                {gorunum === 'denetim' && ' Denetim kayıtları mağaza bazlı ayrılmaz — kayıt, mağazaya değil işleme bağlıdır.'}
                {gorunum === 'denetim' && ' Bu tablo salt okunurdur: kodda silme ya da güncelleme yolu yoktur.'}
              </p>
            )}
          </>
        )}
      </div>
    </Kabuk>
  )
}
