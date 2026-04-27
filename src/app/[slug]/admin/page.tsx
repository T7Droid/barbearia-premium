"use client";

import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useListAppointments, useGetStatsSummary } from "@workspace/api-client-react";
import { Calendar, DollarSign, Scissors, Users, Settings, CreditCard, Wallet, CheckCircle2, AlertCircle, MapPin, Banknote, Smartphone, ChevronDown, Search, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useUserStore } from "@/lib/store/user-store";
import { Button } from "@/components/ui/button";
import { formatCurrencyFromCents } from "@/lib/format";
import { useTenant } from "@/components/tenant-provider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FileText, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";
import { useMemo } from "react";

export default function Admin() {
  const { toast } = useToast();
  const tenant = useTenant();
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  // Estado para controle de pagamento
  const [payingId, setPayingId] = useState<number | null>(null);
  const [paymentMethodMap, setPaymentMethodMap] = useState<Record<number, string>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stats, isLoading: isLoadingStats } = useGetStatsSummary();
  const { data: appointments, isLoading: isLoadingAppointments, refetch: refetchAppointments } = useListAppointments({
    year: selectedYear,
    month: selectedMonth
  });

  const [settings, setSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!tenant?.slug) return;
    try {
      const res = await fetch("/api/settings", { 
        headers: { "x-tenant-slug": tenant.slug } 
      });
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error("Erro ao buscar plano:", e);
    } finally {
      setLoadingSettings(false);
    }
  }, [tenant?.slug]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  
  const { refreshProfile } = useUserStore();

  useEffect(() => {
    if (tenant?.slug) {
      refreshProfile(tenant.slug);
    }
  }, [tenant?.slug, refreshProfile]);

  // -------------------------------------------------------
  // Helpers de método de pagamento
  // -------------------------------------------------------
  const getPaymentMethodLabel = (method: string | null | undefined) => {
    switch (method) {
      case "cash":   return "Dinheiro";
      case "pix":    return "Pix";
      case "card":   return "Cartão";
      case "online": return "Online";
      case "mercado_pago": return "Cartão Online";
      default:       return "No Local";
    }
  };

  const getPaymentMethodIcon = (method: string | null | undefined) => {
    switch (method) {
      case "pix":    return <Smartphone className="w-3.5 h-3.5" />;
      case "card":   return <CreditCard className="w-3.5 h-3.5" />;
      case "online": return <CreditCard className="w-3.5 h-3.5" />;
      default:       return <Banknote className="w-3.5 h-3.5" />;  // cash e fallback
    }
  };

  // -------------------------------------------------------
  // Marcar como pago
  // -------------------------------------------------------
  const markAsPaid = useCallback(async (appointmentId: number, methodOverride?: string) => {
    const method = methodOverride || paymentMethodMap[appointmentId] || "cash";
    setPayingId(appointmentId);
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-slug": tenant?.slug || "" },
        body: JSON.stringify({ paymentMethod: method }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro desconhecido");
      }
      toast({ title: "Pagamento registrado! ✅", description: `Agendamento #${appointmentId} marcado como pago (${getPaymentMethodLabel(method)}).` });
      refetchAppointments?.();
    } catch (err: any) {
      toast({ title: "Erro ao registrar pagamento", description: err.message, variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  }, [tenant?.slug, paymentMethodMap, refetchAppointments, toast]);

  // -------------------------------------------------------
  // Processamento de dados para os gráficos
  // -------------------------------------------------------
  const chartData = useMemo(() => {
    if (!appointments || appointments.length === 0) return { services: [], status: [], barbers: [] };

    const serviceMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    const barberMap: Record<string, number> = {};

    appointments.forEach((a: any) => {
      // 1. Faturamento por Serviço (Apenas pagos e não cancelados)
      if (a.is_paid && a.status !== 'cancelled') {
        const services = a.services_json || [];
        services.forEach((s: any) => {
          serviceMap[s.name] = (serviceMap[s.name] || 0) + (Number(a.total_price) / services.length);
        });
      }

      // 2. Status dos Agendamentos
      const statusLabel = a.status === 'confirmed' ? 'Confirmado' : a.status === 'pending' ? 'Pendente' : 'Cancelado';
      statusMap[statusLabel] = (statusMap[statusLabel] || 0) + 1;

      // 3. Agendamentos por Barbeiro
      if (a.status !== 'cancelled') {
        const barberName = a.barber_name || "Sem Nome";
        barberMap[barberName] = (barberMap[barberName] || 0) + 1;
      }
    });

    return {
      services: Object.entries(serviceMap).map(([name, value]) => ({ name, value: Math.round(value / 100) })), // Em reais
      status: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
      barbers: Object.entries(barberMap).map(([name, value]) => ({ name, value })),
    };
  }, [appointments]);

  const COLORS = ['#daa520', '#1a1a1a', '#4b5563', '#9ca3af', '#e5e7eb'];

  const isEscala = settings?.plan?.slug === 'escala';

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed': return <Badge className="bg-primary/20 text-primary border-primary/30">Confirmado</Badge>;
      case 'pending': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Pendente</Badge>;
      case 'cancelled': return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">Cancelado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

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

  const filteredAppointments = (appointments || []).filter((app: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const serviceName = getServiceNames(app).toLowerCase();
    return (
      app.customer_name?.toLowerCase().includes(term) ||
      app.customer_phone?.includes(term) ||
      app.barber_name?.toLowerCase().includes(term) ||
      serviceName.includes(term)
    );
  });

  const sortedAppointments = filteredAppointments.sort((a: any, b: any) => {
    const valA = `${a.appointment_date}T${a.appointment_time}`;
    const valB = `${b.appointment_date}T${b.appointment_time}`;
    return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const pendingRevenueFromTable = appointments?.reduce((sum: number, app: any) => {
    const isPaid = app.is_paid === true || app.isPaid === true;
    if (!isPaid && app.status !== 'cancelled') {
      const price = app.total_price || app.totalPrice || app.service_price || app.servicePrice || 0;
      return sum + price;
    }
    return sum;
  }, 0) || 0;

  const handleExportPDF = () => {
    if (!sortedAppointments || sortedAppointments.length === 0) return;

    const doc = new jsPDF();
    const tableData = sortedAppointments.map((app: any) => [
      `${app.appointment_date ? app.appointment_date.split('-').reverse().join('/') : 'N/D'} ${app.appointment_time || ''}`,
      app.customer_name || 'N/D',
      app.barber_name || 'N/D',
      getServiceNames(app),
      getFormattedPriceDetails(app),
      app.is_paid ? `Pago - ${getPaymentMethodLabel(app.payment_method)}` : 'No Local',
      app.status === 'confirmed' ? 'Confirmado' : app.status === 'pending' ? 'Pendente' : 'Cancelado'
    ]);

    autoTable(doc, {
      head: [['Data/Hora', 'Cliente', 'Barbeiro', 'Serviço', 'Valor', 'Pagamento', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [142, 68, 173] }, // Roxo premium
      styles: { fontSize: 8 },
    });

    const fileName = `agendamentos_${selectedMonth}_${selectedYear}.pdf`;
    doc.save(fileName);
    toast({ title: "Sucesso", description: "Relatório PDF gerado com sucesso." });
  };

  const handleExportExcel = () => {
    if (!sortedAppointments || sortedAppointments.length === 0) return;

    const tableData = sortedAppointments.map((app: any) => ({
      'Data/Hora': `${app.appointment_date ? app.appointment_date.split('-').reverse().join('/') : 'N/D'} ${app.appointment_time || ''}`,
      'Cliente': app.customer_name || 'N/D',
      'Telefone': app.customer_phone || 'N/D',
      'Barbeiro': app.barber_name || 'N/D',
      'Serviço': getServiceNames(app),
      'Valor': getFormattedPriceDetails(app),
      'Pagamento': app.is_paid ? `Pago - ${getPaymentMethodLabel(app.payment_method)}` : 'No Local',
      'Status': app.status === 'confirmed' ? 'Confirmado' : app.status === 'pending' ? 'Pendente' : 'Cancelado'
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agendamentos");

    const fileName = `agendamentos_${selectedMonth}_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({ title: "Sucesso", description: "Planilha Excel gerada com sucesso." });
  };

  return (
    <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-serif font-bold text-foreground">Painel Administrativo</h1>
          <div className="flex gap-2 sm:gap-4 justify-end flex-wrap">
            <Button asChild variant="outline" className="gap-2">
              <Link href={getLink("/admin/unidades")}>
                <MapPin className="w-4 h-4" /> Unidades
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href={getLink("/admin/servicos")}>
                <Scissors className="w-4 h-4" /> Serviços
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href={getLink("/admin/barbeiros")}>
                <Users className="w-4 h-4" /> Barbeiros
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href={getLink("/admin/clientes")}>
                <Users className="w-4 h-4" /> Clientes
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href={getLink("/admin/configuracoes")}>
                <Settings className="w-4 h-4" /> Configurações
              </Link>
            </Button>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Agendamentos Hoje</CardTitle>
              <Calendar className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-3xl font-bold text-foreground">{stats?.todayAppointments || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Agendamentos</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-3xl font-bold text-foreground">{stats?.totalAppointments || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? <Skeleton className="h-8 w-24" /> : (
                <div className="flex flex-col gap-1">
                  <div className="text-3xl font-bold text-primary leading-none">
                    {formatCurrencyFromCents(stats?.totalRevenue)}
                  </div>
                  <div className="text-xs font-semibold text-amber-500/80">
                    + {formatCurrencyFromCents(pendingRevenueFromTable)} a receber
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Serviço Popular</CardTitle>
              <Scissors className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-xl font-medium truncate text-foreground">{stats?.popularService || 'Nenhum'}</div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* SEÇÃO DE BI - EXCLUSIVA ESCALA */}
      {isEscala ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Faturamento por Serviço (R$)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.services}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {chartData.services.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `R$ ${value},00`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Agendamentos por Barbeiro</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.barbers} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(218, 165, 32, 0.05)' }} />
                  <Bar dataKey="value" fill="#daa520" radius={[4, 4, 0, 0]} name="Qtd. Atendimentos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="mb-8 border-dashed border-2 border-primary/20 bg-primary/[0.02] relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
          <CardContent className="flex flex-col items-center justify-center py-12 text-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-bounce">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-foreground mb-2">Dashboard de BI e Estatísticas Avançadas</h3>
            <p className="text-muted-foreground max-w-md mb-8">
              Visualize o crescimento da sua barbearia com gráficos de faturamento, performance de profissionais e tendências de mercado.
            </p>
            <Button asChild className="gap-2 shadow-xl shadow-primary/20">
              <Link href={getLink("/admin/configuracoes?upgrade=escala")}>
                <CreditCard className="w-4 h-4" /> Liberar agora no Plano Escala
              </Link>
            </Button>
          </CardContent>
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <div className="w-full h-full bg-primary rounded-full blur-[100px]" />
          </div>
        </Card>
      )}

      {/* Lista de Agendamentos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-serif font-bold text-foreground">Últimos Agendamentos</h2>
          
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

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Mês:</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[130px] h-9 bg-card border-border/50">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Janeiro</SelectItem>
                  <SelectItem value="2">Fevereiro</SelectItem>
                  <SelectItem value="3">Março</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Maio</SelectItem>
                  <SelectItem value="6">Junho</SelectItem>
                  <SelectItem value="7">Julho</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Ano:</span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px] h-9 bg-card border-border/50">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Card className="bg-card border-border/50">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar agendamento por nome, telefone ou serviço..." 
                className="pl-9 bg-background/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-foreground">Data / Hora</TableHead>
                  <TableHead className="text-foreground">Cliente</TableHead>
                  <TableHead className="text-foreground">Unidade</TableHead>
                  <TableHead className="text-foreground">Barbeiro</TableHead>
                  <TableHead className="text-foreground">Serviço</TableHead>
                  <TableHead className="text-foreground">Valor</TableHead>
                  <TableHead className="text-foreground">Pagamento</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAppointments ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-border/50">
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : sortedAppointments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {searchTerm ? "Nenhum agendamento corresponde à sua busca." : "Nenhum agendamento encontrado para este período."}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAppointments?.map((app: any) => (
                    <TableRow key={app.id} className="border-border/50 hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">
                        {app.appointment_date ? app.appointment_date.split('-').reverse().join('/') : 'Data N/D'} às {app.appointment_time || 'N/D'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div>{app.customer_name || 'Cliente N/D'}</div>
                        <div className="text-xs text-muted-foreground">{app.customer_phone}</div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {app.unit_name || 'N/D'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {app.barber_name || 'N/D'}
                      </TableCell>
                      <TableCell className="text-foreground">{getServiceNames(app)}</TableCell>
                      <TableCell className="text-foreground">{getFormattedPriceDetails(app)}</TableCell>
                      <TableCell>
                         {app.is_paid ? (
                           <div className="flex items-center gap-1.5 text-green-500 font-medium text-xs">
                             <CheckCircle2 className="w-3.5 h-3.5" />
                             {getPaymentMethodIcon(app.payment_method)}
                             <span>{getPaymentMethodLabel(app.payment_method)}</span>
                           </div>
                         ) : app.status !== 'cancelled' ? (
                           <div className="flex flex-col gap-1.5">
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   className="h-8 px-3 text-xs text-green-600 border-green-600/40 hover:bg-green-600/10 hover:text-green-500 font-bold gap-2"
                                   disabled={payingId === app.id}
                                 >
                                   {payingId === app.id ? "..." : "Marcar como Pago"}
                                   <ChevronDown className="w-3.5 h-3.5" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="w-40">
                                 <DropdownMenuItem onClick={() => markAsPaid(app.id, "cash")} className="gap-2">
                                   <Banknote className="w-4 h-4 text-green-500" /> Dinheiro
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => markAsPaid(app.id, "pix")} className="gap-2">
                                   <Smartphone className="w-4 h-4 text-blue-500" /> Pix
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => markAsPaid(app.id, "card")} className="gap-2">
                                   <CreditCard className="w-4 h-4 text-purple-500" /> Cartão
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                         ) : (
                           <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-xs">
                             <AlertCircle className="w-3.5 h-3.5" />
                             <span>Cancelado</span>
                           </div>
                         )}
                       </TableCell>
                      <TableCell>{getStatusBadge(app.status || 'pending')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {sortedAppointments && sortedAppointments.length > 0 && (
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={handleExportPDF} 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-2 text-red-500 transition-colors hover:bg-red-500/10"
              disabled={isLoadingAppointments}
            >
              <FileText className="w-4 h-4" />
              <span>Exportar PDF</span>
            </Button>
            <Button 
              onClick={handleExportExcel} 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-2 text-green-500 transition-colors hover:bg-green-500/10"
              disabled={isLoadingAppointments}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </Button>
          </div>
        )}
      </div>
  );
}
