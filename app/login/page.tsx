import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ALI Sales AI</h1>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Giriş Yap</h2>
        
        <LoginForm />
        
        <p className="mt-4 text-center text-sm text-gray-600">
          Hesabın yok mu?{' '}
          <a href="/register" className="text-cyan-600 hover:underline">
            Kaydol
          </a>
        </p>
      </div>
    </div>
  )
}