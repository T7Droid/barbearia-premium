"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Scissors,
  Clock,
  DollarSign,
  ChevronLeft,
  X,
  Save,
  Image as ImageIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { formatCurrencyFromCents } from "@/lib/format";
import { useTenant } from "@/hooks/use-tenant";

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
}

export default function AdminServices() {
  const { toast } = useToast();
  const tenant = useTenant();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    durationMinutes: "45",
    imageUrl: ""
  });

  const fetchServices = async () => {
    if (!tenant?.slug) return;
    try {
      const headers = { "x-tenant-slug": tenant.slug };
      const res = await fetch("/api/services", { headers });
      const data = await res.json();
      setServices(data);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar serviços", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [tenant]);

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        price: (service.price / 100).toFixed(2),
        durationMinutes: service.durationMinutes.toString(),
        imageUrl: service.imageUrl || ""
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        durationMinutes: "45",
        imageUrl: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const headers = { 
      "Content-Type": "application/json",
      "x-tenant-slug": tenant.slug
    };

    const method = editingService ? "PUT" : "POST";
    const url = editingService ? `/api/services/${editingService.id}` : "/api/services";

    try {
      const payload = {
        ...formData,
        price: Math.round(parseFloat(formData.price) * 100),
        durationMinutes: parseInt(formData.durationMinutes)
      };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast({
          title: "Sucesso!",
          description: editingService ? "Serviço atualizado com sucesso." : "Novo serviço criado com sucesso."
        });
        fetchServices();
        handleCloseModal();
      } else {
        toast({ title: "Erro", description: "Falha ao salvar serviço.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro de conexão.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

    try {
      const res = await fetch(`/api/services/${id}`, { 
        method: "DELETE",
        headers: { "x-tenant-slug": tenant.slug }
      });
      if (res.ok) {
        toast({ title: "Excluído", description: "Serviço removido com sucesso." });
        fetchServices();
      } else {
        toast({ title: "Erro", description: "Falha ao excluir serviço.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro de conexão.", variant: "destructive" });
    }
  };

  const getLink = (path: string) => `/${tenant?.slug}${path}`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href={getLink("/admin")} className="hover:text-primary flex items-center gap-1 transition-colors">
            <LayoutGrid className="w-4 h-4" /> Painel
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Serviços</span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground flex items-center gap-3">
              <Scissors className="w-8 h-8 text-primary" /> Gerenciar Serviços
            </h1>
            <p className="text-muted-foreground mt-1">Configure o catálogo de serviços, preços e durações.</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Serviço
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border/50 shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border/50">
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><div className="h-5 w-8 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-48 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="text-right"><div className="h-8 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Nenhum serviço encontrado. Comece adicionando um novo serviço.
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">#{service.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {service.imageUrl && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                          <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-foreground">{service.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{service.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {service.durationMinutes} min
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCurrencyFromCents(service.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleOpenModal(service)} className="h-8 w-8 hover:border-primary hover:text-primary">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(service.id)} className="h-8 w-8 hover:border-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 border-border/50">
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <CardHeader>
              <CardTitle className="text-2xl font-serif">
                {editingService ? "Editar Serviço" : "Novo Serviço"}
              </CardTitle>
              <CardDescription>
                Preencha os detalhes abaixo para {editingService ? "atualizar" : "criar"} o serviço.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Serviço</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Corte Degradê"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    required
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva o que está incluso no serviço..."
                    className="min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={e => setFormData({...formData, price: e.target.value})}
                        className="pl-9"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração (min)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="duration"
                        type="number"
                        required
                        value={formData.durationMinutes}
                        onChange={e => setFormData({...formData, durationMinutes: e.target.value})}
                        className="pl-9"
                        placeholder="45"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL da Imagem (opcional)</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="imageUrl"
                      value={formData.imageUrl}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                      className="pl-9"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingService ? "Salvar Alterações" : "Criar Serviço"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
