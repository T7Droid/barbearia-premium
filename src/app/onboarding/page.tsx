"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "./context";
import { Step1Tenant } from "./components/Step1-Tenant";
import { Step2Unit } from "./components/Step2-Unit";
import { Step3Services } from "./components/Step3-Services";
import { Step4Barber } from "./components/Step4-Barber";
import { Step5Account } from "./components/Step5-Account";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const LOADING_STEPS = [
  "Verificando disponibilidade de painel...",
  "Reservando subdomínio da Barbearia...",
  "Aplicando serviços base...",
  "Aprovando e protegendo a conta...",
  "Concluído com sucesso!"
];

export default function OnboardingPage() {
  const { step, data } = useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setLoadingStepIndex(0);

    // Efeito Psicológico: Rodar as mensagens
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => {
        if (prev < LOADING_STEPS.length - 2) return prev + 1;
        return prev;
      });
    }, 2000);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar barbearia");
      }

      // Chegou no penúltimo passo do loader? Esperar o final
      setLoadingStepIndex(LOADING_STEPS.length - 1);
      
      // Auto-login
      if (data.account.password) {
        await supabase?.auth.signInWithPassword({
          email: data.account.email,
          password: data.account.password,
        });
      }

      // Pequena pausa no "Concluído"
      setTimeout(() => {
        clearInterval(interval);
        router.push(`/${result.slug}/admin/configuracoes`);
      }, 1500);

    } catch (error: any) {
      clearInterval(interval);
      setIsSubmitting(false);

      let friendlyTitle = "Ops! Temos um detalhe";
      let friendlyMessage = error.message;
      let variant: "default" | "destructive" = "default";

      if (error.message.includes("already been registered")) {
        friendlyMessage = "Este e-mail já está sendo usado por uma barbearia em nosso sistema. Deseja fazer login em vez de criar uma nova?";
      } else if (error.message.includes("profiles_pkey")) {
        friendlyMessage = "Já existe um perfil vinculado a este acesso. Parece que um cadastro foi iniciado anteriormente.";
      } else {
        variant = "destructive";
        friendlyTitle = "Erro no Cadastro";
      }

      toast({
        title: friendlyTitle,
        description: friendlyMessage,
        variant: variant,
      });
    }
  };

  const stepsList = [
    { id: 1, label: "Barbearia" },
    { id: 2, label: "Unidade" },
    { id: 3, label: "Serviços" },
    { id: 4, label: "Profissional" },
    { id: 5, label: "Acesso" },
  ];

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-500">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-3xl font-serif font-bold mb-2">Estamos preparando tudo...</h2>
        <p className="text-xl text-muted-foreground animate-pulse duration-1000">
          {LOADING_STEPS[loadingStepIndex]}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Sidebar Rail */}
        <div className="md:col-span-3 space-y-4">
          <div className="sticky top-24">
            <h1 className="text-xl font-bold mb-6 px-2">Configuração</h1>
            <nav className="space-y-1">
              {stepsList.map((s) => (
                <div 
                  key={s.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    step === s.id 
                    ? "bg-primary/10 text-primary font-bold border-l-4 border-primary" 
                    : step > s.id 
                    ? "text-green-500 opacity-80" 
                    : "text-muted-foreground opacity-50"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                    step > s.id ? "bg-green-500 border-green-500 text-white" : "border-current"
                  }`}>
                    {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span className="text-sm">{s.label}</span>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <Card className="md:col-span-9 border-border/50 shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
          <CardContent className="p-8 md:p-12 flex-1 flex flex-col justify-center">
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              {step === 1 && <Step1Tenant />}
              {step === 2 && <Step2Unit />}
              {step === 3 && <Step3Services />}
              {step === 4 && <Step4Barber />}
              {step === 5 && <Step5Account onFinish={handleFinish} isSubmitting={isSubmitting} />}
            </div>
          </CardContent>
          
          <div className="bg-muted/30 p-4 border-t flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            <span>Passo {step} de 5</span>
            <div className="flex gap-1">
              {stepsList.map(s => (
                <div key={s.id} className={`w-8 h-1 rounded-full ${step >= s.id ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
