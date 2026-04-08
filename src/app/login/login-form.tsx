"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";

export function ClientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const from = searchParams.get("from") || "/meu-perfil";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: "Bem-vindo!", description: `Olá, ${data.user.name}. Acessando seu perfil.` });
        router.push(data.redirectTo || from);
        router.refresh();
      } else {
        toast({ title: "Falha no login", description: data.error || "E-mail ou senha incorretos.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Ocorreu um erro ao tentar entrar.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-semibold ml-1">E-mail</Label>
        <div className="relative group">
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="exemplo@email.com"
            className="h-12 border-border/50 pl-11 group-focus-within:border-primary transition-all rounded-xl"
          />
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-semibold ml-1">Senha</Label>
        <div className="relative group">
          <Input
            id="password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="••••••••"
            className="h-12 border-border/50 pl-11 group-focus-within:border-primary transition-all rounded-xl"
          />
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
      </div>
      <Button type="submit" className="w-full h-12 text-lg font-bold group bg-primary hover:bg-primary/90 transition-all rounded-xl" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Acessar Perfil <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Button>
    </form>
  );
}
