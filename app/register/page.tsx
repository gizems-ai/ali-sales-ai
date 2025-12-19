import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <SignUp 
        appearance={{
          elements: {
            formButtonPrimary: 'bg-black hover:bg-slate-800 text-sm normal-case',
          },
        }}
        signInUrl="/login"
      />
    </div>
  );
}

