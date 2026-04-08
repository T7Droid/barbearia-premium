"use client";

import { use } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useGetAppointment } from "@workspace/api-client-react";
import { CheckCircle2, Calendar, Clock, MapPin, Download, UserPlus, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { DemoStore } from "@/lib/persistence/demo-store";

export default function Confirmation({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id ? parseInt(resolvedParams.id) : 0;

  const { data: apiAppointment, isLoading } = useGetAppointment(id, {
    query: {
      enabled: !!id,
      queryKey: ["appointments", id],
      retry: false
    }
  });

  const [fallbackAppointment, setFallbackAppointment] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    // Se a API falhar em encontrar, tenta o DemoStore (LocalStorage)
    if (id && !apiAppointment && !isLoading) {
      const savedApps = DemoStore.getAppointments();
      const match = savedApps.find((a: any) => a.id === id);
      if (match) {
        setFallbackAppointment(match);
      }
    }
  }, [id, apiAppointment, isLoading]);

  const appointment = apiAppointment || fallbackAppointment;

  function downloadICS(appointment: any) {
    const icsContent = generateICS(appointment);

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `agendamento-${appointment.id}.ics`;
    link.click();

    window.URL.revokeObjectURL(url);
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        setAuthStatus(data.authenticated ? "authenticated" : "unauthenticated");
      })
      .catch(() => setAuthStatus("unauthenticated"));
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-3xl flex flex-col items-center">

        {isLoading ? (
          <div className="w-full max-w-md space-y-6">
            <Skeleton className="w-24 h-24 rounded-full mx-auto" />
            <Skeleton className="h-10 w-3/4 mx-auto" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !appointment ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-serif text-destructive">Agendamento não encontrado</h1>
            <p className="text-muted-foreground">Não foi possível localizar as informações deste agendamento.</p>
            <Button asChild><Link href="/">Voltar para o Início</Link></Button>
          </div>
        ) : (
          <div className="w-full animate-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-foreground">
                {(appointment as any).isReschedule ? "Reagendamento Confirmado!" : "Agendamento Confirmado!"}
              </h1>
              <p className="text-muted-foreground text-lg">
                Obrigado, {appointment.customerName}. {(appointment as any).isReschedule ? "Sua nova data foi reservada com sucesso." : "Seu horário foi reservado com sucesso."}
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary" />

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Serviço</p>
                    <p className="text-xl font-medium text-foreground">{appointment.serviceName}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data e Horário</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-lg text-foreground">
                        <Calendar className="w-5 h-5 text-primary" />
                        {appointment.appointmentDate.split('-').reverse().join('/')}
                      </div>
                      <div className="flex items-center gap-2 text-lg text-foreground">
                        <Clock className="w-5 h-5 text-primary" />
                        {appointment.appointmentTime}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1 text-foreground">Código da Reserva</p>
                    <p className="font-mono text-muted-foreground">#{appointment.id.toString().padStart(6, '0')}</p>
                  </div>

                  <div className="border-t border-border/50 pt-4 mt-2">
                    <p className="text-sm text-muted-foreground mb-1">Status do Pagamento</p>
                    <div className="flex items-center gap-2 text-green-600 font-bold uppercase text-xs">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      {(appointment as any).isReschedule || appointment.status === "confirmed" ? "Pago e Confirmado" : "Confirmado"}
                    </div>
                  </div>
                </div>

                <div className="bg-background rounded-lg p-6 border border-border flex flex-col justify-center">
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-foreground">Barbearia Premium</p>
                      <p className="text-sm text-muted-foreground">Rua Frei Gaspar 7777<br />Centro - São Vicente</p>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-4 mt-2">
                    <p className="text-sm text-muted-foreground text-center italic">
                      {(appointment as any).isReschedule 
                        ? "Como esta é uma remarcação de um serviço já pago, seu crédito foi transferido automaticamente."
                        : "Por favor, chegue com 5 minutos de antecedência."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {}
            {!isLoading && authStatus === "unauthenticated" && (
              <Card className="mt-10 bg-primary/5 border-primary/20 shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <UserPlus className="w-24 h-24 text-primary" />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" /> Salvar meus dados?
                  </CardTitle>
                  <CardDescription>Crie sua conta agora e ganhe 50 pontos de fidelidade!</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
                  <Button asChild className="w-full sm:w-auto gap-2" variant="default">
                    <Link href={`/cadastro?email=${encodeURIComponent(appointment.customerEmail)}&name=${encodeURIComponent(appointment.customerName)}&phone=${encodeURIComponent(appointment.customerPhone)}`}>
                      Criar minha conta <ArrowRight className="w-4 h-4" />
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
              <Button asChild>
                <Link href="/">Voltar para o Início</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function generateICS(appointment: any) {
  const startDate = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${appointment.serviceName}
DESCRIPTION:Agendamento - ${appointment.customerName}
LOCATION:Rua Frei Gaspar 7777 - Centro - São Vicente
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
END:VEVENT
END:VCALENDAR`;
}
