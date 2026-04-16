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
import { useListAppointments, useGetStatsSummary } from "@workspace/api-client-react";
import { Calendar, DollarSign, Scissors, Users, Settings, CreditCard, Wallet, CheckCircle2, AlertCircle, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/user-store";
import { Button } from "@/components/ui/button";
import { formatCurrencyFromCents } from "@/lib/format";
import { useTenant } from "@/components/tenant-provider";

export default function Admin() {
  const tenant = useTenant();
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());

  const { data: stats, isLoading: isLoadingStats } = useGetStatsSummary();
  const { data: appointments, isLoading: isLoadingAppointments } = useListAppointments({
    year: selectedYear,
    month: selectedMonth
  });
  
  const { refreshProfile } = useUserStore();

  useEffect(() => {
    if (tenant?.slug) {
      refreshProfile(tenant.slug);
    }
  }, [tenant?.slug, refreshProfile]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed': return <Badge className="bg-primary/20 text-primary border-primary/30">Confirmado</Badge>;
      case 'pending': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Pendente</Badge>;
      case 'cancelled': return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">Cancelado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  }

  const getLink = (path: string) => `/${tenant.slug}${path}`;

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
                <div className="text-3xl font-bold text-primary">{formatCurrencyFromCents(stats?.totalRevenue)}</div>
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

        {}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-serif font-bold text-foreground">Últimos Agendamentos</h2>
          
          <div className="flex items-center gap-3">
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-foreground">Data / Hora</TableHead>
                  <TableHead className="text-foreground">Cliente</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : appointments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum agendamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments?.map((app: any) => (
                    <TableRow key={app.id} className="border-border/50 hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">
                        {app.appointment_date ? app.appointment_date.split('-').reverse().join('/') : 'Data N/D'} às {app.appointment_time || 'N/D'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div>{app.customer_name || 'Cliente N/D'}</div>
                        <div className="text-xs text-muted-foreground">{app.customer_phone}</div>
                      </TableCell>
                      <TableCell className="text-foreground">{app.service_name || 'Serviço N/D'}</TableCell>
                      <TableCell className="text-foreground">{formatCurrencyFromCents(app.service_price)}</TableCell>
                      <TableCell>
                         {app.is_paid ? (
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
                      <TableCell>{getStatusBadge(app.status || 'pending')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
  );
}
