"use client";

import { useEffect, useState, use } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Calendar, Clock, MapPin, Share2, Wallet, Scissors, ExternalLink, Download, Award, CalendarPlus } from "lucide-react";
import { useGetAppointment } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { formatCurrencyFromCents } from "@/lib/format";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useTenant } from "@/hooks/use-tenant";

export default function ConfirmationPage(props: { params: Promise<{ slug: string, id: string }> }) {
  const params = use(props.params);
  const id = parseInt(params.id);
  const tenant = useTenant();
  const { toast } = useToast();

  const { data: apiAppointment, isLoading } = useGetAppointment(id, {
    query: {
      enabled: !!id && id > 0
    }
  });

  const [fallbackAppointment, setFallbackAppointment] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    const headers = { "x-tenant-slug": tenant.slug };
    fetch("/api/settings", { headers })
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(() => {});
  }, [tenant]);

  useEffect(() => {
    const headers = { "x-tenant-slug": tenant.slug };
    fetch("/api/auth/me", { headers })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setAuthStatus("authenticated");
          DemoStore.saveUser(data.user);
        } else {
          setAuthStatus("unauthenticated");
        }
      })
      .catch(() => setAuthStatus("unauthenticated"));
  }, [tenant]);

  // Se a API falhar em encontrar, tenta o DemoStore (LocalStorage)
  useEffect(() => {
    if (!isLoading && !apiAppointment) {
      const appointments = DemoStore.getAppointments();
      const found = appointments.find((a: any) => a.id === id);
      if (found) setFallbackAppointment(found);
    }
  }, [id, apiAppointment, isLoading]);

  const appointment = apiAppointment || fallbackAppointment;

  const handleDownloadVCard = () => {
    if (!settings) return;
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${settings.shopName || 'Barbearia Premium'}
TEL;TYPE=WORK,VOICE:${settings.phone || ''}
URL:${window.location.origin}/${tenant.slug}
END:VCARD`;

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'barbearia.vcf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  const handleAddToCalendar = () => {
    const dateStr = appointment.appointment_date || appointment.appointmentDate;
    const timeStr = appointment.appointment_time || appointment.appointmentTime;
    const serviceName = appointment.service_name || appointment.serviceName;
    const shopName = settings?.shopName || 'Barbearia Premium';
    const address = settings?.address || '';

    if (!dateStr || !timeStr) return;

    try {
      const startDateTime = new Date(`${dateStr}T${timeStr}`);
      const formatICSDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
      };

      const endDateTime = new Date(startDateTime.getTime() + (settings?.slot_interval || 45) * 60000);

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        `DTSTART:${formatICSDate(startDateTime)}`,
        `DTEND:${formatICSDate(endDateTime)}`,
        `SUMMARY:Agendamento: ${serviceName}`,
        `LOCATION:${address}`,
        `DESCRIPTION:Agendamento na ${shopName}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'agendamento.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível gerar o calendário.' });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground font-medium">Buscando detalhes do agendamento...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!appointment) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Card className="max-w-md mx-auto border-dashed border-2">
            <CardContent className="pt-10 pb-10">
              <CheckCircle2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
              <h2 className="text-2xl font-serif font-bold mb-2">Ops! Alguma coisa mudou.</h2>
              <p className="text-muted-foreground mb-8">
                Não conseguimos encontrar os detalhes desse agendamento específico agora. 
                Mas não se preocupe, seu horário deve estar garantido!
              </p>
              <Button asChild className="w-full">
                <Link href={`/${tenant.slug}/meu-perfil/historico`}>Ver Meus Agendamentos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const getLink = (path: string) => `/${tenant.slug}${path}`;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6 ring-8 ring-green-500/5">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Agendamento Confirmado!</h1>
          <p className="text-muted-foreground text-lg">
            Tudo certo, {appointment.customer_name || appointment.customerName}. Seu horário foi reservado com sucesso.
          </p>
        </div>

        <Card className="border-border/40 shadow-xl overflow-hidden mb-8">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-serif">Detalhes do Agendamento</CardTitle>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1">
                Confirmado
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-accent/50 text-primary">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-1">Data e Hora</p>
                    <p className="text-lg font-bold">
                      {(appointment.appointment_date || appointment.appointmentDate) ? format(new Date((appointment.appointment_date || appointment.appointmentDate) + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR }) : 'Data N/D'}
                    </p>
                    <p className="text-primary font-black text-xl">{appointment.appointment_time || appointment.appointmentTime}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-accent/50 text-primary">
                    <Scissors className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-1">Serviço</p>
                    <p className="text-lg font-bold">{appointment.service_name || appointment.serviceName}</p>
                    <p className="text-primary font-bold">{formatCurrencyFromCents(appointment.service_price || appointment.servicePrice)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-accent/50 text-primary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-1">Endereço</p>
                    <p className="text-lg font-bold font-serif">{settings?.shopName || 'Barbearia Premium'}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {settings?.address || 'Av. Bernardino de Campos, 123\nSantos, SP - 11065-001'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-accent/50 text-primary">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider mb-1">Pagamento</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold">{appointment.is_paid || appointment.isPaid ? 'Pago via PIX/Cartão' : 'Pagamento no Local'}</p>
                      { (appointment.is_paid || appointment.isPaid) && <CheckCircle2 className="w-4 h-4 text-green-500" /> }
                    </div>
                    <p className="text-xs text-muted-foreground">Valor total: {formatCurrencyFromCents(appointment.service_price || appointment.servicePrice)}</p>
                  </div>
                </div>
              </div>
            </div>

            { (appointment.is_paid || appointment.isPaid || (settings?.isPointsEnabled)) && (
               <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <Award className="w-8 h-8 text-primary" />
                   <div>
                     <p className="text-sm font-bold uppercase tracking-tight text-primary">Pontos de Fidelidade</p>
                     <p className="text-xs text-muted-foreground">Você ganhou pontos com este agendamento!</p>
                   </div>
                 </div>
                 <div className="text-right">
                    <p className="text-2xl font-black text-primary">+{settings?.points_per_appointment || 10}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Acumulados</p>
                 </div>
               </div>
            )}

            <Separator className="bg-border/40" />
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button asChild className="flex-1 h-12 text-md shadow-lg shadow-primary/20">
                <Link href={getLink("/meu-perfil/historico")}>
                   <Clock className="w-5 h-5 mr-3" />
                   Ver Meus Horários
                </Link>
              </Button>
              <Button variant="outline" onClick={handleAddToCalendar} className="flex-1 h-12 text-md border-primary/20 hover:bg-primary/5 text-primary">
                <CalendarPlus className="w-5 h-5 mr-3" />
                Adicionar ao Calendário
              </Button>
            </div>
          </CardContent>
        </Card>

        {authStatus === "unauthenticated" && (
          <div className="bg-accent/30 rounded-2xl p-8 border border-border/50 text-center">
            <h3 className="text-xl font-serif font-bold mb-3">Deseja acompanhar seus agendamentos?</h3>
            <p className="text-muted-foreground mb-6">Crie uma conta para gerenciar seus horários, acumular pontos fidelidade e muito mais.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline" className="px-8 border-primary/30 text-primary">
                <Link href={getLink("/login")}>Entrar</Link>
              </Button>
              <Button asChild className="px-8 shadow-md">
                <Link href={getLink("/cadastro")}>Criar Conta Agora</Link>
              </Button>
            </div>
          </div>
        )}
        
        <div className="mt-8 text-center pt-8">
            <Link href={getLink("/")} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2">
               Voltar para o Início
            </Link>
        </div>
      </div>
    </Layout>
  );
}
