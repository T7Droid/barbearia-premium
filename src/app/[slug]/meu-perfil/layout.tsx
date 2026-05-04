"use client";

import { Layout } from "@/components/layout";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Clock, LogOut } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { userStore } from "@/lib/store/user-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function ClientProfileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tenant = useTenant();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState<boolean | null>(null);

  useEffect(() => {
    const handlePageShow = () => setIsLoading(false);
    window.addEventListener("pageshow", handlePageShow);

    const checkStatus = async () => {
      try {
        const headers = { "x-tenant-slug": tenant.slug };
        const res = await fetch("/api/auth/me", { headers, cache: "no-store" });
        
        if (!res.ok) throw new Error("Falha na autenticação");

        const data = await res.json();
        
        if (data.authenticated) {
          userStore.setUser(data.user);
          // Se for explicitamente false, a assinatura está inativa
          const active = data.isSubscriptionActive !== false;
          console.log(`[ClientProfileLayout] Subscription active: ${active}`, data.isSubscriptionActive);
          setIsSubscriptionActive(active);
        } else {
          router.push(`/${tenant.slug}/login?from=${encodeURIComponent(pathname)}`);
        }
      } catch (error) {
        console.error("Client Auth Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
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
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // 2. BLOQUEIO CRÍTICO: Se a assinatura estiver inativa, mostramos a tela de bloqueio e PARAMOS
  if (isSubscriptionActive === false) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <Card className="max-w-md w-full border-primary/10 shadow-2xl">
            <div className="h-1.5 w-full bg-primary/20" />
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary/40" />
              </div>
              <CardTitle className="text-2xl font-serif">Sistema em Manutenção</CardTitle>
              <CardDescription>
                A área de clientes da <strong className="font-bold text-primary">{tenant?.name}</strong> está temporariamente indisponível.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Estamos realizando ajustes técnicos no sistema de agendamento. 
                Por favor, tente acessar seu histórico ou configurações novamente em alguns instantes.
              </p>

              <div className="space-y-3">
                <Button 
                  className="w-full h-12"
                  onClick={() => router.push(`/${tenant.slug}`)}
                >
                  Voltar para o Início
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full gap-2 text-muted-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" /> Sair da Conta
                </Button>
              </div>

              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
                KingBarbers • Experiência Premium
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // 3. Se estiver pago e logado, renderiza o perfil
  return <Layout>{children}</Layout>;
}
