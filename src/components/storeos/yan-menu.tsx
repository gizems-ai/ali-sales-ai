'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — yan menü (düzen referansının React karşılığı).
//
//  Panelin `src/components/sidebar.tsx` bileşeni BURAYA GİRMEZ (izolasyon
//  kuralı); yapı kopyalanmadı, sıfırdan yazıldı.
//
//  Menü on beş madde: referanstaki sıra ve gruplama korundu; kaynağı
//  `lib/storeos/moduller.ts` — menü kendi listesini tutmaz.
//
//  GÜN 7 DEĞİŞİKLİĞİ: on bir madde eskiden gri ve tıklanamazdı ("yakında").
//  Kural hâlâ aynı — var olmayan bir ekrana link koymuyoruz — ama artık o on
//  bir madde VAR OLAN bir ekrana, `/storeos/moduller#<slug>` modül haritasına
//  iniyor ve durumunu orada okuyor. Yalan yok, ölü link de yok. Bir modülün
//  ekranı yazıldığında `moduller.ts`teki `yol` alanı dolar; burası değişmez.
// ════════════════════════════════════════════════════════════════════════════

import { useUser } from '@clerk/nextjs'
import Image from 'next/image'
import { MODULLER, modulYolu } from '@/lib/storeos/moduller'
import { rolEtiketi } from '@/lib/storeos/tema'
import { useMagazaBaglami } from './magaza-baglami'
import { Iskelet } from './temel'

const NAV = (['Operasyon', 'Yönetim'] as const).map(baslik => ({
  baslik,
  ogeler: MODULLER.filter(m => m.bolum === baslik),
}))

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
  const { magaza, tohum } = useMagazaBaglami()

  // Ad/kod önce CANLI veriden, o yoksa sunucudan gelen statik kimlikten
  // okunur. İkisi de yoksa (kod tanınmıyorsa) iskelet gösterilir — "yükleniyor"
  // yazıp orada kalmak yok: iskelet ya dolar ya da hiç doğmaz.
  const ad = magaza?.ad ?? tohum?.ad ?? null
  const kod = magaza?.kod ?? tohum?.kod ?? null

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
        okuyor. Ad/kod sunucudan tohumlanır, panonun çektiği canlı veri gelince
        onun üstüne yazar (`magaza-baglami`) — ikinci bir istek atılmaz.
        CANLI rozeti YALNIZ canlı veriden doğar: tohum "çevrimiçi" diyemez.
      */}
      <div className="so-magaza-secici" title="Demo tek mağaza ile çalışıyor; mağaza değiştirme çok mağazalı kurulumda açılır.">
        <div className="so-magaza-ikon" aria-hidden="true">🏬</div>
        {ad && kod ? (
          <div>
            <div className="so-magaza-ad">{ad}</div>
            <div className="so-magaza-kod">Mağaza {kod}</div>
            {magaza?.durum === 'online' && <div className="so-canli-nokta">CANLI</div>}
          </div>
        ) : (
          <div className="so-magaza-iskelet" aria-label="Mağaza bilgisi yükleniyor">
            <Iskelet yukseklik={11} />
            <Iskelet yukseklik={9} />
          </div>
        )}
      </div>

      <div className="so-menu">
        {NAV.map(bolum => (
          <div key={bolum.baslik} className="so-menu">
            <div className="so-nav-baslik">{bolum.baslik}</div>
            {bolum.ogeler.map(o => {
              const yol = modulYolu(o)
              return (
                <a
                  key={o.slug}
                  href={yol}
                  className="so-nav-oge"
                  // TAM eşleşme: `#slug` olmadan karşılaştırsaydık modül
                  // haritası açıkken on bir madde birden "aktif" görünürdü.
                  aria-current={yol === aktif ? 'page' : undefined}
                  // 18 Ağu 2026: on bir modülün ekranı yazıldı, gri madde kalmadı.
                  // Menü artık dürüstlüğü ipucuyla taşıyor: örnek veriyle beslenen
                  // ekranlar bunu üzerine gelince söylüyor, ekranın kendisinde de
                  // sabit bant var.
                  title={
                    o.durum === 'ekran-demo'
                      ? `${o.ad} — ekran hazır, salt okunur ve örnek veriyle besleniyor.`
                      : o.yol
                        ? undefined
                        : `Ekranı henüz yok — modül haritasındaki satırına gider (${o.ad}).`
                  }
                >
                  <span className="so-nav-ikon" aria-hidden="true">{o.ikon}</span>
                  <span className="so-nav-metin">{o.ad}</span>
                </a>
              )
            })}
          </div>
        ))}
      </div>

      {/*
        Ali Asistan kartı. 18 Ağu 2026'da düğme AÇILDI: `/storeos/ali` ekranı
        yazıldı. Ekran altı hazır senaryoyu yanıtlar (doğal dil sorgusu hâlâ
        yok, bunu kendi ekranında açıkça söylüyor) — yani düğme artık gerçek
        bir yere gidiyor, ölü değil.
        Avatar `/storeos/ali-avatar.png` (Gün 7'de eklendi); pano şeridi ve sağ
        kolon kartı da aynı görseli kullanır — Ali her yerde aynı yüz.
      */}
      <div className="so-ai-kart">
        <div className="so-ai-baslik">Ali Asistan <span aria-hidden="true">✦</span></div>
        <div className="so-ai-metin">Mağazanızla ilgili sorularınızı yanıtlayayım.</div>
        <a
          className="so-dugme so-dugme-ana"
          href="/storeos/ali"
          aria-current={aktif === '/storeos/ali' ? 'page' : undefined}
          title="Altı hazır senaryo — doğal dil sorgusu pilotta."
        >
          Ali&apos;ye Sor
        </a>
        <div className="so-ai-avatar" aria-hidden="true">
          <Image src="/storeos/ali-avatar.png" alt="" width={112} height={112} />
        </div>
      </div>

      {/*
        Demo kontrol paneli. Ürün modülü DEĞİL — sunum aracı, bu yüzden
        `moduller.ts` listesinde yok ve menüde de yalnız merkez rolüne
        görünüyor. Yetkiyi bu link vermez: sayfa ve uçlar `yonetim-kimlik.ts`
        ile kendi kapılarını tutar (link gizlemek güvenlik değildir).
      */}
      {rol === 'merkez' && (
        <a
          href="/storeos/demo-kontrol"
          className="so-nav-oge so-nav-yonetim"
          aria-current={aktif === '/storeos/demo-kontrol' ? 'page' : undefined}
          title="Sunum sırasında senaryo tetikleme ve tohum yazma"
        >
          <span className="so-nav-ikon" aria-hidden="true">🎛️</span>
          <span className="so-nav-metin">Demo kontrol</span>
        </a>
      )}

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
