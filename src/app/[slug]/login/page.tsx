"use client";

import { Layout } from "@/components/layout";
import { ClientLoginForm } from "./login-form";
import { User, Sparkles } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";
import { useTenant } from "@/hooks/use-tenant";

export default function ClientLoginPage() {
  const tenant = useTenant();
  const getLink = (path: string) => `/${tenant.slug}${path}`;

  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Área do Cliente</h1>
            <p className="text-muted-foreground mt-2">Acesse sua conta para gerenciar agendamentos</p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-12 h-12" />
            </div>
            
            <Suspense fallback={<div className="h-64 flex items-center justify-center">Carregando formulário...</div>}>
              <ClientLoginForm />
            </Suspense>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Ainda não tem uma conta?{" "}
              <Link href={getLink("/booking")} className="text-primary hover:underline font-bold transition-all">
                Agende seu primeiro corte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
