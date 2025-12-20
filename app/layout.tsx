import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/toast";
import { ClerkProvider } from '@clerk/nextjs'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALI Sales AI - Türkiye'nin Bitirim AI Satış Asistanı",
  description: "WhatsApp ve Instagram'dan gelen leadlerinizi otomatik yöneten, 7/24 müşterilerinizle konuşan AI satış asistanınız",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/register"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <html lang="tr">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
          <ToastContainer />
        </body>
      </html>
    </ClerkProvider>
  );
}