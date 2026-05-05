"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";
import { useTenant } from "@/components/tenant-provider";
import { Layout } from "@/components/layout";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const tenant = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  useEffect(() => {
    // Supabase redirects to this page with the access token in the URL hash.
    // If there is an error (e.g. expired link), it will be in the hash too.
    const hash = window.location.hash;
    if (hash && hash.includes("error=")) {
      const urlParams = new URLSearchParams(hash.substring(1));
      const errorDescription = urlParams.get("error_description");
      if (errorDescription?.includes("expired")) {
        setErrorMsg("O link de recuperação expirou ou já foi utilizado. Por favor, solicite um novo link na página de login.");
      } else {
        setErrorMsg(errorDescription || "Ocorreu um erro ao validar o link de recuperação.");
      }
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Senhas diferentes",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Since the user is authenticated via the URL hash, we can update their password
      const { error } = await supabase!.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso. Você já pode fazer o login.",
      });
      
      // Redirect to login page
      router.push(`/${tenant.slug}/login`);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message || "Tente solicitar um novo link de recuperação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24 flex items-center justify-center">
        <Card className="w-full max-w-md border-border/50 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <CardHeader className="space-y-1 text-center pt-8 pb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-serif font-bold">Nova Senha</CardTitle>
            <CardDescription>
              {errorMsg ? "Falha na recuperação" : "Crie uma nova senha para acessar sua conta."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMsg ? (
              <div className="space-y-6">
                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                  {errorMsg}
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => router.push(`/${tenant.slug}/login`)}
                >
                  Voltar para o Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" className="w-full h-12 text-lg mt-4 group" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  Redefinir Senha
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
