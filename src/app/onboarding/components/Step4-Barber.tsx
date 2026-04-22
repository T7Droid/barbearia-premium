"use client";

import { useOnboarding } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, User, ArrowLeft, Mail } from "lucide-react";

export function Step4Barber() {
  const { data, updateData, setStep } = useOnboarding();

    e.preventDefault();
    if (!data.barber.name.trim() || !data.barber.email.trim()) return;
    setStep(5);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-serif font-bold">Quem é o Barbeiro?</h2>
        <p className="text-muted-foreground">Adicione o nome do profissional (pode ser o seu próprio nome).</p>
      </div>

      <form onSubmit={handleNext} className="space-y-6 pt-4">
        <div className="space-y-4">
          <Label htmlFor="barberName" className="text-base text-foreground font-semibold">Nome do Profissional</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              id="barberName"
              className="h-14 text-lg pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="barberEmail" className="text-base text-foreground font-semibold">E-mail do Profissional</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              id="barberEmail"
              type="email"
              className="h-14 text-lg pl-10"
              value={data.barber.email}
              onChange={(e) => updateData({ barber: { ...data.barber, email: e.target.value } })}
              placeholder="Ex: profissional@gmail.com"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground italic">
            Se você for o próprio barbeiro, use o mesmo e-mail que usará para acessar sua conta.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="barberBio" className="text-base text-foreground font-semibold">Biografia / Descrição (Opcional)</Label>
          <Textarea 
            id="barberBio"
            className="min-h-[100px] resize-none"
            value={data.barber.description || ""}
            onChange={(e) => updateData({ barber: { ...data.barber, description: e.target.value } })}
            placeholder="Ex: Especialista em cortes clássicos e barboterapia com 10 anos de experiência."
          />
          <p className="text-xs text-muted-foreground italic">
            Dica: Uma boa descrição ajuda a transmitir confiança aos seus clientes.
          </p>
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => setStep(3)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button 
            type="submit" 
            className="flex-1 h-14 text-lg font-bold"
            disabled={!data.barber.name.trim() || !data.barber.email.trim() || !data.barber.email.includes("@")}
          >
            Prosseguir para Finalizar
          </Button>
        </div>
      </form>
    </div>
  );
}
