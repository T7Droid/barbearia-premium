"use client";
import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Users,
  LayoutGrid,
  Phone,
  Mail,
  Award,
  Loader2,
  Calendar,
  Search,
  RefreshCw,
  XCircle,
  CreditCard
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useTenant } from "@/hooks/use-tenant";

interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  points: number;
  created_at: string;
  reschedule_count: number;
  cancel_count: number;
  can_pay_at_shop: boolean;
}

export default function AdminCustomers() {
  const { toast } = useToast();
  const tenant = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCustomers = async () => {
    if (!tenant?.slug) return;
    try {
      const headers = { "x-tenant-slug": tenant.slug };
      const res = await fetch("/api/admin/customers", { headers });
      if (!res.ok) throw new Error("Falha ao carregar clientes");
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar clientes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug
        },
        body: JSON.stringify({ userId, canPayAtShop: !currentStatus })
      });

      if (res.ok) {
        setCustomers(prev => prev.map(c => 
          c.id === userId ? { ...c, can_pay_at_shop: !currentStatus } : c
        ));
        toast({ title: "Sucesso", description: "Permissão de pagamento atualizada." });
      } else {
        throw new Error();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao atualizar permissão.", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [tenant]);

  const getLink = (path: string) => `/${tenant?.slug}${path}`;

  const filteredCustomers = customers.filter(c => 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const formatPhone = (value: string) => {
    if (!value) return "N/D";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    return value;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href={getLink("/admin")} className="hover:text-primary flex items-center gap-1 transition-colors">
            <LayoutGrid className="w-4 h-4" /> Painel
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Clientes</span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" /> Gerenciar Clientes
            </h1>
            <p className="text-muted-foreground mt-1">Visualize seus clientes cadastrados e gerencie seus pontos de fidelidade.</p>
          </div>
        </div>
      </div>

      <Card className="bg-card border-border/50 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, e-mail ou telefone..." 
              className="pl-9 bg-background/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border/50">
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Atividade</TableHead>
              <TableHead>Pagar no Local</TableHead>
              <TableHead>Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><div className="h-5 w-48 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-40 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  {searchTerm ? "Nenhum cliente corresponde à sua busca." : "Nenhum cliente cadastrado ainda."}
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{customer.full_name || "Cliente sem nome"}</span>
                      <span className="text-xs text-muted-foreground font-mono">ID: {customer.id.substring(0, 8)}...</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        {formatPhone(customer.phone)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-primary" />
                      <span className="font-bold text-primary">{customer.points || 0} pts</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1 text-amber-600">
                        <RefreshCw className="w-3 h-3" />
                        <span>{customer.reschedule_count || 0} remarcações</span>
                      </div>
                      <div className="flex items-center gap-1 text-destructive">
                        <XCircle className="w-3 h-3" />
                        <span>{customer.cancel_count || 0} cancelamentos</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={customer.can_pay_at_shop !== false} 
                        onCheckedChange={() => handleTogglePermission(customer.id, customer.can_pay_at_shop !== false)}
                      />
                      <CreditCard className={`w-4 h-4 ${customer.can_pay_at_shop !== false ? 'text-green-500' : 'text-muted-foreground opacity-50'}`} />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(customer.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
