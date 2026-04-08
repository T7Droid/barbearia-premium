"use client";

import { Layout } from "@/components/layout";
import { ClientLoginForm } from "./login-form";
import { User, Sparkles } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";

export default function ClientLoginPage() {
  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 relative">
              <User className="w-10 h-10 text-primary" />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
            <h1 className="text-4xl font-serif font-bold text-foreground tracking-tight">Área do Cliente</h1>
            <p className="text-muted-foreground mt-3 text-lg">Acesse seus agendamentos e saldo de pontos.</p>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            <Suspense fallback={<div className="h-[200px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <ClientLoginForm />
            </Suspense>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Ainda não tem uma conta?{" "}
              <Link href="/booking" className="text-primary hover:underline font-bold transition-all">
                Agende seu primeiro corte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
