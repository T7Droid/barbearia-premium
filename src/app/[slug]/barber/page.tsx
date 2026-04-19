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
  Loader2,
  Wallet,
  FileText,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { formatCurrencyFromCents } from "@/lib/format";

export default function BarberDashboard() {
  const { toast } = useToast();
  const tenant = useTenant();
  const { user } = useUserStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(true);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'barber' && user.role !== 'admin') {
      router.push(`/${tenant.slug}`);
    }
  }, [user, isLoading, tenant.slug, router]);

  const fetchBarberData = async () => {
    try {
      const headers = { "x-tenant-slug": tenant.slug };
      const res = await fetch(`/api/barber/stats?month=${selectedMonth}&year=${selectedYear}`, { headers });

      if (!res.ok) {
        console.error("BarberDashboard: Erro ao buscar estatísticas", res.status);
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      setHasProfile(data.hasProfile ?? true);
      if (data.stats) setStats(data.stats);
      if (data.todayAppointments) setTodayAppointments(data.todayAppointments);
    } catch (error) {
      console.error("BarberDashboard: Erro na requisição", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateProfile = async () => {
    setIsActivating(true);
    try {
      const res = await fetch("/api/barber/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug
        },
        body: JSON.stringify({
          description: `Administrador e Profissional da ${tenant.name}`
        })
      });

      if (res.ok) {
        toast({
          title: "Perfil Ativado!",
          description: "Você agora já pode receber agendamentos como barbeiro.",
        });
        await fetchBarberData();
      } else {
        const error = await res.json();
        toast({
          title: "Erro na ativação",
          description: error.error || "Não foi possível ativar seu perfil.",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Erro de conexão",
        description: "Falha ao comunicar com o servidor.",
        variant: "destructive"
      });
    } finally {
      setIsActivating(false);
    }
  };

  useEffect(() => {
    if (tenant.slug) fetchBarberData();
  }, [tenant.slug, selectedMonth, selectedYear]);

  const sortedAppointments = todayAppointments ? [...todayAppointments].sort((a: any, b: any) => {
    const valA = `${a.appointment_date}T${a.appointment_time}`;
    const valB = `${b.appointment_date}T${b.appointment_time}`;
    return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
  }) : [];

  const handleExportPDF = () => {
    if (!sortedAppointments || sortedAppointments.length === 0) return;

    const doc = new jsPDF();
    const tableData = sortedAppointments.map((app: any) => [
      `${app.appointment_date ? app.appointment_date.split('-').reverse().join('/') : 'N/D'} ${app.appointment_time || ''}`,
      app.customer_name || 'N/D',
      getServiceNames(app),
      getFormattedPriceDetails(app),
      app.is_paid ? 'Pago' : 'No Local',
      app.status === 'confirmed' ? 'Confirmado' : app.status === 'pending' ? 'Pendente' : 'Cancelado'
    ]);

    autoTable(doc, {
      head: [['Data/Hora', 'Cliente', 'Serviço', 'Valor', 'Pagamento', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [142, 68, 173] },
      styles: { fontSize: 8 },
    });

    const fileName = `meus_agendamentos_${selectedMonth}_${selectedYear}.pdf`;
    doc.save(fileName);
    toast({ title: "Sucesso", description: "Relatório PDF gerado com sucesso." });
  };

  const handleExportExcel = () => {
    if (!sortedAppointments || sortedAppointments.length === 0) return;

    const tableData = sortedAppointments.map((app: any) => ({
      'Data/Hora': `${app.appointment_date ? app.appointment_date.split('-').reverse().join('/') : 'N/D'} ${app.appointment_time || ''}`,
      'Cliente': app.customer_name || 'N/D',
      'Telefone': app.customer_phone || 'N/D',
      'Serviço': getServiceNames(app),
      'Valor': getFormattedPriceDetails(app),
      'Pagamento': app.is_paid ? 'Pago' : 'No Local',
      'Status': app.status === 'confirmed' ? 'Confirmado' : app.status === 'pending' ? 'Pendente' : 'Cancelado'
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agendamentos");

    const fileName = `meus_agendamentos_${selectedMonth}_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({ title: "Sucesso", description: "Relatório Excel gerado com sucesso." });
  };

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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {!hasProfile && user?.role === 'admin' ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <Card className="max-w-2xl w-full border-primary/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
              <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Scissors className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-3xl font-serif">Bem-vindo, {user.name}!</CardTitle>
                <CardDescription className="text-lg">
                  Você é o administrador da **{tenant.name}**, mas ainda não possui um perfil profissional vinculado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl bg-accent/50 border border-border/50">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ao ativar seu modo profissional, você aparecerá na lista de agendamentos para seus clientes e
                    poderá gerenciar sua própria agenda aqui neste painel.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Agenda Própria</p>
                      <p className="text-xs text-muted-foreground">Controle seus horários e serviços individuais.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40">
                    <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Estatísticas de Venda</p>
                      <p className="text-xs text-muted-foreground">Acompanhe seu desempenho profissional.</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleActivateProfile}
                  disabled={isActivating}
                  className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 group"
                >
                  {isActivating ? (
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  ) : (
                    <Scissors className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  )}
                  Ativar Meu Perfil Profissional
                </Button>

                <p className="text-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  Ativação Instantânea • Sem custos adicionais
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-serif font-bold tracking-tight">Painel do Barbeiro</h1>
              <p className="text-muted-foreground mt-2">Olá, {user?.name}. Veja como estão as coisas hoje em {tenant.name}.</p>
            </div>
            <Button asChild className="gap-2 mb-8">
              <Link href={`/${tenant.slug}/barber/horarios`}>
                <Clock className="w-4 h-4" /> Gerenciar Meus Horários
              </Link>
            </Button>

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

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 mb-6">
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
                          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((m) => (
                            <SelectItem key={m} value={m}>
                              {format(new Date(2000, parseInt(m) - 1, 1), "MMMM", { locale: ptBR })}
                            </SelectItem>
                          ))}
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
                          {["2024", "2025", "2026"].map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="font-serif text-xl font-bold">Meus Agendamentos</CardTitle>
                      <CardDescription>Lista completa de todos os seus atendimentos.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(!todayAppointments || todayAppointments.length === 0) ? (
                      <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
                        <p>Nenhum agendamento encontrado.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/50 hover:bg-transparent">
                              <TableHead className="text-foreground">Data / Hora</TableHead>
                              <TableHead className="text-foreground">Cliente</TableHead>
                              <TableHead className="text-foreground">Serviço</TableHead>
                              <TableHead className="text-foreground">Valor</TableHead>
                              <TableHead className="text-foreground">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedAppointments.map((app) => (
                              <TableRow key={app.id} className="border-border/50 hover:bg-muted/50">
                                <TableCell className="font-medium text-foreground">
                                  {app.appointment_date ? app.appointment_date.split('-').reverse().join('/') : 'N/D'} às {app.appointment_time || 'N/D'}
                                </TableCell>
                                <TableCell className="text-foreground font-bold">
                                  {app.customer_name}
                                </TableCell>
                                <TableCell className="text-foreground">
                                  {getServiceNames(app)}
                                </TableCell>
                                <TableCell className="text-foreground">
                                  {getFormattedPriceDetails(app)}
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                    ${app.status === 'confirmed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                      app.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                        'bg-muted text-muted-foreground border border-border'}`}>
                                    {app.status === 'confirmed' ? 'Confirmado' : app.status === 'pending' ? 'Pendente' : app.status}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {sortedAppointments && sortedAppointments.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    <Button 
                      onClick={handleExportPDF} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-2 text-red-500 transition-colors hover:bg-red-500/10"
                      disabled={isLoading}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Exportar PDF</span>
                    </Button>
                    <Button 
                      onClick={handleExportExcel} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-2 text-green-500 transition-colors hover:bg-green-500/10"
                      disabled={isLoading}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Exportar Excel</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
