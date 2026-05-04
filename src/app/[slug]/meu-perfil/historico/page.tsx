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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, History as HistoryIcon, RefreshCw, Scissors, AlertCircle, Loader2, XCircle, DollarSign, CheckCircle2, Wallet, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format, isBefore, addDays, parseISO } from "date-fns";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useTenant } from "@/hooks/use-tenant";
import { useRouter } from "next/navigation";
import { formatCurrencyFromCents } from "@/lib/format/currency";

export default function AppointmentHistory() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const tenant = useTenant();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const getLink = (path: string) => `/${tenant.slug}${path}`;

  const getServiceNames = (app: any) => {
    const services = app.services_json || app.servicesJson;
    if (services && Array.isArray(services) && services.length > 0) {
      const firstService = services[0].name;
      const othersCount = services.length - 1;
      return othersCount > 0 ? `${firstService} +${othersCount}` : firstService;
    }
    return app.service_name || app.serviceName || 'N/D';
  };

  const getFormattedPriceDetails = (app: any) => {
    const total = app.total_price || app.totalPrice || app.service_price || app.servicePrice || 0;
    const services = app.services_json || app.servicesJson;
    const totalFormatted = formatCurrencyFromCents(total);

    if (services && Array.isArray(services) && services.length > 1) {
      const details = services
        .map((s: any) => `${s.name} ${formatCurrencyFromCents(s.price)}`)
        .join('/');
      return `${totalFormatted} (${details})`;
    }
    return totalFormatted;
  };

  useEffect(() => {
    if (!tenant.slug) return;

    const headers = { "x-tenant-slug": tenant.slug };

    const loadData = async () => {
      try {
        const [appsRes, settingsRes, authRes] = await Promise.all([
          fetch("/api/appointments", { headers }),
          fetch("/api/settings", { headers }),
          fetch("/api/auth/me", { headers })
        ]);

        const authData = await authRes.json();
        const settingsData = await settingsRes.json();

        // 1. Lidar com Autenticação
        if (authData.authenticated) {
          DemoStore.saveUser(authData.user);
        } else {
          const savedUser = DemoStore.getUser();
          if (!savedUser) {
            router.push(getLink("/login"));
            return;
          }
        }

        // 2. Lidar com Agendamentos
        let apiAppsRaw = [];
        if (appsRes.ok) {
          apiAppsRaw = await appsRes.json();
        } else if (appsRes.status === 401) {
          console.log("Histórico: API retornou 401, usando apenas dados locais...");
        }

        const apiApps = (Array.isArray(apiAppsRaw) ? apiAppsRaw : []).map((app: any) => ({
          ...app,
          serviceName: app.service_name || app.serviceName,
          serviceId: app.service_id || app.serviceId,
          servicePrice: app.service_price || app.servicePrice || 0,
          servicesJson: app.services_json || app.servicesJson,
          isPaid: app.is_paid || app.isPaid || false,
          appointmentDate: app.appointment_date || app.appointmentDate,
          appointmentTime: app.appointment_time || app.appointmentTime,
          barberName: app.barber_name || app.barberName,
        }));

        // 3. Mesclar com dados locais (DemoStore) se necessário
        const savedApps = DemoStore.getAppointments();
        const allApps = [...apiApps];

        // Se autenticado, vamos limpar do LocalStorage o que já está no banco
        const isAuthenticated = authData.authenticated;

        savedApps.forEach(saved => {
          // Filtrar por tenant para evitar mostrar agendamentos de outras barbearias
          if (saved.tenantId && saved.tenantId !== settingsData.tenantId) {
            return;
          }

          const isAlreadyInApi = apiApps.some(api => String(api.id) === String(saved.id));

          if (isAlreadyInApi) {
            // Se já está no banco e estamos logados, removemos da cópia local para evitar lixo
            if (isAuthenticated) {
              DemoStore.removeAppointment(saved.id);
            }
          } else {
            // Se não está no banco (ou banco falhou/estamos offline), mostramos o local
            allApps.push(saved);
          }
        });

        allApps.sort((a: any, b: any) => {
          try {
            const dateA = new Date(`${a.appointmentDate || a.appointment_date}T${a.appointmentTime || a.appointment_time}`);
            const dateB = new Date(`${b.appointmentDate || b.appointment_date}T${b.appointmentTime || b.appointment_time}`);
            return dateB.getTime() - dateA.getTime();
          } catch (e) { return 0; }
        });

        setAppointments(allApps);
        setSettings(settingsData);
        setLoading(false);
      } catch (error) {
        console.error("Histórico Load Error:", error);
        // Fallback total para DemoStore em caso de erro de rede ou crítico
        const savedApps = DemoStore.getAppointments();
        setAppointments(savedApps);
        setLoading(false);
      }
    };

    loadData();
  }, [tenant.slug]);

  const sortedAppointments = [...appointments].sort((a: any, b: any) => {
    const valA = `${a.appointmentDate || a.appointment_date}T${a.appointmentTime || a.appointment_time}`;
    const valB = `${b.appointmentDate || b.appointment_date}T${b.appointmentTime || b.appointment_time}`;
    return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const canReschedule = (dateStr: string, status?: string) => {
    if (!settings || status === "cancelled") return false;
    const appDate = parseISO(dateStr);
    const minDate = addDays(new Date(), settings.cancellationWindowDays || 1);
    return isBefore(new Date(), appDate) && isBefore(minDate, appDate);
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.")) {
      return;
    }

    setCancellingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug
        }
      });

      if (res.ok) {
        toast({ title: "Sucesso", description: "Agendamento cancelado com sucesso." });
        window.location.reload();
      } else {
        const error = await res.json();
        toast({
          title: "Erro",
          description: error.error || "Falha ao cancelar agendamento.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão ao tentar cancelar.",
        variant: "destructive"
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleShare = async (app: any) => {
    const services = getServiceNames(app);
    const date = (app.appointmentDate || app.appointment_date)?.split("-").reverse().join("/");
    const time = app.appointmentTime || app.appointment_time;
    const barber = app.barberName || app.barber_name || "N/D";
    const unit = app.unitName || app.unit_name || "N/D";
    const price = getFormattedPriceDetails(app);
    const paymentStatus = (app.isPaid || app.is_paid) ? "Pago" : "Pagar no Local";

    const address = app.unit
      ? `${app.unit.address}${app.unit.number ? `, ${app.unit.number}` : ""} - ${app.unit.city || ""}`
      : (settings?.address || "");

    const messageText =
      `*Agendamento Confirmado!* \n\n` +
      `*Barbearia:* ${settings?.shopName || tenant.name}\n` +
      `*Serviço:* ${services}\n` +
      `*Valor:* ${price}\n` +
      `*Pagamento:* ${paymentStatus}\n` +
      `*Data:* ${date}\n` +
      `*Horário:* ${time}\n` +
      `*Profissional:* ${barber}\n` +
      `*Unidade:* ${unit}\n` +
      (address ? `*Endereço:* ${address}\n` : "") +
      `\n*Código:* #${app.id.toString().padStart(6, '0')}\n\n` +
      `_Por favor, chegue com 5 minutos de antecedência._`;

    const encodedMessage = encodeURIComponent(messageText);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground flex items-center gap-3">
              <HistoryIcon className="w-8 h-8 text-primary" /> Meus Agendamentos
            </h1>
            <p className="text-muted-foreground mt-1">Visualize e gerencie seu histórico na {tenant.name}.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Ordem:</span>
              <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                <SelectTrigger className="w-[130px] h-9 bg-card border-border/50">
                  <SelectValue placeholder="Ordem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Crescente</SelectItem>
                  <SelectItem value="desc">Decrescente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button asChild>
              <Link href={getLink("/booking")}>Novo Agendamento</Link>
            </Button>
          </div>
        </div>

        <Card className="bg-card border-border/50 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-foreground h-12">Serviço</TableHead>
                  <TableHead className="text-foreground">Barbeiro</TableHead>
                  <TableHead className="text-foreground">Unidade</TableHead>
                  <TableHead className="text-foreground">Data / Hora</TableHead>
                  <TableHead className="text-foreground">Preço</TableHead>
                  <TableHead className="text-foreground">Pagamento</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-right text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 opacity-20" />
                        <p>Nenhum agendamento encontrado.</p>
                        <Button variant="link" asChild><Link href={getLink("/booking")}>Agendar agora</Link></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAppointments.map((app, idx) => (
                    <TableRow key={app.id || `app-${idx}`} className="border-border/50 hover:bg-muted/30 group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Scissors className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground leading-tight">
                              {getServiceNames(app)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {app.barberName || app.barber_name || "N/D"}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {app.unitName || app.unit_name || "N/D"}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {(app.appointmentDate || app.appointment_date)?.split("-").reverse().join("/") || "Data N/D"}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {app.appointmentTime || app.appointment_time || "Horário N/D"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-semibold">
                        {getFormattedPriceDetails(app)}
                      </TableCell>
                      <TableCell>
                        {app.isPaid ? (
                          <div className="flex items-center gap-1.5 text-green-500 font-medium text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Pago</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-500 font-medium text-xs">
                            <Wallet className="w-3.5 h-3.5" />
                            <span>No Local</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canReschedule(app.appointmentDate, app.status) ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-primary/20 text-primary hover:bg-primary/5 gap-2 h-8"
                                asChild
                                disabled={cancellingId === app.id}
                              >
                                <Link href={cancellingId === app.id ? "#" : getLink(`/booking?reschedule=${app.id}&serviceId=${app.serviceId}`)}>
                                  <RefreshCw className={`w-3 h-3 ${cancellingId === app.id ? "animate-spin" : ""}`} /> Remarcar
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 h-8"
                                onClick={() => handleCancel(app.id)}
                                disabled={cancellingId === app.id}
                              >
                                {cancellingId === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Cancelar
                              </Button>
                            </>
                          ) : app.status !== "cancelled" ? (
                            <span className="text-[10px] text-muted-foreground italic">Prazo encerrado</span>
                          ) : null}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:bg-green-50 h-8 w-8 p-0"
                            onClick={() => handleShare(app)}
                            title="Enviar agendamento por WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
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
    </div>
  );
}
