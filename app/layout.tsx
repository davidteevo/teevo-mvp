import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TrustStrip } from "@/components/layout/TrustStrip";
import { StagingBanner } from "@/components/layout/StagingBanner";
import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { WatchlistProvider } from "@/lib/watchlist-context";
import { WatchAuthModal } from "@/components/watchlist/WatchAuthModal";
import { WatchIntentHandler } from "@/components/watchlist/WatchIntentHandler";
import { getAppEnv, isProduction, isStaging } from "@/lib/app-env";

const appEnv = getAppEnv();

export const metadata: Metadata = {
  title: "Teevo | The Smarter Golf Gear Marketplace",
  description: "Buy and sell golf equipment in the UK. Verified listings, secure payment.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  ...(isStaging() || appEnv === "development"
    ? { robots: { index: false, follow: false } }
    : {}),
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loadAnalytics = isProduction();

  return (
    <html lang="en" className="font-sans">
      <head>
        {loadAnalytics ? (
          <>
            <script
              async
              src="https://www.googletagmanager.com/gtag/js?id=G-CXFXS7S1M4"
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-CXFXS7S1M4');
`,
              }}
            />
          </>
        ) : null}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=JetBrains+Mono:wght@100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <StagingBanner />
        <AuthProvider>
          <WatchlistProvider>
            <Suspense fallback={null}>
              <WatchIntentHandler />
            </Suspense>
            <WatchAuthModal />
            <TrustStrip />
            <Header />
            <main className="flex-1 flex flex-col min-h-0 min-w-0">{children}</main>
            <Footer />
          </WatchlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
