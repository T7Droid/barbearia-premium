import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--app-font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--app-font-serif",
});

export const metadata: Metadata = {
  title: "Barbearia Premium | Agende seu Horário",
  description: "A melhor experiência em barbearia clássica e moderna de São Paulo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased text-foreground bg-background`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
