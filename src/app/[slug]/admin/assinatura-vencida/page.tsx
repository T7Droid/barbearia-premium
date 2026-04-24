"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CreditCard, ExternalLink, Loader2, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/use-tenant";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SubscriptionExpiredPage() {
  const tenant = useTenant();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/settings", {
          headers: { "x-tenant-slug": tenant.slug }
        });
        const data = await res.json();
        if (data.isSubscriptionActive) {
          router.push(`/${tenant.slug}/admin`);
        }
      } catch (e) {
        // ignore
      } finally {
        setChecking(false);
      }
    };

    if (tenant?.slug) {
      checkStatus();
    }
  }, [tenant, router]);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug
        },
        body: JSON.stringify({ planId: "basico" })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      // toast error
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    router.push("/login");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full border-destructive/20 shadow-2xl">
        <div className="h-2 w-full bg-destructive" />
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-serif">Acesso Suspenso</CardTitle>
          <CardDescription>
            A assinatura da sua barbearia (**{tenant?.name}**) está vencida ou não foi identificada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-4 text-sm text-destructive-foreground/80 leading-relaxed">
            Para continuar utilizando o painel administrativo e aceitando agendamentos online, é necessário regularizar sua assinatura.
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full h-12 text-lg font-bold gap-2" 
              onClick={handlePay}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
              Regularizar Agora
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" /> Sair da Conta
            </Button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
            Dúvidas? Entre em contato com o suporte KingBarber.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
