import { RegisterForm } from './register-form'
import Link from 'next/link'

const ALI = {
  accent: {
    cyan: '#06B6D4',
    blue: '#3B82F6',
  },
  ui: {
    border: 'rgba(15, 23, 42, 0.08)',
  },
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div 
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
        style={{ 
          border: `1px solid ${ALI.ui.border}`,
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
            style={{
              background: `linear-gradient(135deg, ${ALI.accent.cyan} 0%, ${ALI.accent.blue} 100%)`
            }}
          >
            A
          </div>
          <span className="font-semibold text-gray-900 text-xl">ALI Sales AI</span>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kaydol</h1>
          <p className="text-gray-600 text-sm">
            Hesabınızı oluşturun ve başlayın
          </p>
        </div>

        {/* Form */}
        <RegisterForm />

        {/* Footer Link */}
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Zaten hesabın var mı? </span>
          <Link
            href="/login"
            className="font-medium transition-colors"
            style={{ 
              color: ALI.accent.cyan,
            }}
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  )
}


