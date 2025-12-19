import { redirect } from 'next/navigation';

export default function RootPage() {
  // Manuel hiçbir login yönlendirmesi yapma!
  // Sadece ana girişi dashboard'a hedefle.
  redirect('/dashboard');
}