"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({ title: "Bem-vindo de volta!", description: "Acessando o painel de gestão." });
        router.push("/admin");
        router.refresh();
      } else {
        toast({ title: "Falha no login", description: "Credenciais administrativas inválidas.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Ocorreu um erro ao tentar entrar.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-primary/10 border-primary/20 text-primary">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs font-medium">
          <strong>Modo Demonstração:</strong> Sinta-se à vontade para explorar! Use qualquer e-mail e senha para acessar o painel.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail Administrativo</Label>
        <Input
          id="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          placeholder="admin@barber.com"
          className="h-12 border-border/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          placeholder="••••••••"
          className="h-12 border-border/50"
        />
      </div>
      <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <>
            <LogIn className="w-5 h-5 mr-2" /> Entrar no Painel
          </>
        )}
      </Button>
    </form>
  );
}
