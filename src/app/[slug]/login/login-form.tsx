"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useTenant } from "@/components/tenant-provider";
import { userStore } from "@/lib/store/user-store";

export function ClientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const tenant = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Persistir para Modo Demo e Sincronizar Store Reativa
        const user = data.user;
        DemoStore.saveUser(user);
        userStore.setUser(user);

        toast({
          title: "Bem-vindo!",
          description: "Você entrou na sua conta.",
        });

        // Redireciona para a página originária (from) ou a home
        const from = searchParams.get("from");
        const redirectPath = from || (user.role === "barber" ? `/${tenant.slug}` : `/${tenant.slug}`);

        router.push(redirectPath);
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao entrar",
          description: data.error || "E-mail ou senha incorretos.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro de conexão",
        description: "Tente novamente em instantes.",
      });
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
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
