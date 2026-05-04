"use client";

import { Layout } from "@/components/layout";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { userStore } from "@/lib/store/user-store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tenant = useTenant();
  const initialUser = userStore.getState().user;
  const [isAuthorized, setIsAuthorized] = useState(initialUser?.role === "admin");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const adminLoginPath = `/${tenant.slug}/admin/login`;
    const adminRootPath = `/${tenant.slug}/admin`;

    // Proteção para BFCache: Se o usuário voltar do Stripe, resetamos o loading
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || event) {
        setIsLoading(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    const checkAuth = async () => {
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const headers = { "x-tenant-slug": tenant.slug };
        const res = await fetch("/api/auth/me", { signal: controller.signal, headers, cache: "no-store" });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error("Falha na autenticação");
        }

        const data = await res.json();

        if (data.authenticated && data.user?.role === "admin") {
          setIsAuthorized(true);
          userStore.setUser(data.user);
          setIsSubscriptionActive(data.isSubscriptionActive !== false);

          const isExpiredPath = pathname.endsWith("/assinatura-vencida");

          if (data.isSubscriptionActive === false && !isExpiredPath && pathname !== adminLoginPath) {
            router.push(`/${tenant.slug}/admin/assinatura-vencida`);
            return;
          }

          if (pathname === adminLoginPath) {
            if (data.isSubscriptionActive === false) {
              router.push(`/${tenant.slug}/admin/assinatura-vencida`);
            } else {
              router.push(adminRootPath);
            }
          }
        } else {
          setIsAuthorized(false);
          userStore.setUser(null);

          if (pathname !== adminLoginPath) {
            router.push(`${adminLoginPath}?from=${encodeURIComponent(pathname)}`);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn("Auth check timed out.");
        } else {
          console.error("Auth check error:", error);
        }

        userStore.setUser(null);
        if (pathname !== adminLoginPath) {
          router.push(adminLoginPath);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    return () => {
      controller.abort();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [pathname, router, tenant.slug]);

  // 1. Enquanto estiver checando (sessão ou assinatura), mostra o loader global
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Verificando credenciais...</p>
      </div>
    );
  }

  const isExpiredPath = pathname.endsWith("/assinatura-vencida");
  const adminLoginPath = `/${tenant.slug}/admin/login`;

  // 2. Se for a página de login, permitimos renderizar para o admin deslogado
  if (pathname === adminLoginPath) {
    return <Layout>{children}</Layout>;
  }

  // 3. BLOQUEIO CRÍTICO: Só renderiza os filhos se:
  // - O usuário for admin autorizado
  // - E a assinatura NÃO estiver inativa (ou se já estiver na página de aviso de vencimento)
  const canRender = isAuthorized && (isSubscriptionActive !== false || isExpiredPath);

  if (canRender) {
    return (
      <Layout>
        {children}
      </Layout>
    );
  }

  // 4. Fallback de segurança: Se caiu aqui e não é autorizado, o useEffect já disparou o redirect
  return null;
}
