"use client";

import { useOnboarding } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Key, Mail, User, Phone, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

interface Step5AccountProps {
  onFinish: () => void;
  isSubmitting: boolean;
}

export function Step5Account({ onFinish, isSubmitting }: Step5AccountProps) {
  const { data, updateData, setStep } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  // Sincronização para Plano Básico: Garante que Admin e Barbeiro sejam a mesma pessoa
  useEffect(() => {
    if (data.planId === "basico") {
      const hasChanges = data.account.fullName !== data.barber.name || 
                        data.account.email !== data.barber.email;
      
      if (hasChanges) {
        updateData({
          account: {
            ...data.account,
            fullName: data.barber.name,
            email: data.barber.email
          }
        });
      }
    }
  }, [data.planId, data.barber.name, data.barber.email, data.account.fullName, data.account.email, updateData]);

  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/;
  const isPasswordSecure = passwordRegex.test(data.account.password || "");
  const passwordsMatch = data.account.password === confirmPassword;

  const isFormValid = 
    data.account.fullName.trim().length > 3 &&
    data.account.email.includes("@") &&
    data.account.phone.length >= 8 &&
    isPasswordSecure &&
    passwordsMatch &&
    data.account.acceptedTerms &&
    data.account.acceptedPrivacy;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-serif font-bold">Quase lá! Crie seu Acesso</h2>
        <p className="text-muted-foreground">Estes dados serão usados para você gerenciar sua barbearia.</p>
      </div>

      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo do Responsável</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              id="fullName"
              className="pl-9 h-12"
              value={data.account.fullName}
              onChange={(e) => updateData({ account: { ...data.account, fullName: e.target.value } })}
              placeholder="Ex: Carlos Oliveira"
              required
              disabled={data.planId === "basico"}
            />
          </div>
          {data.planId === "basico" && (
            <p className="text-[10px] text-primary font-medium italic">
              Nome fixado conforme o profissional
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail Administrativo</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                id="email"
                type="email"
                className="pl-9 h-12"
                value={data.account.email}
                onChange={(e) => updateData({ account: { ...data.account, email: e.target.value } })}
                placeholder="carlos@exemplo.com"
                required
                disabled={data.planId === "basico"}
              />
            </div>
            {data.planId === "basico" && (
              <p className="text-[10px] text-primary font-medium italic">
                E-mail fixado conforme o profissional
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp (contato)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                id="phone"
                className="pl-9 h-12"
                value={data.account.phone}
                onChange={(e) => updateData({ account: { ...data.account, phone: e.target.value } })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">Defina uma Senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                id="password"
                type={showPassword ? "text" : "password"}
                className={`pl-9 pr-10 h-11 ${data.account.password && !isPasswordSecure ? 'border-amber-500 bg-amber-500/5' : 'border-primary/20'}`}
                value={data.account.password || ""}
                onChange={(e) => updateData({ account: { ...data.account, password: e.target.value } })}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className={`text-[10px] ${data.account.password && !isPasswordSecure ? 'text-amber-600 font-bold' : 'text-muted-foreground'}`}>
              Deve conter no mínimo 6 caracteres, letras e números.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirme sua Senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                className={`pl-9 h-11 ${confirmPassword && !passwordsMatch ? 'border-red-500 bg-red-500/5' : 'border-primary/20'}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
              />
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-[10px] text-red-600 font-bold">As senhas não coincidem.</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox 
            id="acceptedTerms" 
            checked={data.account.acceptedTerms} 
            onCheckedChange={(checked) => updateData({ account: { ...data.account, acceptedTerms: checked === true } })}
            className="mt-1"
          />
          <Label htmlFor="acceptedTerms" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
            Eu li e aceito os <strong>Termos de Uso</strong> e as condições de serviço da plataforma.
          </Label>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox 
            id="acceptedPrivacy" 
            checked={data.account.acceptedPrivacy} 
            onCheckedChange={(checked) => updateData({ account: { ...data.account, acceptedPrivacy: checked === true } })}
            className="mt-1"
          />
          <Label htmlFor="acceptedPrivacy" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
            Concordo com a <strong>Política de Privacidade</strong> e o processamento dos meus dados pessoais conforme a LGPD.
          </Label>
        </div>

        <div className="flex items-start gap-3 pt-2 border-t border-primary/10">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs leading-relaxed text-muted-foreground">Ao finalizar, configuraremos sua barbearia e você terá acesso imediato ao painel administrativo.</p>
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t">
        <Button 
          type="button" 
          variant="ghost" 
          disabled={isSubmitting} 
          onClick={() => setStep(4)} 
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button 
          className="flex-1 bg-primary hover:bg-primary/90 text-xl py-8 font-bold shadow-lg shadow-primary/20"
          disabled={!isFormValid || isSubmitting}
          onClick={onFinish}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Processando...</span>
            </div>
          ) : (
            "Finalizar e Criar Minha Barbearia"
          )}
        </Button>
      </div>
    </div>
  );
}
