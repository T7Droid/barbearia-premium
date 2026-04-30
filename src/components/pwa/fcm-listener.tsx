"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useOptionalTenant } from "@/components/tenant-provider";
import { Bell } from "lucide-react";
import React from "react";

export function FCMListener() {
  const { toast } = useToast();
  const router = useRouter();
  const tenant = useOptionalTenant();

  useEffect(() => {
    if (!messaging) return;

    console.log("[FCMListener] Configurando listener de mensagens em primeiro plano...");

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCMListener] Mensagem recebida em primeiro plano:", payload);

      const title = payload.notification?.title || "Nova Notificação";
      const body = payload.notification?.body || "Você recebeu uma nova atualização.";
      
      // O slug do tenant pode vir no payload de dados ou ser usado o atual ou do localStorage
      let slug = payload.data?.slug || tenant?.slug;
      
      if (!slug && typeof window !== "undefined") {
        slug = localStorage.getItem("last_tenant_slug") || "";
      }

      const targetUrl = slug ? `/${slug}/meu-perfil/historico` : "/home";

      toast({
        title: title,
        description: body,
        action: (
          <ToastAction 
            altText="Ver Agendamentos" 
            onClick={() => router.push(targetUrl)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full border-none h-10 mt-2"
          >
            Ver Meus Agendamentos
          </ToastAction>
        ),
        className: "flex-col items-start gap-2 p-5",
      });
    });

    return () => unsubscribe();
  }, [messaging, toast, router, tenant?.slug]);

  return null;
}
