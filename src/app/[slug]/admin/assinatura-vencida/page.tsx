"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CreditCard, ExternalLink, LogOut } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function SubscriptionExpiredPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${slug}/admin/login`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Acesso Bloqueado</h1>
          <p className="text-muted-foreground">
            Sua assinatura do sistema Barber Premium está vencida ou não foi identificada.
          </p>
        </div>

        <Card className="border-red-500/20 bg-card/50 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Regularize sua situação</CardTitle>
            <CardDescription>
              Para continuar utilizando o painel administrativo e gerenciar sua barbearia, é necessário efetuar o pagamento da licença.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/10 space-y-2">
              <div className="flex items-center gap-2 text-orange-500 font-semibold text-sm">
                <CreditCard className="w-4 h-4" />
                <span>Pague com Stripe</span>
              </div>
              <p className="text-xs text-muted-foreground">
                O pagamento é processado de forma segura via Stripe. Após a confirmação, seu acesso será liberado instantaneamente.
              </p>
            </div>

            <Button className="w-full h-12 text-lg font-semibold gap-2 shadow-lg shadow-primary/20" onClick={() => window.open('https://stripe.com', '_blank')}>
              Efetuar Pagamento <ExternalLink className="w-4 h-4" />
            </Button>

            <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Sair do Sistema
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Dúvidas? Entre em contato com o suporte técnico.
        </p>
      </div>
    </div>
  );
}
