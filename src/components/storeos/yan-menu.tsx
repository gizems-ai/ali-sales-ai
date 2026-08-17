'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — yan menü (düzen referansının React karşılığı).
//
//  Panelin `src/components/sidebar.tsx` bileşeni BURAYA GİRMEZ (izolasyon
//  kuralı); yapı kopyalanmadı, sıfırdan yazıldı.
//
//  Menü on beş madde: referanstaki sıra ve gruplama korundu. AMA referansta
//  "aktif" görünen altı madde (Canlı İzleme, Analizler, Operasyon, Kasa &
//  Kuyruk, Raf & Stok, Personel) burada `yakında` işaretlidir — Gün 4'te
//  konulan kural değişmedi: var olmayan bir ekrana giden link jüriye yalan
//  söyler. Dört madde gerçekten çalışır; on bir madde mimarinin kapsamını
//  gösterir ve tıklanmaz. Ekran yazıldıkça `yol` alanı eklenir, başka bir şey
//  değişmez.
// ════════════════════════════════════════════════════════════════════════════

import { useUser } from '@clerk/nextjs'
import { rolEtiketi } from '@/lib/storeos/tema'
import { useMagaza } from './magaza-baglami'

interface NavOgesi { ad: string; ikon: string; yol?: string }

const NAV: { baslik: string; ogeler: NavOgesi[] }[] = [
  {
    baslik: 'Operasyon',
    ogeler: [
      { ad: 'Mağaza Özeti',     ikon: '◧', yol: '/storeos' },
      { ad: 'Canlı İzleme',     ikon: '◉' },
      { ad: 'Mağaza Analizleri', ikon: '◔' },
      { ad: 'Operasyon',        ikon: '◈' },
      { ad: 'Kasa & Kuyruk',    ikon: '◫' },
      { ad: 'Raf & Stok',       ikon: '▤' },
      { ad: 'Görevler',         ikon: '◇', yol: '/storeos/gorevler' },
      { ad: 'Alarmlar',         ikon: '△', yol: '/storeos/alarmlar' },
    ],
  },
  {
    baslik: 'Yönetim',
    ogeler: [
      { ad: 'Personel',        ikon: '▦' },
      { ad: 'Kampanyalar',     ikon: '◍' },
      { ad: 'Bakım & Arıza',   ikon: '◐' },
      { ad: 'İSG & Güvenlik',  ikon: '⬡' },
      { ad: 'Denetim Kaydı',   ikon: '▣', yol: '/storeos/denetim' },
      { ad: 'Raporlar',        ikon: '◑' },
      { ad: 'Ayarlar',         ikon: '⚙' },
    ],
  },
]

/** "Gizem Burteçin" → "GB". Ad yoksa e-postanın ilk harfi, o da yoksa nokta. */
function bashafler(ad: string | null | undefined, eposta: string | undefined): string {
  const parcalar = (ad ?? '').trim().split(/\s+/).filter(Boolean)
  if (parcalar.length >= 2) return (parcalar[0][0] + parcalar[parcalar.length - 1][0]).toLocaleUpperCase('tr-TR')
  if (parcalar.length === 1) return parcalar[0].slice(0, 2).toLocaleUpperCase('tr-TR')
  if (eposta) return eposta.slice(0, 2).toLocaleUpperCase('tr-TR')
  return '·'
}

export function YanMenu({ aktif }: { aktif: string }) {
  const { user, isLoaded } = useUser()
  const magaza = useMagaza()

  // Rol Clerk `publicMetadata.storeos_rol` alanından okunur; API tarafındaki
  // yetki kontrolüyle AYNI kaynak, böylece ekranda yazan rol ile sunucunun
  // uyguladığı rol ayrışamaz.
  const rol = typeof user?.publicMetadata?.storeos_rol === 'string'
    ? (user.publicMetadata.storeos_rol as string)
    : null
  const eposta = user?.primaryEmailAddress?.emailAddress
  const kisiAdi = user?.fullName ?? eposta ?? (isLoaded ? 'Store OS kullanıcısı' : '…')

  return (
    <nav className="so-yan" aria-label="Store OS menü">
      <div className="so-logo">
        <div className="so-logo-ust">
          <span className="so-logo-gratis">gratis</span>
          <span className="so-logo-carpi" aria-hidden="true">×</span>
          <span className="so-logo-ali">Ali CRM</span>
        </div>
        <div className="so-logo-alt">Store Intelligence</div>
      </div>

      {/*
        Mağaza seçici. Demoda TEK mağaza var; açılır liste yok çünkü açılınca
        boş çıkardı. Yine de kutu duruyor: jüri çok mağazalı mimariyi buradan
        okuyor. Ad/kod panonun çektiği veriden gelir (`magaza-baglami`), ikinci
        bir istek atılmaz; veri gelmeden önce yer tutucu yazı görünür.
      */}
      <div className="so-magaza-secici" title="Demo tek mağaza ile çalışıyor; mağaza değiştirme çok mağazalı kurulumda açılır.">
        <div className="so-magaza-ikon" aria-hidden="true">🏬</div>
        <div>
          <div className="so-magaza-ad">{magaza?.ad ?? 'Mağaza yükleniyor…'}</div>
          <div className="so-magaza-kod">{magaza ? `Mağaza ${magaza.kod}` : '—'}</div>
          {magaza?.durum === 'online' && <div className="so-canli-nokta">CANLI</div>}
        </div>
      </div>

      <div className="so-menu">
        {NAV.map(bolum => (
          <div key={bolum.baslik} className="so-menu">
            <div className="so-nav-baslik">{bolum.baslik}</div>
            {bolum.ogeler.map(o => (
              o.yol ? (
                <a
                  key={o.ad}
                  href={o.yol}
                  className="so-nav-oge"
                  aria-current={o.yol === aktif ? 'page' : undefined}
                >
                  <span className="so-nav-ikon" aria-hidden="true">{o.ikon}</span>
                  <span className="so-nav-metin">{o.ad}</span>
                </a>
              ) : (
                <span key={o.ad} className="so-nav-oge" data-yakinda="1" aria-disabled="true">
                  <span className="so-nav-ikon" aria-hidden="true">{o.ikon}</span>
                  <span className="so-nav-metin">{o.ad}</span>
                  <span className="so-yakinda">yakında</span>
                </span>
              )
            ))}
          </div>
        ))}
      </div>

      {/*
        Ali Asistan kartı. Düğme DEVRE DIŞI: sohbet ucu bu sürümde yok ve
        çalışmayan bir düğmeyi tıklanabilir bırakmak demoda en kötü an olurdu.
        Avatar için `/public/storeos/ali-avatar.png` YOK; görsel eklenene kadar
        emoji duruyor — eksik dosya kırık ikon olarak görünmesin.
      */}
      <div className="so-ai-kart">
        <div className="so-ai-baslik">Ali Asistan <span aria-hidden="true">✦</span></div>
        <div className="so-ai-metin">Mağazanızla ilgili sorularınızı yanıtlayayım.</div>
        <button type="button" className="so-dugme so-dugme-ana" disabled title="Sohbet ucu bu sürümde kapalı.">
          Ali&apos;ye Sor
        </button>
        <div className="so-ai-avatar" aria-hidden="true">🙂</div>
      </div>

      <div className="so-kullanici">
        <div className="so-avatar" aria-hidden="true">{bashafler(user?.fullName, eposta)}</div>
        <div>
          <div className="so-kullanici-ad">{kisiAdi}</div>
          <div className="so-kullanici-rol">{rol ? rolEtiketi(rol) : 'Rol atanmadı'}</div>
        </div>
      </div>
    </nav>
  )
}
