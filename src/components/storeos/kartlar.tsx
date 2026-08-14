// ════════════════════════════════════════════════════════════════════════════
//  Store OS — KPI kartları, alarm listesi, görev listesi.
//  Aptal bileşenler: veri props ile gelir, hiçbiri kendi isteğini atmaz.
// ════════════════════════════════════════════════════════════════════════════

import type {
  AlarmSatiri, GorevOzeti, GorevSatiri, KameraSatiri, KpiKarti, MagazaOzeti,
  PersonelSatiri,
} from '@/lib/storeos/dashboard/tipler'
import {
  gorevDurumEtiketi, oncelikSinifi, severityEtiketi, severitySinifi,
} from '@/lib/storeos/tema'
import {
  BosDurum, IskeletListe, Kart, OrnekVeri, birimYaz, gecenSure, sayiYaz, saatYaz,
  tarihSaatYaz,
} from './temel'

// ─── KPI ─────────────────────────────────────────────────────────────────────

export function KpiIzgarasi({ kartlar }: { kartlar: KpiKarti[] | null }) {
  if (kartlar === null) return <div className="so-izgara so-izgara-kpi"><IskeletListe adet={6} /></div>
  if (kartlar.length === 0) {
    return (
      <Kart>
        <BosDurum
          baslik="Henüz metrik yok"
          metin="Bu mağaza için gösterge verisi bulunamadı. Seed çalıştırıldıysa birkaç saniye içinde görünür."
        />
      </Kart>
    )
  }
  return (
    <div className="so-izgara so-izgara-kpi">
      {kartlar.map(k => (
        <div key={k.anahtar} className="so-kart">
          <div className="so-kpi-etiket">
            {k.etiket}
            <OrnekVeri veriTipi={k.veriTipi} />
          </div>
          <div className="so-kpi-deger">
            {sayiYaz(k.deger)}
            {birimYaz(k.birim) && <span className="so-kpi-birim">{birimYaz(k.birim)}</span>}
          </div>
          {k.alt && <div className="so-kpi-alt">{k.alt}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── Mağaza başlığı ──────────────────────────────────────────────────────────

export function MagazaBasligi({ magaza }: { magaza: MagazaOzeti | null }) {
  if (!magaza) return <h1>Store OS</h1>
  const kasa = magaza.kasaAcik === null
    ? `${magaza.kasaToplam} kasa`
    : `${sayiYaz(magaza.kasaAcik)}/${sayiYaz(magaza.kasaToplam)} kasa açık`
  return (
    <>
      <h1>{magaza.kod} · {magaza.ad}</h1>
      <span className={`so-rozet ${magaza.durum === 'online' ? 'so-sev-low' : magaza.durum === 'warning' ? 'so-sev-medium' : 'so-sev-critical'}`}>
        {magaza.durum === 'online' ? 'Normal' : magaza.durum === 'warning' ? 'Dikkat' : 'Kapalı'}
      </span>
      <span className="so-nabiz">{magaza.sehir} · {magaza.acilis}–{magaza.kapanis} · {kasa}</span>
      <OrnekVeri veriTipi={magaza.veriTipi} />
    </>
  )
}

// ─── Alarmlar ────────────────────────────────────────────────────────────────

export function AlarmListesi({ alarmlar, simdiMs }: { alarmlar: AlarmSatiri[] | null; simdiMs: number }) {
  return (
    <Kart baslik="Canlı alarmlar" sag={alarmlar ? <span className="so-nabiz">{alarmlar.length} olay</span> : null}>
      {alarmlar === null ? <IskeletListe /> : alarmlar.length === 0 ? (
        <BosDurum
          baslik="Henüz olay gelmedi"
          metin="Kameralardan olay ulaştığında burada anında listelenir. Boş liste bir hata değildir."
        />
      ) : (
        <div className="so-liste">
          {alarmlar.map(a => (
            <div key={a.olayId} className="so-satir">
              <span className={severitySinifi(a.severity)}>{severityEtiketi(a.severity)}</span>
              <div className="so-satir-ana">
                <div className="so-satir-baslik">{a.baslik}</div>
                <div className="so-satir-alt">
                  {a.kameraAdi ?? 'kamera yok'} · {saatYaz(a.olustu)} · {gecenSure(a.olustu, simdiMs)}
                </div>
              </div>
              {a.gorevUretti
                ? <span className="so-rozet so-sev-low">görev açıldı</span>
                : <span className="so-rozet so-notr" title="Bu olay tipi için tanımlı kural yok — olay kaydedildi, görev üretilmedi.">kural yok</span>}
              <OrnekVeri veriTipi={a.veriTipi} />
            </div>
          ))}
        </div>
      )}
    </Kart>
  )
}

// ─── Görevler ────────────────────────────────────────────────────────────────

// Durum etiketleri ve öncelik sınıfları `tema.ts`'e taşındı (Gün 4) — aynı
// eşlemeyi liste ekranları da kullanıyor, iki kopya kaymaya açıktı.

export function GorevListesi({
  gorevler, ozet,
}: {
  gorevler: GorevSatiri[] | null
  ozet: GorevOzeti | null
}) {
  const sag = ozet
    ? <span className="so-nabiz">{ozet.acik} açık · {ozet.gecikmis} gecikmiş · {ozet.tamamlandi} tamam</span>
    : null
  return (
    <Kart baslik="Görevler" sag={sag}>
      {gorevler === null ? <IskeletListe /> : gorevler.length === 0 ? (
        <BosDurum
          baslik="Açık görev yok"
          metin="Bir kural eşleştiğinde görev otomatik oluşur ve ilgili kişiye WhatsApp'tan gider."
        />
      ) : (
        <div className="so-liste">
          {gorevler.map(g => (
            <div key={g.gorevNo} className="so-satir">
              <span className={`so-rozet ${oncelikSinifi(g.oncelik)}`}>{g.gorevNo}</span>
              <div className="so-satir-ana">
                <div className="so-satir-baslik">{g.baslik}</div>
                <div className="so-satir-alt">
                  {g.atananAd ?? g.atananRol} · son teslim {tarihSaatYaz(g.sonTeslim)}
                </div>
              </div>
              {g.gecikti && <span className="so-rozet so-sev-critical">gecikti</span>}
              <span className="so-rozet so-notr">{gorevDurumEtiketi(g.durum)}</span>
              <OrnekVeri veriTipi={g.veriTipi} />
            </div>
          ))}
        </div>
      )}
    </Kart>
  )
}

// ─── Kameralar ───────────────────────────────────────────────────────────────

const KAMERA_SINIFI: Record<string, string> = {
  online: 'so-sev-low', degraded: 'so-sev-medium', offline: 'so-sev-critical',
}

export function KameraListesi({ kameralar }: { kameralar: KameraSatiri[] | null }) {
  return (
    <Kart baslik="Kameralar">
      {kameralar === null ? <IskeletListe adet={4} /> : kameralar.length === 0 ? (
        <BosDurum baslik="Kamera tanımlı değil" metin="Mağazaya kamera eklendiğinde burada görünür." />
      ) : (
        <div>
          {kameralar.map(k => (
            <div key={k.kameraId} className="so-satir">
              <div className="so-satir-ana">
                <div className="so-satir-baslik">{k.ad}</div>
                <div className="so-satir-alt">{k.bolgeAdi} · {k.yetenekler.join(', ') || 'yetenek tanımsız'}</div>
              </div>
              <span className={`so-rozet ${KAMERA_SINIFI[k.durum] ?? 'so-notr'}`}>{k.durum}</span>
            </div>
          ))}
        </div>
      )}
    </Kart>
  )
}

// ─── Personel ────────────────────────────────────────────────────────────────

export function PersonelListesi({ personel }: { personel: PersonelSatiri[] | null }) {
  return (
    <Kart baslik="Vardiyadaki ekip">
      {personel === null ? <IskeletListe adet={4} /> : personel.length === 0 ? (
        <BosDurum baslik="Personel kaydı yok" metin="Kullanıcılar tablosuna kayıt eklendiğinde burada listelenir." />
      ) : (
        <div>
          {personel.map(p => (
            <div key={p.kullaniciId} className="so-satir">
              <div className="so-satir-ana">
                <div className="so-satir-baslik">{p.adSoyad}</div>
                <div className="so-satir-alt">{p.rol}</div>
              </div>
              <span className={`so-rozet ${p.acikGorev > 0 ? 'so-sev-medium' : 'so-notr'}`}>
                {p.acikGorev} açık görev
              </span>
            </div>
          ))}
        </div>
      )}
    </Kart>
  )
}
