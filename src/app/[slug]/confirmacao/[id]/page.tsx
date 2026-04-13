"use client";

import { useEffect, useState, use } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Calendar, Clock, MapPin, Share2, Wallet, Scissors, ExternalLink, Download, Award, CalendarPlus, UserPlus, ArrowRight } from "lucide-react";
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
          const savedUser = DemoStore.getUser();
          setAuthStatus(savedUser ? "authenticated" : "unauthenticated");
        }
      })
      .catch(() => {
        const savedUser = DemoStore.getUser();
        setAuthStatus(savedUser ? "authenticated" : "unauthenticated");
      });
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

  const downloadICS = (appt: any) => {
    const icsString = generateICS(appt, settings);
    if (!icsString) return;
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'agendamento.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getLink = (path: string) => `/${tenant.slug}${path}`;

  const dateValue = appointment.appointmentDate || appointment.appointment_date || "";
  const timeValue = appointment.appointmentTime || appointment.appointment_time || "";
  const displayDate = dateValue ? dateValue.split('-').reverse().join('/') : "N/D";
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-3xl flex flex-col items-center">
        {isLoading ? (
          <div className="w-full max-w-md space-y-6">
            <div className="w-24 h-24 rounded-full mx-auto bg-muted animate-pulse" />
            <div className="h-10 w-3/4 mx-auto bg-muted animate-pulse" />
            <div className="h-64 w-full rounded-xl bg-muted animate-pulse" />
          </div>
        ) : !appointment ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-serif text-destructive">Agendamento não encontrado</h1>
            <p className="text-muted-foreground">Não foi possível localizar as informações deste agendamento.</p>
            <Button asChild><Link href={getLink("/")}>Voltar para o Início</Link></Button>
          </div>
        ) : (
          <div className="w-full animate-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-foreground">
                {(appointment as any).isReschedule || appointment.is_reschedule ? "Reagendamento Confirmado!" : "Agendamento Confirmado!"}
              </h1>
              <p className="text-muted-foreground text-lg">
                Obrigado, {appointment.customerName || appointment.customer_name}. {(appointment as any).isReschedule || appointment.is_reschedule ? "Sua nova data foi reservada com sucesso." : "Seu horário foi reservado com sucesso."}
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary" />

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Serviço</p>
                    <p className="text-xl font-medium text-foreground">{appointment.serviceName || appointment.service_name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data e Horário</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-lg text-foreground">
                        <Calendar className="w-5 h-5 text-primary" />
                        {displayDate}
                      </div>
                      <div className="flex items-center gap-2 text-lg text-foreground">
                        <Clock className="w-5 h-5 text-primary" />
                        {timeValue}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1 text-foreground">Código da Reserva</p>
                    <p className="font-mono text-muted-foreground">#{appointment.id.toString().padStart(6, '0')}</p>
                  </div>

                  <div className="border-t border-border/50 pt-4 mt-2">
                    <p className="text-sm text-muted-foreground mb-1">Status do Pagamento</p>
                    {((appointment as any).isReschedule || appointment.is_reschedule || appointment.isPaid || appointment.is_paid) ? (
                      <div className="flex items-center gap-2 text-green-600 font-bold uppercase text-xs">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Pago e Confirmado
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-500 font-bold uppercase text-xs">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Pagar no Local
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-background rounded-lg p-6 border border-border flex flex-col justify-center">
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-foreground">{settings?.shopName || "Barbearia Premium"}</p>
                      <p className="text-sm text-muted-foreground">{settings?.address || "Endereço não informado"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 mb-4">
                    <Award className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-foreground">Profissional</p>
                      <p className="text-sm text-muted-foreground">{appointment.barberName || appointment.barber_name || "Qualquer Especialista"}</p>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-4 mt-2">
                    <p className="text-sm text-muted-foreground text-center italic">
                      {(appointment as any).isReschedule || appointment.is_reschedule
                        ? "Como esta é uma remarcação de um serviço, seu crédito foi mantido."
                        : "Por favor, chegue com 5 minutos de antecedência."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {!isLoading && authStatus === "unauthenticated" && (
              <Card className="mt-10 bg-primary/5 border-primary/20 shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Share2 className="w-24 h-24 text-primary" />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" /> Salvar meus dados?
                  </CardTitle>
                  <CardDescription>Crie sua conta agora e comece a ganhar pontos de fidelidade!</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
                  <Button asChild className="w-full sm:w-auto gap-2" variant="default">
                    <Link href={getLink(`/cadastro?email=${encodeURIComponent(appointment.customerEmail || appointment.customer_email || "")}&name=${encodeURIComponent(appointment.customerName || appointment.customer_name || "")}&phone=${encodeURIComponent(appointment.customerPhone || appointment.customer_phone || "")}`)}>
                      Criar minha conta
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Próximos agendamentos em apenas 2 cliques.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
              <Button
                onClick={() => downloadICS(appointment)}
                variant="outline"
                className="gap-2">
                <Download className="w-4 h-4" /> Adicionar ao Calendário
              </Button>
              {authStatus === "authenticated" && (
                <Button asChild variant="outline" className="gap-2">
                  <Link href={getLink("/meu-perfil/historico")}>
                    <Clock className="w-4 h-4" /> Ver Meus Horários
                  </Link>
                </Button>
              )}
              <Button asChild>
                <Link href={getLink("/")}>Voltar para o Início</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function generateICS(appointment: any, settings: any) {
  const dateStr = appointment.appointmentDate || appointment.appointment_date;
  const timeStr = appointment.appointmentTime || appointment.appointment_time;
  
  if (!dateStr || !timeStr) return "";
  
  const startDate = new Date(`${dateStr}T${timeStr}`);
  const endDate = new Date(startDate.getTime() + (settings?.slot_interval || 45) * 60 * 1000);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const serviceName = appointment.serviceName || appointment.service_name || "Serviço Adquirido";
  const customerName = appointment.customerName || appointment.customer_name || "Cliente";
  const shopName = settings?.shopName || "Barbearia Premium";
  const address = settings?.address || "Endereço da Barbearia";

  return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${serviceName}
DESCRIPTION:Agendamento: ${customerName} na ${shopName}
LOCATION:${address}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
END:VEVENT
END:VCALENDAR`;
}
