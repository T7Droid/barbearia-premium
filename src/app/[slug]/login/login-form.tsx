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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

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

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!resetEmail) return;
    setIsResetting(true);
    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/${tenant.slug}/reset-password`,
      });
      if (error) throw error;
      setResetSuccess(true);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o e-mail.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

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
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-semibold ml-1">Senha</Label>
          <Dialog open={isResetDialogOpen} onOpenChange={(open) => {
            setIsResetDialogOpen(open);
            if (!open) {
              // Reset state when closing
              setTimeout(() => {
                setResetSuccess(false);
                setResetEmail("");
              }, 300);
            }
          }}>
            <DialogTrigger asChild>
              <button type="button" className="text-sm text-primary hover:underline font-medium">
                Esqueci minha senha
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Recuperar Senha</DialogTitle>
                <DialogDescription>
                  {resetSuccess ? "Enviamos as instruções para o seu e-mail." : "Digite seu e-mail abaixo para receber um link de recuperação."}
                </DialogDescription>
              </DialogHeader>
              {resetSuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <p className="font-medium text-lg text-foreground">E-mail enviado!</p>
                  <p className="text-sm text-muted-foreground">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
                  <Button variant="outline" className="mt-4 w-full" onClick={() => setIsResetDialogOpen(false)}>
                    Fechar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">E-mail cadastrado</Label>
                    <Input 
                      id="reset-email" 
                      type="email" 
                      placeholder="exemplo@email.com" 
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleResetPassword} 
                    disabled={isResetting || !resetEmail}
                  >
                    {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Enviar E-mail de Recuperação
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
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
