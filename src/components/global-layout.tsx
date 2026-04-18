"use client";

import Link from "next/link";
import { Scissors } from "lucide-react";

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Scissors className="w-6 h-6 text-primary group-hover:text-primary/80 transition-colors" />
            <span className="font-serif text-xl font-bold tracking-wide uppercase">
              <span className="text-yellow-400">King</span>Barbers
              <span className="text-primary font-black">.</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-card/30 py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              <span className="font-serif font-bold tracking-widest uppercase text-sm">
                <span className="text-yellow-400">King</span>Barbers
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} KingBarbers - Sistema de Agendamento Profissional. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
