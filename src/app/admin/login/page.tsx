"use client";

import { AdminLoginForm } from "./login-form";
import { Scissors, ShieldCheck } from "lucide-react";
import { Suspense } from "react";

export default function AdminLoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30 min-h-[80vh]">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Scissors className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-2">Área restrita para gestão da Barbearia Premium.</p>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <Suspense fallback={<div className="h-[200px] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <AdminLoginForm />
          </Suspense>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Acesso monitorado e restrito
        </div>
      </div>
    </div>
  );
}
