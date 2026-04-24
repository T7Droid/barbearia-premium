"use client";

import { useOnboarding } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors, Globe, Zap, ChevronRight } from "lucide-react";
import { generateSlug } from "@/lib/utils";
import { PLANS_INFO } from "@/lib/config/plans";

export function Step1Tenant() {
  const { data, updateData, setStep } = useOnboarding();
  const currentPlan = data.planId ? PLANS_INFO[data.planId] : null;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.tenant.name.trim()) return;
    setStep(2);
  };

  const currentSlug = generateSlug(data.tenant.name);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Scissors className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-serif font-bold">Nome da sua Barbearia</h2>
        <p className="text-muted-foreground">Como os seus clientes conhecerão o seu negócio?</p>
      </div>

      {currentPlan && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentPlan.bg} ${currentPlan.color}`}>
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Plano Selecionado</p>
              <p className="text-sm font-bold">{currentPlan.name}</p>
            </div>
          </div>
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.href = '/#planos'}
            className="text-xs font-bold text-primary hover:bg-primary/5 gap-1"
          >
            Alterar
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}

      <form onSubmit={handleNext} className="space-y-6 pt-2">
        <div className="space-y-4">
          <Label htmlFor="tenantName" className="text-base font-semibold">Nome Comercial</Label>
          <Input 
            id="tenantName"
            className="h-14 text-lg px-4"
            value={data.tenant.name}
            onChange={(e) => updateData({ tenant: { ...data.tenant, name: e.target.value } })}
            placeholder="Ex: King Barbers Centro"
            autoFocus
            required
          />
          
          {data.tenant.name.trim() && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10 animate-in fade-in slide-in-from-top-1 duration-300">
              <Globe className="w-4 h-4 text-primary" />
              <div className="text-sm">
                <span className="text-muted-foreground">Seu link será: </span>
                <span className="font-mono font-bold text-primary">kingbarbers.app/{currentSlug}</span>
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Dica: Use um nome fácil de lembrar.
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full h-14 text-lg font-bold"
          disabled={!data.tenant.name.trim()}
        >
          Prosseguir
        </Button>
      </form>
    </div>
  );
}
