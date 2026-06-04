import { SignUp } from '@clerk/nextjs'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--lavanta)' }}>
      <SignUp
        signInUrl="/login"
        forceRedirectUrl="/"
        appearance={{
          variables: {
            colorPrimary: '#5B47E0',
            borderRadius: '0.75rem',
            fontFamily: 'var(--font-geist-sans), sans-serif',
          },
          elements: {
            card: 'shadow-sm border border-gray-100',
            formButtonPrimary: 'bg-[#5B47E0] hover:bg-[#4a38c8]',
            footerActionLink: 'text-[#5B47E0]',
          },
        }}
      />
    </div>
  )
}


