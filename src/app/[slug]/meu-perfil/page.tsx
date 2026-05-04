"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Phone, Calendar, History, Settings as SettingsIcon, LogOut, Scissors, Award, Gift } from "lucide-react";
import Link from "next/link";
import { formatCurrencyFromCents } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/components/tenant-provider";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useUserStore } from "@/lib/store/user-store";

export default function UserProfile() {
  const router = useRouter();
  const { toast } = useToast();
  const tenant = useTenant();
  
  const { user, setUser, refreshProfile } = useUserStore();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const headers = { "x-tenant-slug": tenant.slug };

      try {
        console.log("Dashboard: Buscando /api/auth/me e /api/settings...");
        const [userRes, settingsRes] = await Promise.all([
          fetch("/api/auth/me", { signal: controller.signal, headers }),
          fetch("/api/settings", { signal: controller.signal, headers })
        ]);
        
        clearTimeout(timeoutId);
        
        if (!userRes.ok) {
          const savedUser = DemoStore.getUser();
          if (savedUser) {
            setUser(savedUser);
            setLoading(false);
          } else {
            router.push(`/${tenant.slug}/login`);
          }
          return;
        }

        // Usar refreshProfile para centralizar a busca do usuário no store
        const userData = await refreshProfile(tenant.slug);
        const settingsData = await settingsRes.json();
        
        if (!userData) {
          const savedUser = DemoStore.getUser();
          if (savedUser) {
            setUser(savedUser);
          } else {
            router.push(`/${tenant.slug}/login`);
            return;
          }
        } else {
          setUser(userData);
          DemoStore.saveUser(userData);
        }

        setSettings(settingsData);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard Error:", err);
        const savedUser = DemoStore.getUser();
        if (savedUser) setUser(savedUser);
        setLoading(false);
      }
    };

    fetchData();
  }, [router, tenant]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      DemoStore.clearUser();
      router.push(`/${tenant.slug}`);
      router.refresh();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground animate-pulse text-sm font-medium">Carregando seus dados...</p>
          </div>
        </div>
      </div>
    );
  }

  const getLink = (path: string) => `/${tenant.slug}${path}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground">Bem-vindo de volta, {user?.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20">
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card de Pontos e Fidelidade */}
          {settings?.isPointsEnabled && (
            <Card className="lg:col-span-3 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                      <Award className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-serif">Seu Cartão Fidelidade</h3>
                      <p className="text-sm text-muted-foreground">Continue agendando para ganhar serviços grátis</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full max-w-md space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="uppercase tracking-wider">Progresso</span>
                      <span>{user?.points || 0} / {settings?.pointsThreshold || settings?.points_threshold || 100} pts</span>
                    </div>
                    <Progress value={((user?.points || 0) / (settings?.pointsThreshold || settings?.points_threshold || 100)) * 100} className="h-3 shadow-inner" />
                    <p className="text-[10px] text-muted-foreground text-center italic">
                      Faltam {(settings?.pointsThreshold || settings?.points_threshold || 100) - (user?.points || 0)} pontos para sua recompensa: {settings?.rewardDescription || settings?.reward_description || "Serviço Grátis"}
                    </p>
                  </div>

                  <div className="bg-background/50 p-4 rounded-xl border border-primary/10 flex items-center gap-3">
                    <Gift className="w-8 h-8 text-primary" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Próximos Pontos</p>
                      <p className="text-lg font-black text-primary">+{settings?.pointsPerAppointment || settings?.points_per_appointment || 10}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados Pessoais */}
          <Card className="lg:col-span-1 shadow-sm border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-serif">
                <User className="w-5 h-5 text-primary" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 p-3 rounded-lg bg-accent/30 border border-border/50">
                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">E-mail</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-1 p-3 rounded-lg bg-accent/30 border border-border/50">
                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Telefone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{user?.phone || 'Não informado'}</p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full mt-2">
                <Link href={getLink("/meu-perfil/settings")}>
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Editar Dados
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Menu de Ações Rápida */}
          <Card className="lg:col-span-2 shadow-sm border-border/40 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 h-full">
              <div className="p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border/40 hover:bg-accent/5 transition-colors group">
                <History className="w-10 h-10 text-primary/40 mb-4 group-hover:scale-110 transition-transform" />
                <div>
                  <h3 className="text-xl font-bold font-serif mb-2">Histórico</h3>
                  <p className="text-sm text-muted-foreground mb-4">Veja seus agendamentos passados e gerencie os atuais.</p>
                  <Button asChild className="w-full shadow-lg shadow-primary/10">
                    <Link href={getLink("/meu-perfil/historico")}>Acessar Histórico</Link>
                  </Button>
                </div>
              </div>
              <div className="p-6 flex flex-col justify-between hover:bg-primary/5 transition-colors group border-l border-primary/5 shadow-[inset_0_0_20px_rgba(var(--primary),0.02)]">
                <Scissors className="w-10 h-10 text-primary mb-4 group-hover:rotate-12 transition-transform" />
                <div>
                  <h3 className="text-xl font-bold font-serif mb-2 text-primary">Novo Agendamento</h3>
                  <p className="text-sm text-muted-foreground mb-4">Escolha seu serviço e barbeiro favorito agora mesmo.</p>
                  <Button asChild variant="secondary" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href={getLink("/booking")}>Agendar Agora</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
