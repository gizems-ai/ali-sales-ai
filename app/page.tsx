import { redirect } from 'next/navigation';

export default function RootPage() {
  // Login yerine dashboard'a yönlendir. 
  // Clerk Middleware zaten giriş yapıp yapmadığını kontrol ediyor.
  redirect('/dashboard');
}