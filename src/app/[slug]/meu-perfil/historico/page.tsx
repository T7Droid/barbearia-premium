"use client";

import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, History as HistoryIcon, RefreshCw, Scissors, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format, isBefore, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useTenant } from "@/hooks/use-tenant";
import { useRouter } from "next/navigation";

export default function AppointmentHistory() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const tenant = useTenant();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const getLink = (path: string) => `/${tenant.slug}${path}`;

  useEffect(() => {
    if (!tenant.slug) return;

    const headers = { "x-tenant-slug": tenant.slug };
    
    Promise.all([
      fetch("/api/appointments", { headers }).then(res => res.json()),
      fetch("/api/settings", { headers }).then(res => res.json()),
      fetch("/api/auth/me", { headers }).then(res => res.json())
    ]).then(([appointmentsData, settingsData, authData]) => {
      // Autenticação e Sincronização
      if (authData.authenticated) {
        DemoStore.saveUser(authData.user);
      } else {
        const savedUser = DemoStore.getUser();
        if (!savedUser || savedUser.role === "admin") {
          router.push(getLink("/login"));
          return;
        }
      }

      const apiApps = Array.isArray(appointmentsData) ? appointmentsData : [];
      const savedApps = DemoStore.getAppointments();
      
      // Mesclar e remover duplicatas pelo ID
      const allApps = [...apiApps];
      savedApps.forEach(saved => {
        if (!allApps.some(api => api.id === saved.id)) {
          allApps.push(saved);
        }
      });

      // Ordenar por data (mais recentes primeiro)
      allApps.sort((a: any, b: any) => {
        return new Date(`${b.appointmentDate}T${b.appointmentTime}`).getTime() - 
               new Date(`${a.appointmentDate}T${a.appointmentTime}`).getTime();
      });

      setAppointments(allApps);
      setSettings(settingsData);
      setLoading(false);
    }).catch(() => {
      const savedUser = DemoStore.getUser();
      if (savedUser && savedUser.role !== "admin") {
        setLoading(false);
      } else {
        router.push(getLink("/login"));
      }
    });
  }, [tenant.slug]);

  const canReschedule = (dateStr: string) => {
    if (!settings) return false;
    const appDate = parseISO(dateStr);
    const minDate = addDays(new Date(), settings.cancellationWindowDays || 1);
    return isBefore(new Date(), appDate) && isBefore(minDate, appDate);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge className="bg-primary/20 text-primary border-primary/30">Confirmado</Badge>;
      case "pending": return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Pendente</Badge>;
      case "cancelled": return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">Cancelado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground flex items-center gap-3">
              <HistoryIcon className="w-8 h-8 text-primary" /> Meus Agendamentos
            </h1>
            <p className="text-muted-foreground mt-1">Visualize e gerencie seu histórico na {tenant.name}.</p>
          </div>
          <Button asChild>
            <Link href={getLink("/booking")}>Novo Agendamento</Link>
          </Button>
        </div>

        <Card className="bg-card border-border/50 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-foreground h-12">Serviço</TableHead>
                  <TableHead className="text-foreground">Data / Hora</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-right text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 opacity-20" />
                        <p>Nenhum agendamento encontrado.</p>
                        <Button variant="link" asChild><Link href={getLink("/booking")}>Agendar agora</Link></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((app) => (
                    <TableRow key={app.id} className="border-border/50 hover:bg-muted/30 group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            <Scissors className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{app.serviceName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-muted-foreground" /> {app.appointmentDate.split("-").reverse().join("/")}</span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {app.appointmentTime}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right">
                        {canReschedule(app.appointmentDate) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-primary/10 text-primary hover:bg-primary/20 gap-2 border border-primary/20"
                            asChild
                          >
                            <Link href={getLink(`/booking?reschedule=${app.id}&serviceId=${app.serviceId}`)}>
                              <RefreshCw className="w-3 h-3" /> Remarcar
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Prazo encerrado</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="mt-8 p-4 bg-muted/30 border border-border/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground uppercase tracking-widest text-[10px]">Política de Agendamento</p>
            <p>Você pode remarcar ou cancelar seus horários com até <strong>{settings?.cancellationWindowDays || 1} dia(s)</strong> de antecedência.</p>
            <p>Em caso de dúvidas, entre em contato via WhatsApp.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
