"use client";

import { Layout } from "@/components/layout";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auth check bypassed for demo version
    return;
    
    if (pathname === "/admin/login") {
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data.authenticated && data.user?.role === "admin") {
          setIsAuthorized(true);
        } else {

          router.push("/admin/login?from=" + encodeURIComponent(pathname));
        }
      } catch (error) {
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Verificando credenciais...</p>
      </div>
    );
  }

  if (pathname === "/admin/login" || isAuthorized) {
    return (
      <Layout>
        {children}
      </Layout>
    );
  }

  return null;
}
