"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  UserPlus,
  Save,
  ImageIcon,
  Key,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  LayoutGrid,
  Loader2,
  Pencil,
  Trash2,
  X,
  User,
  Users,
  Scissors
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTenant } from "@/hooks/use-tenant";

interface Barber {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  active: boolean;
}

export default function AdminBarbers() {
  const { toast } = useToast();
  const tenant = useTenant();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    active: true,
    unitIds: [] as string[],
    serviceIds: [] as string[],
    loginEmail: "",
    loginPassword: "",
    createLogin: false
  });

  const [units, setUnits] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  const fetchBarbers = async () => {
    if (!tenant?.slug) return;
    try {
      const headers = { "x-tenant-slug": tenant.slug };
      const [barbersRes, unitsRes, servicesRes] = await Promise.all([
        fetch("/api/barbers", { headers }),
        fetch("/api/units", { headers }),
        fetch("/api/services", { headers })
      ]);
      
      const barbersData = await barbersRes.json();
      const unitsData = await unitsRes.json();
      const servicesData = await servicesRes.json();
      
      if (Array.isArray(barbersData)) setBarbers(barbersData);
      if (Array.isArray(unitsData)) setUnits(unitsData);
      if (Array.isArray(servicesData)) setServices(servicesData);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
      setIsLoadingUnits(false);
    }
  };

  useEffect(() => {
    fetchBarbers();
  }, [tenant]);

  const handleOpenModal = (barber?: any) => {
    if (barber) {
      setEditingBarber(barber);
      setFormData({
        name: barber.name,
        description: barber.description,
        imageUrl: barber.imageUrl || barber.image_url || "",
        active: barber.active,
        unitIds: (barber.units || []).map((u: any) => String(u.id)),
        serviceIds: (barber.services || []).map((s: any) => String(s.id)),
        loginEmail: "",
        loginPassword: "",
        createLogin: false
      });
    } else {
      setEditingBarber(null);
      setFormData({
        name: "",
        description: "",
        imageUrl: "",
        active: true,
        unitIds: [],
        serviceIds: [],
        loginEmail: "",
        loginPassword: "",
        createLogin: false
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBarber(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.slug) return;
    setIsSubmitting(true);

    const method = editingBarber ? "PUT" : "POST";
    const url = editingBarber ? `/api/barbers/${editingBarber.id}` : "/api/barbers";

    try {
      const payload = {
        ...formData,
        loginData: formData.createLogin ? {
          email: formData.loginEmail,
          password: formData.loginPassword
        } : undefined
      };

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast({
          title: "Sucesso!",
          description: editingBarber ? "Barbeiro atualizado com sucesso." : "Novo barbeiro criado com sucesso."
        });
        fetchBarbers();
        handleCloseModal();
      } else {
        const errorData = await res.json();
        toast({ title: "Erro", description: errorData.error || "Falha ao salvar barbeiro.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro de conexão.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!tenant?.slug) return;
    if (!confirm("Tem certeza que deseja excluir este barbeiro?")) return;

    try {
      const res = await fetch(`/api/barbers/${id}`, { 
        method: "DELETE",
        headers: { "x-tenant-slug": tenant.slug }
      });
      if (res.ok) {
        toast({ title: "Excluído", description: "Barbeiro removido com sucesso." });
        fetchBarbers();
      } else {
        toast({ title: "Erro", description: "Falha ao excluir barbeiro.", variant: "destructive" });
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
          <span className="text-foreground font-medium">Barbeiros</span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" /> Equipe de Barbeiros
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie os profissionais que atendem na sua unidade.</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <UserPlus className="w-4 h-4" /> Adicionar Barbeiro
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border/50 shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border/50">
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Barbeiro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><div className="h-5 w-8 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-48 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="text-right"><div className="h-8 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : barbers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  Nenhum barbeiro encontrado. Comece adicionando um novo profissional.
                </TableCell>
              </TableRow>
            ) : (
              barbers.map((barber) => (
                <TableRow key={barber.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">#{barber.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-border bg-muted flex items-center justify-center">
                        {barber.imageUrl ? (
                          <img src={barber.imageUrl} alt={barber.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{barber.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{barber.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${barber.active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {barber.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleOpenModal(barber)} className="h-8 w-8 hover:border-primary hover:text-primary">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(barber.id)} className="h-8 w-8 hover:border-destructive hover:text-destructive">
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

      {/* Modal Barbeiro */}
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
                {editingBarber ? "Editar Barbeiro" : "Novo Barbeiro"}
              </CardTitle>
              <CardDescription>
                Preencha os detalhes do profissional abaixo.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="geral" className="w-full">
                <TabsList className="w-full grid grid-cols-3 rounded-none border-b h-14 bg-muted/20">
                  <TabsTrigger value="geral" className="gap-2">
                    <User className="w-4 h-4" /> Geral
                  </TabsTrigger>
                  <TabsTrigger value="servicos" className="gap-1.5 text-xs">
                    <Scissors className="w-4 h-4" /> Serviços
                  </TabsTrigger>
                  <TabsTrigger value="acesso" className="gap-1.5 text-xs">
                    <Key className="w-4 h-4" /> Acesso
                  </TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit}>
                  <TabsContent value="geral" className="p-6 space-y-4 m-0">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: João Silva"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Especialidade / Descrição</Label>
                      <Textarea
                        id="description"
                        required
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Ex: Especialista em degradê e barba..."
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl">URL da Foto (opcional)</Label>
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
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div className="space-y-0.5">
                        <Label>Disponível para Agendamento</Label>
                        <p className="text-xs text-muted-foreground">Se desativado, não aparecerá na tela de reserva.</p>
                      </div>
                      <Switch 
                        checked={formData.active} 
                        onCheckedChange={(checked) => setFormData({...formData, active: checked})} 
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="servicos" className="p-6 space-y-4 m-0">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Scissors className="w-4 h-4" /> Serviços que este profissional executa
                    </Label>
                    <div className="grid grid-cols-1 gap-2 border rounded-lg p-4 bg-muted/10 max-h-64 overflow-y-auto">
                      {services.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Nenhum serviço cadastrado ainda.</p>
                      ) : (
                        services.map(svc => (
                          <div key={svc.id} className="flex items-center space-x-3 p-2 hover:bg-muted/30 rounded-lg transition-colors">
                            <Checkbox
                              id={`svc-${svc.id}`}
                              checked={formData.serviceIds.includes(String(svc.id))}
                              onCheckedChange={(checked) => {
                                const sid = String(svc.id);
                                const newIds = checked
                                  ? [...formData.serviceIds, sid]
                                  : formData.serviceIds.filter(id => id !== sid);
                                setFormData({...formData, serviceIds: newIds});
                              }}
                            />
                            <Label htmlFor={`svc-${svc.id}`} className="text-sm font-normal cursor-pointer flex-1">
                              {svc.name}
                              <span className="text-xs text-muted-foreground ml-1.5">{svc.durationMinutes}min</span>
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="acesso" className="p-6 space-y-6 m-0">
                    <div className="space-y-4">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Disponibilidade em Unidades
                      </Label>
                      <div className="grid grid-cols-1 gap-3 border rounded-lg p-4 bg-muted/10">
                        {isLoadingUnits ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : units.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center">Nenhuma unidade cadastrada. Vá em "Unidades" primeiro.</p>
                        ) : (
                          units.map(unit => (
                            <div key={unit.id} className="flex items-center space-x-3">
                              <Checkbox 
                                id={`unit-${unit.id}`}
                                checked={formData.unitIds.includes(unit.id)}
                                onCheckedChange={(checked) => {
                                  const newIds = checked 
                                    ? [...formData.unitIds, unit.id]
                                    : formData.unitIds.filter(id => id !== unit.id);
                                  setFormData({...formData, unitIds: newIds});
                                }}
                              />
                              <Label htmlFor={`unit-${unit.id}`} className="text-sm font-normal cursor-pointer">
                                {unit.name} <span className="text-xs text-muted-foreground">- {unit.city}</span>
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Key className="w-4 h-4" /> Acesso ao Painel Profissional
                        </Label>
                        {!editingBarber && (
                          <Switch 
                            checked={formData.createLogin}
                            onCheckedChange={(v) => setFormData({...formData, createLogin: v})}
                          />
                        )}
                      </div>
                      
                      {editingBarber && (
                         <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-xs">
                           Se o barbeiro já tem login, ele pode acessar o painel profissional usando seu e-mail cadastrado.
                         </div>
                      )}

                      {(formData.createLogin || (editingBarber && !editingBarber.user_id)) && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          <div className="space-y-2">
                            <Label htmlFor="loginEmail">E-mail Profissional</Label>
                            <Input 
                              id="loginEmail"
                              type="email"
                              placeholder="barbeiro@exemplo.com"
                              value={formData.loginEmail}
                              onChange={e => setFormData({...formData, loginEmail: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="loginPassword">Senha Temporária</Label>
                            <Input 
                              id="loginPassword"
                              type="password"
                              placeholder="Mínimo 6 caracteres"
                              value={formData.loginPassword}
                              onChange={e => setFormData({...formData, loginPassword: e.target.value})}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <div className="p-6 border-t flex gap-3 bg-muted/10">
                    <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {editingBarber ? "Salvar Alterações" : "Cadastrar Barbeiro"}
                    </Button>
                  </div>
                </form>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
