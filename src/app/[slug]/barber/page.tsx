"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { useUserStore } from "@/lib/store/user-store";
import { 
  Calendar, 
  Clock, 
  Users, 
  Scissors, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";

export default function BarberDashboard() {
  const { toast } = useToast();
  const tenant = useTenant();
  const { user } = useUserStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Segurança: Apenas barbeiros e admins acessam este painel
  useEffect(() => {
    if (!isLoading && user && user.role !== 'barber' && user.role !== 'admin') {
      router.push(`/${tenant.slug}`);
    }
  }, [user, isLoading, tenant.slug, router]);

  const fetchBarberData = async () => {
    try {
      const headers = { "x-tenant-slug": tenant.slug };
      const res = await fetch("/api/barber/stats", { headers });
      const data = await res.json();
      
      setStats(data.stats);
      setTodayAppointments(data.todayAppointments);
    } catch (error) {
       // Silently fail or show toast if needed
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenant.slug) fetchBarberData();
  }, [tenant.slug]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">Olá, {user?.name || "Barbeiro"}</h1>
            <p className="text-muted-foreground">Aqui está um resumo do seu dia na {tenant.name}.</p>
          </div>
          <Button asChild className="gap-2">
            <Link href={`/${tenant.slug}/barber/horarios`}>
              <Clock className="w-4 h-4" /> Gerenciar Meus Horários
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Hoje
              </CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.todayCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Agendamentos para hoje</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Concluídos
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.completedCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Atendimentos finalizados</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Pendentes
              </CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.pendingCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando atendimento</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Eficiência
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.efficiency || "100"}%</div>
              <p className="text-xs text-muted-foreground mt-1">Taxa de comparecimento</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-serif text-xl font-bold">Agenda de Hoje</CardTitle>
                  <CardDescription>Próximos clientes que você irá atender.</CardDescription>
                </div>
                <div className="bg-primary/10 px-3 py-1 rounded-full text-xs font-bold text-primary border border-primary/20">
                  {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                </div>
              </CardHeader>
              <CardContent>
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
                    <p>Nenhum agendamento para hoje.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayAppointments.map((app) => (
                      <div key={app.id} className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/30 transition-colors border-border/50 shadow-sm bg-background">
                        <div className="w-16 h-16 rounded-lg bg-primary/5 border border-primary/10 flex flex-col items-center justify-center p-2">
                           <span className="text-lg font-bold text-primary">{app.appointment_time}</span>
                           <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Início</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg truncate">{app.customer_name}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Scissors className="w-3.5 h-3.5" /> {app.service_name}
                          </p>
                        </div>
                        <div className="hidden sm:flex flex-col items-end gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${app.status === 'confirmed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                              app.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                              'bg-muted text-muted-foreground border border-border'}`}>
                            {app.status === 'confirmed' ? 'Confirmado' : app.status === 'pending' ? 'Pendente' : app.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
             <Card className="border-border/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="font-serif text-lg font-bold">Dicas do Dia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="p-3 bg-white rounded-lg border border-primary/10 shadow-sm">
                      <p className="text-sm font-medium">Lembre-se de confirmar o status dos atendimentos concluídos para que os pontos de fidelidade sejam creditados aos clientes.</p>
                   </div>
                   <div className="p-3 bg-white rounded-lg border border-primary/10 shadow-sm">
                      <p className="text-sm font-medium">Mantenha seu perfil atualizado com suas melhores fotos!</p>
                   </div>
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
