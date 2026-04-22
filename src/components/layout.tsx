"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Scissors, LogOut, User, Settings as SettingsIcon, History, LayoutGrid, Award, Clock } from "lucide-react";
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
import { config } from "@/lib/config";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useTenant } from "@/components/tenant-provider";
import { useUserStore } from "@/lib/store/user-store";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRoot = pathname === "/";
  const router = useRouter();
  const { toast } = useToast();

  // Tentar obter o tenant do context. Se não estiver em um [slug], o hook lidará com isso.
  let tenant: any = null;
  try {
    tenant = useTenant();
  } catch (e) {
    // Fora de um contexto de tenant (ex: landing page global)
  }

  const { user, setUser, refreshProfile } = useUserStore();
  const [isPointsEnabled, setIsPointsEnabled] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers: any = {};
        if (tenant) {
          headers["x-tenant-slug"] = tenant.slug;
        }

        // Usar refreshProfile para centralizar a busca do usuário no store
        const userData = await refreshProfile(tenant?.slug);
        
        if (userData) {
          DemoStore.saveUser(userData);
        } else {
          // Se não houver sessão ativa no servidor, limpamos o cache local para evitar redirecionamentos errados
          const savedUser = DemoStore.getUser();
          if (savedUser) {
            // Se tínhamos um user no cache mas o servidor disse que não estamos logados, o cache está expirado
            DemoStore.clearUser();
          }
          setUser(null);
        }

        const settingsRes = await fetch("/api/settings", { headers, cache: "no-store" });
        const settingsData = await settingsRes.json();

        // Configurações e Sincronização
        if (settingsRes.ok) {
          setIsPointsEnabled(settingsData.isPointsEnabled);
          DemoStore.saveSettings(settingsData);
        } else {
          const savedSettings = DemoStore.getSettings();
          if (savedSettings) setIsPointsEnabled(savedSettings.isPointsEnabled);
        }
      } catch (e) {
        const savedUser = DemoStore.getUser();
        const savedSettings = DemoStore.getSettings();
        if (savedUser) setUser(savedUser);
        if (savedSettings) setIsPointsEnabled(savedSettings.isPointsEnabled);
      }
    };
    fetchData();
  }, [pathname, tenant, refreshProfile]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      DemoStore.clearUser();
      setUser(null);
      toast({ title: "Até logo!", description: "Você saiu da sua conta." });
      router.push(tenant ? `/${tenant.slug}` : "/");
      router.refresh();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const getLink = (path: string) => {
    if (!tenant) return path;
    if (path === "/") return `/${tenant.slug}`;
    return `/${tenant.slug}${path}`;
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetPath: string) => {
    if (!tenant && typeof window !== "undefined") {
      const lastSlug = localStorage.getItem("last_tenant_slug");
      if (lastSlug) {
        e.preventDefault();
        router.push(`/${lastSlug}${targetPath === "/" ? "" : targetPath}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={getLink("/")} onClick={(e) => handleLinkClick(e, "/")} className="flex items-center gap-2 group">
            <Scissors className="w-6 h-6 text-primary group-hover:text-primary/80 transition-colors" />
            <span className="font-serif text-xl font-bold tracking-wide uppercase italic">
              {isRoot || !tenant || tenant.name === "King Barber" || tenant.name === "KingBarbers" ? (
                <>
                  <span className="text-yellow-400">King</span>Barbers
                </>
              ) : (
                tenant.name
              )}
              <span className="text-primary font-black">.</span>
            </span>
          </Link>

          {config.useMocks && (
            <Link
              href={`https://wa.me/5513982046758`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded text-[10px] font-bold uppercase border border-yellow-500/20 animate-pulse hover:bg-yellow-500/20 transition-colors cursor-pointer"
            >
              Modo Demonstração
            </Link>
          )}

          {!isRoot && (
            <nav className="hidden md:flex items-center gap-8">
              <Link href={getLink("/")} onClick={(e) => handleLinkClick(e, "/")} className={`text-sm font-medium transition-colors hover:text-primary ${pathname === getLink("/") ? 'text-primary' : 'text-muted-foreground'}`}>Início</Link>
              <Link href={getLink("/booking")} onClick={(e) => handleLinkClick(e, "/booking")} className={`text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith(getLink("/booking")) ? 'text-primary' : 'text-muted-foreground'}`}>Agendar</Link>

              {user?.role === 'admin' && (
                <Link href={getLink("/admin")} onClick={(e) => handleLinkClick(e, "/admin")} className={`text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith(getLink("/admin")) ? 'text-primary' : 'text-muted-foreground'}`}>Administração</Link>
              )}
              
              {(user?.role === 'barber' || user?.role === 'admin') && (
                <Link href={getLink("/barber")} onClick={(e) => handleLinkClick(e, "/barber")} className={`text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith(getLink("/barber")) ? 'text-primary' : 'text-muted-foreground'}`}>Painel Profissional</Link>
              )}

              {user && (
                <Link href={getLink("/meu-perfil/historico")} onClick={(e) => handleLinkClick(e, "/meu-perfil/historico")} className={`text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith(getLink("/meu-perfil/historico")) ? 'text-primary' : 'text-muted-foreground'}`}>Meus Agendamentos</Link>
              )}
            </nav>
          )}

          <div className="flex items-center gap-4">
            {(() => {
              if (!isRoot && user && isPointsEnabled) {
                return (
                  <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 shadow-sm hover:scale-105 transition-transform cursor-default">
                    <Award className="w-4 h-4" />
                    <span className="text-xs font-black tracking-tight">{user.points || 0} pts</span>
                  </div>
                );
              }
              return null;
            })()}

            {!isRoot && (user ? (
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
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.role === 'admin' ? 'Administrador' : user.role === 'barber' ? 'Barbeiro Profissional' : 'Cliente Premium'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Itens Administrativos */}
                  {user.role === 'admin' && (
                    <>
                      <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest pt-3 pb-1">Administração</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={getLink("/admin")} onClick={(e) => handleLinkClick(e, "/admin")}><LayoutGrid className="mr-2 h-4 w-4" /> Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={getLink("/admin/configuracoes")} onClick={(e) => handleLinkClick(e, "/admin/configuracoes")}>
                          <SettingsIcon className="mr-2 h-4 w-4" /> Configurações
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Itens do Barbeiro */}
                  {(user.role === 'barber' || user.role === 'admin') && (
                    <>
                      <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest pt-3 pb-1">Profissional</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={getLink("/barber")} onClick={(e) => handleLinkClick(e, "/barber")}><LayoutGrid className="mr-2 h-4 w-4" /> Painel Profissional</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={getLink("/barber/horarios")} onClick={(e) => handleLinkClick(e, "/barber/horarios")}><Clock className="mr-2 h-4 w-4" /> Meus Horários</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Itens do Cliente (Acessíveis por ambos) */}
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest pt-3 pb-1">Minha Conta</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href={getLink("/meu-perfil")} onClick={(e) => handleLinkClick(e, "/meu-perfil")}><User className="mr-2 h-4 w-4" /> Meu Perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={getLink("/meu-perfil/historico")} onClick={(e) => handleLinkClick(e, "/meu-perfil/historico")}><History className="mr-2 h-4 w-4" /> Meus Agendamentos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={getLink("/meu-perfil/settings")} onClick={(e) => handleLinkClick(e, "/meu-perfil/settings")}><SettingsIcon className="mr-2 h-4 w-4" /> Configurações</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/5 h-9">
                <Link href={getLink("/login")} onClick={(e) => handleLinkClick(e, "/login")}>Entrar</Link>
              </Button>
            ))}
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
            <span className="font-serif text-lg font-bold tracking-wide uppercase italic">
              <span className="text-yellow-400">King</span>Barbers<span className="text-primary font-black">.</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} KingBarbers. Experiência de Barbearia de Luxo.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href={getLink("/privacidade")} className="hover:text-primary transition-colors">Privacidade</Link>
            <Link href={getLink("/termos")} className="hover:text-primary transition-colors">Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
