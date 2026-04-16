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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const adminLoginPath = `/${tenant.slug}/admin/login`;
    const adminRootPath = `/${tenant.slug}/admin`;

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
          
          // Se estiver na tela de login mas já estiver autenticado como admin, redireciona para o painel
          if (pathname === adminLoginPath) {
            router.push(adminRootPath);
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
    };
  }, [pathname, router, tenant.slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Verificando credenciais...</p>
      </div>
    );
  }

  const adminLoginPath = `/${tenant.slug}/admin/login`;
  if (pathname === adminLoginPath || isAuthorized) {
    return (
      <Layout>
        {children}
      </Layout>
    );
  }

  return null;
}
