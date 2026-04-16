"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useTenant } from "@/hooks/use-tenant";
import { userStore } from "@/lib/store/user-store";

function CadastroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const tenant = useTenant();
  const getLink = (path: string) => `/${tenant.slug}${path}`;

  const emailParam = searchParams.get("email") || "";
  const nameParam = searchParams.get("name") || "";
  const phoneParam = searchParams.get("phone") || "";

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: nameParam,
    email: emailParam,
    phone: phoneParam,
    password: "",
    confirmPassword: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])/;
    if (!passwordRegex.test(formData.password)) {
      toast({
        title: "Senha muito simples",
        description: "A senha deve conter pelo menos uma letra e um número.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas diferentes",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone
        })
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Persistência para Modo Demo e Sincronizar Store Reativa
        const user = {
          ...userData.user,
          phone: formData.phone
        };
        DemoStore.saveUser(user);
        userStore.setUser(user);

        toast({
          title: "Conta criada!",
          description: "Bem-vindo à King Barber! Agende seu primeiro serviço agora."
        });
        router.push(`/${tenant.slug}`);
        router.refresh();
      } else {
        const error = await response.json();
        toast({
          title: "Erro no cadastro",
          description: error.error || "Algo deu errado.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro de rede",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-24 flex items-center justify-center">
      <Card className="w-full max-w-md border-border/50 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        <CardHeader className="space-y-1 text-center pt-8 pb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-serif font-bold">Finalizar Cadastro</CardTitle>
          <CardDescription>
            Defina uma senha para acessar seu histórico e detalhes do agendamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Carlos Alberto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                placeholder="carlos@exemplo.com"
                disabled={!!emailParam}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Criar Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                required
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-lg mt-4 group" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Salvar e Acessar Perfil
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Seus dados estão protegidos
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-center text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href={getLink("/login")} className="text-primary hover:underline font-medium">
                Faça login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Cadastro() {
  return (
    <Layout>
      <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>}>
        <CadastroContent />
      </Suspense>
    </Layout>
  );
}
