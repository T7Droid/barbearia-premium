"use client";

import { Layout } from "@/components/layout";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, AlertCircle, LogOut } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { userStore } from "@/lib/store/user-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function BarberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tenant = useTenant();
  const initialUser = userStore.getState().user;
  
  const [isAuthorized, setIsAuthorized] = useState(
    initialUser?.role === "barber" || initialUser?.role === "admin"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState<boolean | null>(null);

  useEffect(() => {
    // Proteção para BFCache: Se o usuário voltar, resetamos o loading
    const handlePageShow = () => setIsLoading(false);
    window.addEventListener("pageshow", handlePageShow);

    const checkAuth = async () => {
      try {
        const headers = { "x-tenant-slug": tenant.slug };
        const res = await fetch("/api/auth/me", { headers, cache: "no-store" });
        
        if (!res.ok) throw new Error("Falha na autenticação");

        const data = await res.json();

        if (data.authenticated && (data.user?.role === "barber" || data.user?.role === "admin")) {
          setIsAuthorized(true);
          userStore.setUser(data.user);
          setIsSubscriptionActive(data.isSubscriptionActive !== false);
        } else {
          setIsAuthorized(false);
          userStore.setUser(null);
          router.push(`/${tenant.slug}/login?from=${encodeURIComponent(pathname)}`);
        }
      } catch (error) {
        console.error("Barber Auth Error:", error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [pathname, router, tenant.slug]);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push(`/${tenant.slug}/login`);
  };

  // 1. Enquanto estiver checando, mostra o loader global
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // 2. BLOQUEIO CRÍTICO: Se a assinatura estiver inativa, mostramos a tela de bloqueio e PARAMOS por aqui
  if (isSubscriptionActive === false) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <Card className="max-w-md w-full border-orange-500/20 shadow-2xl">
            <div className="h-2 w-full bg-orange-500" />
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
              <CardTitle className="text-2xl font-serif">Acesso Temporariamente Suspenso</CardTitle>
              <CardDescription>
                O painel profissional da <strong className="font-bold text-primary">{tenant?.name}</strong> está temporariamente inacessível.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                A assinatura do sistema está pendente de regularização pelo administrador. 
                Por favor, entre em contato com o responsável pela barbearia para mais informações.
              </p>

              <Button 
                variant="outline" 
                className="w-full gap-2 h-12"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" /> Sair da Conta
              </Button>

              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
                KingBarbers • Gestão Inteligente
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // 3. Se for autorizado e estiver pago, renderiza o dashboard
  if (isAuthorized) {
    return <Layout>{children}</Layout>;
  }

  return null;
}
