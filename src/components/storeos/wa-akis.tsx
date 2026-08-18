// ════════════════════════════════════════════════════════════════════════════
//  Store OS — WHATSAPP AKIŞI (19 Ağu 2026)
//
//  Panelden çıkan mesajları baloncuk olarak gösterir: giden mesaj, düğmeleri,
//  iletim durumu, personelin bastığı düğme ve zincirdeki karşılığı.
//
//  ── METİN BURADA YAZILMIYOR ────────────────────────────────────────────────
//  Baloncuğun gövdesi `mesajGovdesi()` ile üretiliyor — telefona gerçekte ne
//  gidiyorsa o. Düğme etiketleri `BUTON_ETIKETLERI`den geliyor. Yani bu ekran
//  şablonu TAKLİT etmiyor, ŞABLONU KULLANIYOR: şablon değişirse ekran da
//  değişir, aralarına yalan giremez.
//
//  ── AMA VERİ SEED ──────────────────────────────────────────────────────────
//  Görevler örnek. Ekran hiçbir istek atmaz. Gerçek mesaj trafiği Denetim
//  Kaydı ekranında canlı görünür; kartın dipnotu bunu söyler.
//
//  SALT OKUNUR.
// ════════════════════════════════════════════════════════════════════════════

import { mesajGovdesi } from '@/lib/storeos/bildirim'
import { BUTON_ETIKETLERI } from '@/lib/storeos/kanal/buton'
import { BUTON_AKSIYONLARI } from '@/lib/storeos/kanal/tipler'
import type { WaKaydi } from '@/lib/storeos/depo/demo-metrikler'
import type { Gorev } from '@/lib/storeos/tipler'
import { Kart } from './temel'

/** Ekranda gösterilen iletim durumu — zincirin kendi sözlüğü. */
const DURUM_METNI: Record<WaKaydi['durum'], string> = {
  gonderildi: 'gönderildi',
  teslim: 'telefona ulaştı',
  okundu: 'okundu',
}

/**
 * Seed kaydını `mesajGovdesi()`nin beklediği `Gorev` şekline büyütür.
 *
 * Alanların çoğu mesaj gövdesine girmez ama tip gerektirir; girmeyenler
 * bilinçli olarak nötr değerlerle dolduruluyor. Buradaki tek anlamlı hesap
 * `Son Teslim`: gövdedeki "N dk içinde" ifadesi bu farktan doğuyor.
 */
function goreveCevir(k: WaKaydi, simdi: string): Gorev {
  return {
    'Gorev No': k.gorevNo,
    'Baslik': k.baslik,
    'Aciklama': k.aciklama,
    'Magaza Kodu': '0178',
    'Gerekce': k.gerekce,
    'Atanan Rol': 'personel',
    'Oncelik': k.oncelik,
    'Durum': 'atandi',
    'Olusturuldu': simdi,
    'Son Teslim': new Date(Date.parse(simdi) + k.sonTeslimDk * 60_000).toISOString(),
    'Kanit Gerekli': false,
    'Veri Tipi': 'demo',
  }
}

export function WaAkisi({ kayitlar, gun }: { kayitlar: WaKaydi[]; gun: string }) {
  // Sabit bir "şimdi": gövdedeki kalan süre her istekte oynamasın. Gün
  // değişince değişir, gün içinde sabittir — seed disiplini.
  const simdi = `${gun}T09:00:00.000Z`

  return (
    <Kart
      baslik="Mesaj akışı"
      ornek="demo"
      sag={<span className="so-kart-not">{kayitlar.length} mesaj · bugün</span>}
    >
      <div className="so-wa">
        {kayitlar.map(k => {
          const govde = mesajGovdesi(goreveCevir(k, simdi), k.kademe, simdi)
          return (
            <div key={k.anahtar} className="so-wa-grup">
              <div className="so-wa-satir">
                <div className="so-wa-balon" data-yon="giden">
                  <div className="so-wa-kim">
                    Store OS → {k.alici}
                    <span className="so-wa-rol">{k.aliciRol}</span>
                  </div>
                  <pre className="so-wa-govde">{govde}</pre>
                  <div className="so-wa-butonlar">
                    {BUTON_AKSIYONLARI.map(a => (
                      <span key={a} className="so-wa-buton">{BUTON_ETIKETLERI[a]}</span>
                    ))}
                  </div>
                  <div className="so-wa-alt">
                    <span>{k.saat}</span>
                    <span className="so-wa-durum" data-durum={k.durum}>{DURUM_METNI[k.durum]}</span>
                  </div>
                </div>
              </div>

              {k.yanit && (
                <div className="so-wa-satir" data-yon="gelen">
                  <div className="so-wa-balon" data-yon="gelen">
                    <div className="so-wa-kim">{k.alici}</div>
                    <div className="so-wa-yanit">{BUTON_ETIKETLERI[k.yanit.aksiyon]}</div>
                    <div className="so-wa-alt">
                      <span>{k.yanit.saat}</span>
                      <span className="so-wa-sonuc">{k.yanit.sonuc}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Zincir izi: mesajın panelde nereye düştüğü. Baloncuk tek
                  başına "mesaj attık" der; bu satır "ve şu oldu" der. */}
              <div className="so-wa-iz">
                Görev {k.gorevNo} · {k.kademe === 'ilk' ? 'ilk bildirim' : k.kademe === 'hatirlatma' ? 'hatırlatma' : 'bölge eskalasyonu'}
                {k.yanit ? ` · ${k.yanit.sonuc} · denetim kaydına yazıldı` : ' · yanıt bekleniyor'}
              </div>
            </div>
          )
        })}
      </div>

      <p className="so-wa-dipnot">
        Baloncuklardaki metin ve düğmeler, zincirin telefona gönderdiği şablonun kendisidir
        (<code>mesajGovdesi()</code>). Bu ekrandaki görevler örnek veridir ve ekran hiçbir
        sorgu atmaz; gerçek mesaj trafiği <strong>Denetim Kaydı</strong> ekranında canlı
        görünür. Demo süresince gerçek gönderim yalnızca onaylı test numarasına yapılır.
      </p>
    </Kart>
  )
}
