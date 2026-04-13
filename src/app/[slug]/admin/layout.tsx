"use client";

import { Layout } from "@/components/layout";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tenant = useTenant();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const adminLoginPath = `/${tenant.slug}/admin/login`;

    if (pathname === adminLoginPath) {
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); 

      try {
        const headers = { "x-tenant-slug": tenant.slug };
        const res = await fetch("/api/auth/me", { signal: controller.signal, headers });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error("Falha na autenticação");
        }
        
        const data = await res.json();

        if (data.authenticated && data.user?.role === "admin") {
          setIsAuthorized(true);
        } else {
          router.push(`${adminLoginPath}?from=${encodeURIComponent(pathname)}`);
        }
      } catch (error: any) {
        console.error("Auth check error:", error);
        router.push(adminLoginPath);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router, tenant]);

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
