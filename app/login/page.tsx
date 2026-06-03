import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex" style={{ background: '#F7F9FC' }}>
      {/* Sol panel — alisales.ai brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-96 p-10 shrink-0 text-white"
        style={{ background: '#0A2540' }}
      >
        <div>
          {/* Logo — alisales.ai style */}
          <div className="flex items-baseline gap-0 mb-10 relative w-fit">
            <span
              className="text-[26px] font-bold tracking-[-0.034em]"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif', color: '#FBF5EF' }}
            >
              alisales
              <span style={{ color: '#A84456' }}>.</span>
              ai
            </span>
            {/* Gradient underline */}
            <span
              className="absolute bottom-[-3px] right-0 h-[3px] rounded-full"
              style={{
                width: '1.28em',
                background: 'linear-gradient(90deg, #6E63E0, #D67BAF)',
              }}
            />
          </div>

          <h1 className="text-2xl font-bold leading-snug mb-3" style={{ color: '#FBF5EF' }}>
            Brokerların En Güçlü<br />İş Ortağı: Ali
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(251,245,239,0.6)' }}>
            Portföyünüzü yönetin, yenilemeleri takip edin, fırsatları kaçırmayın.
          </p>
        </div>

        {/* Ali kutusu */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(251,245,239,0.08)', border: '1px solid rgba(251,245,239,0.12)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: 'linear-gradient(90deg, #6E63E0, #D67BAF)' }}
            />
            <p className="text-xs font-semibold" style={{ color: '#D67BAF' }}>Ali Asistan aktif</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(251,245,239,0.55)' }}>
            Bugün 8 firmanda yaklaşan vade var. Sıcak fırsatları kaçırma.
          </p>
        </div>
      </div>

      {/* Sağ giriş formu */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Mobil logo */}
        <div className="lg:hidden mb-8 text-center relative">
          <span
            className="text-2xl font-bold tracking-[-0.034em]"
            style={{ color: '#0A2540' }}
          >
            alisales<span style={{ color: '#A84456' }}>.</span>ai
          </span>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>Panel girişi</p>
        </div>

        <SignIn
          signUpUrl="/register"
          forceRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: '#6E63E0',
              colorBackground: '#ffffff',
              borderRadius: '0.75rem',
              fontFamily: 'var(--font-geist-sans), sans-serif',
            },
            elements: {
              card: 'shadow-sm border border-gray-100',
              formButtonPrimary: 'bg-[#6E63E0] hover:bg-[#5B50CC]',
              footerActionLink: 'text-[#6E63E0]',
            },
          }}
        />
      </div>
    </div>
  )
}
