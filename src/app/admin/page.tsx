"use client";

import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useListAppointments, useGetStatsSummary } from "@workspace/api-client-react";
import { Calendar, DollarSign, Scissors, Users, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { formatCurrencyFromCents } from "@/lib/format";

export default function Admin() {
  const { data: stats, isLoading: isLoadingStats } = useGetStatsSummary();
  const { data: appointments, isLoading: isLoadingAppointments } = useListAppointments();

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'confirmed': return <Badge className="bg-primary/20 text-primary border-primary/30">Confirmado</Badge>;
      case 'pending': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Pendente</Badge>;
      case 'cancelled': return <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">Cancelado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-serif font-bold text-foreground">Painel Administrativo</h1>
          <div className="flex gap-2 sm:gap-4 justify-end">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/admin/servicos">
                <Scissors className="w-4 h-4" /> Serviços
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/admin/configuracoes">
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
        <h2 className="text-2xl font-serif font-bold mb-6 text-foreground">Últimos Agendamentos</h2>
        <Card className="bg-card border-border/50">
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
                {isLoadingAppointments ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-border/50">
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : appointments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum agendamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments?.map((app) => (
                    <TableRow key={app.id} className="border-border/50 hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">
                        {app.appointmentDate ? app.appointmentDate.split('-').reverse().join('/') : 'Data N/D'} às {app.appointmentTime || 'N/D'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div>{app.customerName || 'Cliente N/D'}</div>
                        <div className="text-xs text-muted-foreground">{app.customerPhone}</div>
                      </TableCell>
                      <TableCell className="text-foreground">{app.serviceName || 'Serviço N/D'}</TableCell>
                      <TableCell className="text-foreground">{formatCurrencyFromCents(app.servicePrice)}</TableCell>
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
