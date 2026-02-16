import type { Metadata } from "next";
import { Fredoka, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TrustStrip } from "@/components/layout/TrustStrip";
import { AuthProvider } from "@/lib/auth-context";

const fredoka = Fredoka({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Teevo | The Smarter Golf Gear Marketplace",
  description: "Buy and sell golf equipment in the UK. Verified listings, secure payment.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <TrustStrip />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
