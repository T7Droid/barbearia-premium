"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Loader2, Ticket, Calendar, History, Settings, ExternalLink } from "lucide-react";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useRouter } from "next/navigation";

export default function ClientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [nextAppointment, setNextAppointment] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(res => res.json()),
      fetch("/api/settings").then(res => res.json())
    ]).then(([userData, settingsData]) => {
      if (userData.authenticated) {
        setData(userData);
        // Salvar/Sincronizar no DemoStore
        DemoStore.saveUser(userData.user);
      } else {
        // Fallback para DemoStore se estiver na Vercel e o servidor resetou
        const savedUser = DemoStore.getUser();
        if (savedUser) {
          setData({ authenticated: true, user: savedUser });
        } else {
          router.push("/login");
          return;
        }
      }
      
      if (userData.user?.role === "admin") {
        router.push("/admin");
        return;
      }

      setSettings(settingsData);

      // Carregar agendamentos (Mock + DemoStore)
      const savedApps = DemoStore.getAppointments();
      setAppointments(savedApps);
      
      if (savedApps.length > 0) {
        // Pegar o agendamento mais futuro/recentemente criado
        setNextAppointment(savedApps[0]);
      }

      setLoading(false);
    }).catch(() => {
      const savedUser = DemoStore.getUser();
      if (savedUser) {
        setData({ authenticated: true, user: savedUser });
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
  }, [router]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground">Olá, {data?.user?.name || "Cliente"}</h1>
            <p className="text-muted-foreground mt-2">Bem-vindo à sua área exclusiva na Barbearia Premium.</p>
          </div>
          <Button asChild className="h-12 px-8">
            <Link href="/booking">Novo Agendamento</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {}
          {settings?.isPointsEnabled && (
            <Card className="bg-primary/5 border-primary/20 shadow-lg md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Meus Pontos</CardTitle>
                <Ticket className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-foreground">{data?.user?.points || 0} <span className="text-xs font-normal text-muted-foreground">pts</span></div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {data?.user?.points >= 200 ? "Membro Gold" : "Membro Silver"}
                  </Badge>
                  {data?.user?.points < 200 && (
                    <p className="text-xs text-muted-foreground">Faltam {200 - (data?.user?.points || 0)} pts para GOLD</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={`bg-card border-border/50 shadow-lg ${settings?.isPointsEnabled ? 'md:col-span-2' : 'md:col-span-3'}`}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Próximo Agendamento</CardTitle>
                <CardDescription>Não se esqueça do seu horário!</CardDescription>
              </div>
              <Calendar className="w-6 h-6 text-primary" />
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {nextAppointment.appointmentDate.split("-")[2]}
                    </div>
                    <div>
                      <p className="font-medium">{nextAppointment.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {nextAppointment.appointmentDate.split('-').reverse().join('/')} às {nextAppointment.appointmentTime}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/meu-perfil/historico">Detalhes</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground italic">
                  Nenhum agendamento futuro encontrado.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          <Button variant="outline" asChild className="h-20 justify-start px-6 border-dashed hover:border-primary">
            <Link href="/meu-perfil/historico" className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center"><History className="w-4 h-4 text-accent-foreground" /></div>
              <span>Ver Histórico Completo</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-20 justify-start px-6 border-dashed hover:border-primary">
            <Link href="/meu-perfil/settings" className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center"><Settings className="w-4 h-4 text-accent-foreground" /></div>
              <span>Minhas Configurações</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-20 justify-start px-6 border-dashed hover:border-primary">
            <a href="https://wa.me/5513982046758" target="_blank" className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center"><ExternalLink className="w-4 h-4 text-green-500" /></div>
              <span>Suporte via WhatsApp</span>
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
