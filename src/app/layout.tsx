import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--app-font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--app-font-serif",
});

export const metadata: Metadata = {
  title: "King Barber | Agende seu Horário",
  description: "A melhor experiência em barbearia clássica e moderna de São Paulo.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icone_logo_fundo_transparente.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "King Barber",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased text-foreground bg-background`}>
        <Providers>
          {children}
          <PWAInstallPrompt />
        </Providers>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('Service Worker registration successful');
                  },
                  function(err) {
                    console.log('Service Worker registration failed: ', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
