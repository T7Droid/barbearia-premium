"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Scissors, LogOut, User, Settings as SettingsIcon, History, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { config, getStatus } from "@/lib/config";
import { AlertCircle } from "lucide-react";
import { DemoStore } from "@/lib/persistence/demo-store";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<{name: string, role: string, points?: number} | null>(null);
  const [isPointsEnabled, setIsPointsEnabled] = useState(true);

  useEffect(() => {
    console.log("Configuration Status:", getStatus());
    const fetchData = async () => {
      try {
        const [authRes, settingsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/settings")
        ]);
        const authData = await authRes.json();
        const settingsData = await settingsRes.json();

        if (authData.authenticated) setUser(authData.user);
        setIsPointsEnabled(settingsData.isPointsEnabled);
      } catch (e) {}
    };
    fetchData();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      DemoStore.clearUser();
      setUser(null);
      toast({ title: "Até logo!", description: "Você saiu da sua conta." });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Scissors className="w-6 h-6 text-primary group-hover:text-primary/80 transition-colors" />
            <span className="font-serif text-xl font-bold tracking-wide uppercase">Barber<span className="text-primary font-black">.</span></span>
          </Link>

          {config.useMocks && (
            <Link 
              href={`https://wa.me/5513982046758?text=${encodeURIComponent("Olá! Acabei de testar o sistema de agendamento online para barbearias e gostei muito. Tenho uma barbearia e queria entender como posso implementar no meu negócio e os valores.")}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded text-[10px] font-bold uppercase border border-yellow-500/20 animate-pulse hover:bg-yellow-500/20 transition-colors cursor-pointer"
            >
              <img src="/whatsapp.png" alt="WhatsApp" className="w-4 h-4 rounded-full" />
              Modo Demonstração
            </Link>
          )}

          {}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}>Início</Link>
            <Link href="/booking" className={`text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith('/booking') ? 'text-primary' : 'text-muted-foreground'}`}>Agendar</Link>

            {user?.role === 'admin' && (
              <Link href="/admin" className={`text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'}`}>Administração</Link>
            )}

            {user?.role === 'client' && (
              <Link href="/meu-perfil/historico" className={`text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith('/meu-perfil/historico') ? 'text-primary' : 'text-muted-foreground'}`}>Meus Agendamentos</Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {user && isPointsEnabled && user.points !== undefined && (
              <div className="hidden sm:flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                <span className="text-xs font-bold">{user.points} pts</span>
              </div>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-accent hover:bg-accent/80 border border-border/50">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.role === 'admin' ? 'Administrador' : 'Cliente Premium'}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === 'admin' ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin"><LayoutGrid className="mr-2 h-4 w-4" /> Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/configuracoes"><SettingsIcon className="mr-2 h-4 w-4" /> Configurações</Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/meu-perfil"><User className="mr-2 h-4 w-4" /> Meu Perfil</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/meu-perfil/historico"><History className="mr-2 h-4 w-4" /> Meus Agendamentos</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/meu-perfil/settings"><SettingsIcon className="mr-2 h-4 w-4" /> Configurações</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/5 h-9">
                <Link href="/login">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-card/30 py-12 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            <span className="font-serif text-lg font-bold tracking-wide uppercase italic">Barber<span className="text-primary NOT-italic font-black">.</span></span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Barber Premium. Experiência de Barbearia de Luxo.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-primary transition-colors">Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
