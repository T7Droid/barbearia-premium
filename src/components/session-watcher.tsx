"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOptionalTenant } from "@/components/tenant-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SessionWatcher() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const tenant = useOptionalTenant();

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        // Ignorar se já estamos na página de login
        if (!window.location.pathname.endsWith("/login")) {
          setIsOpen(true);
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const handleRedirect = () => {
    setIsOpen(false);
    const loginPath = tenant ? `/${tenant.slug}/login` : "/login";
    router.push(loginPath);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleRedirect()}>
      <DialogContent className="sm:max-w-md border-primary/20 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
            <LogOut className="w-6 h-6 text-destructive" />
          </div>
          <DialogTitle className="text-2xl font-serif text-center">Sessão Expirada</DialogTitle>
          <DialogDescription className="text-center text-base">
            Sua sessão de acesso expirou por inatividade ou o token é inválido. Por favor, realize o login novamente para continuar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 sm:justify-center">
          <Button 
            onClick={handleRedirect} 
            className="w-full sm:w-auto px-8 gap-2 bg-primary hover:bg-primary/90 font-bold"
          >
            Ir para Login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
