import Link from 'next/link'
import { Check } from 'lucide-react'
import '../../broker.css'
import { kayitAction } from './actions'

const ERR: Record<string, string> = {
  eksik: 'Lütfen ad, acente ve telefon alanlarını doldur.',
  kod: 'Davet kodu geçersiz. Lansman salonundaki kodu kullan.',
}

export default async function BrokerKayit({
  searchParams,
}: {
  searchParams: Promise<{ src?: string; err?: string; ok?: string }>
}) {
  const sp = await searchParams
  const src = sp.src ?? ''

  // Başarılı kayıt ekranı
  if (sp.ok) {
    return (
      <div className="broker-os">
        <div className="onboard-wrap">
          <div className="onboard">
            <div className="ok">
              <div className="ring">
                <Check className="ic" style={{ width: 26, height: 26 }} />
              </div>
              <h1>Hoş geldin, {sp.ok}!</h1>
              <p className="sub">
                Kaydın alındı. Broker platformuna Silver kademesiyle başladın.
              </p>
              <span className="tier-badge">SILVER PARTNER</span>
              <div style={{ marginTop: 24 }}>
                <Link className="submit" href="/broker" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Platforma gir
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="broker-os">
      <div className="onboard-wrap">
        <div className="onboard">
          <div className="brand">
            <div className="mark">B</div>
            <div>
              <b>Babacan Partner</b>
              <span>BROKER PLATFORMU</span>
            </div>
          </div>
          <h1>Broker kaydını tamamla</h1>
          <p className="sub">
            Lansman salonundaki QR ile buradasın. Bilgilerini gir, Silver
            kademesiyle hemen başla.
          </p>

          {sp.err && <div className="err">{ERR[sp.err] ?? 'Bir hata oluştu.'}</div>}

          <form action={kayitAction}>
            <input type="hidden" name="src" value={src} />
            <div className="field">
              <label htmlFor="name">Ad Soyad</label>
              <input id="name" name="name" placeholder="Ahmet Yılmaz" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="agency">Acente</label>
              <input id="agency" name="agency" placeholder="Yılmaz Gayrimenkul" required />
            </div>
            <div className="field">
              <label htmlFor="phone">Telefon</label>
              <input id="phone" name="phone" placeholder="+90 5__ ___ __ __" inputMode="tel" autoComplete="tel" required />
            </div>
            <div className="field">
              <label htmlFor="code">Davet kodu</label>
              <input id="code" name="code" placeholder="Salondaki kod" required />
            </div>
            <button className="submit" type="submit">
              Kaydı tamamla
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
