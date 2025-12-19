import { redirect } from 'next/navigation';

export default function RootPage() {
  // Manuel login yönlendirmesini kaldır, dashboard'a gönder.
  // Giriş yapılmadıysa Clerk Middleware zaten kontrolü ele alacak.
  redirect('/dashboard');
}