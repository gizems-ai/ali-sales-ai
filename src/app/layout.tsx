import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Sora, Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/toast";
import { ClerkProvider } from '@clerk/nextjs'
import { trTR } from '@clerk/localizations'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

// GELİŞİM / Satışçı Kütüphanesi tasarım fontları (Sora · Inter · Space Mono)
const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-sora",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "ALI Sales AI - Türkiye'nin Bitirim AI Satış Asistanı",
  description: "WhatsApp ve Instagram'dan gelen leadlerinizi otomatik yöneten, 7/24 müşterilerinizle konuşan AI satış asistanınız",
  icons: {
    icon: '/favicon.svg',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={trTR}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <html lang="tr">
        <body className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} ${sora.variable} ${inter.variable} ${spaceMono.variable} antialiased`}>
          {children}
          <ToastContainer />
        </body>
      </html>
    </ClerkProvider>
  );
}