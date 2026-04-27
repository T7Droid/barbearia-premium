"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { MapPin, Plus, Trash2, Edit2, ExternalLink, Loader2, LayoutGrid, Clock } from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UnidadesPage() {
  const { toast } = useToast();
  const tenant = useTenant();
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);

  // Estados para Bloqueio de Datas
  const [blockedDays, setBlockedDays] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [targetUnitIds, setTargetUnitIds] = useState<string[]>([]);
  const [isProcessingBlock, setIsProcessingBlock] = useState(false);
  const [appointmentCount, setAppointmentCount] = useState(0);

  const DAYS_OF_WEEK = [
    { id: "monday", label: "Segunda-feira" },
    { id: "tuesday", label: "Terça-feira" },
    { id: "wednesday", label: "Quarta-feira" },
    { id: "thursday", label: "Quinta-feira" },
    { id: "friday", label: "Sexta-feira" },
    { id: "saturday", label: "Sábado" },
    { id: "sunday", label: "Domingo" },
  ];

  const DEFAULT_HOURS = {
    monday: { active: true, start: "09:00", end: "18:00" },
    tuesday: { active: true, start: "09:00", end: "18:00" },
    wednesday: { active: true, start: "09:00", end: "18:00" },
    thursday: { active: true, start: "09:00", end: "18:00" },
    friday: { active: true, start: "09:00", end: "18:00" },
    saturday: { active: true, start: "09:00", end: "18:00" },
    sunday: { active: false, start: "09:00", end: "18:00" },
  };

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    number: "",
    city: "",
    state: "",
    postal_code: "",
    google_maps_link: "",
    weekly_hours: DEFAULT_HOURS as any
  });

  const generateTimeOptions = (interval = 30) => {
    const options = [];
    const totalMinutesInDay = 24 * 60;
    for (let minutes = 0; minutes < totalMinutesInDay; minutes += interval) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      options.push(time);
    }
    return options;
  };

  const getLink = (path: string) => `/${tenant?.slug}${path}`;

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units", {
        headers: { "x-tenant-slug": tenant.slug }
      });
      const data = await res.json();
      setUnits(data);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar unidades", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlockedDays = async () => {
    try {
      const res = await fetch("/api/admin/blocked-days", {
        headers: { "x-tenant-slug": tenant.slug }
      });
      const data = await res.json();
      setBlockedDays(data);
    } catch (error) {
      console.error("Erro ao carregar bloqueios", error);
    }
  };

  useEffect(() => {
    if (tenant.slug) {
      fetchUnits();
      fetchBlockedDays();
    }
  }, [tenant.slug]);

  const handleOpenDialog = (unit: any = null) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name,
        address: unit.address,
        number: unit.number || "",
        city: unit.city || "",
        state: unit.state || "",
        postal_code: unit.postal_code || "",
        google_maps_link: unit.google_maps_link || "",
        weekly_hours: unit.weekly_hours || DEFAULT_HOURS
      });
    } else {
      setEditingUnit(null);
      setFormData({
        name: "",
        address: "",
        number: "",
        city: "",
        state: "",
        postal_code: "",
        google_maps_link: "",
        weekly_hours: DEFAULT_HOURS
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      toast({ title: "Atenção", description: "Nome e Endereço são obrigatórios", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const url = editingUnit ? `/api/units/${editingUnit.id}` : "/api/units";
      const method = editingUnit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug 
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao salvar");
      }

      toast({ title: "Sucesso", description: `Unidade ${editingUnit ? "atualizada" : "criada"} com sucesso` });
      setIsDialogOpen(false);
      fetchUnits();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao salvar unidade", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateClick = async (date: Date | undefined) => {
    if (!date) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      toast({ title: "Data Inválida", description: "Você só pode gerenciar bloqueios para datas futuras.", variant: "destructive" });
      return;
    }

    setSelectedDate(date);
    const dateStr = format(date, "yyyy-MM-dd");

    // Pre-selecionar unidades que já estão bloqueadas
    const existingBlocks = blockedDays.filter(b => b.date === dateStr);
    setTargetUnitIds(existingBlocks.map(b => b.unit_id));

    setIsProcessingBlock(true);
    try {
      // Verificar se há agendamentos para TODAS as unidades naquele dia
      const res = await fetch("/api/admin/blocked-days", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug 
        },
        body: JSON.stringify({ 
          date: dateStr, 
          unitIds: units.map(u => u.id), 
          forceCancel: false 
        })
      });
      
      const data = await res.json();
      
      if (data.hasAppointments) {
        setAppointmentCount(data.count);
        setIsConfirmCancelOpen(true);
      } else {
        setIsBlockDialogOpen(true);
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao verificar agendamentos", variant: "destructive" });
    } finally {
      setIsProcessingBlock(false);
    }
  };

  const saveBlocks = async (force = false) => {
    if (targetUnitIds.length === 0) {
      // Se desmarcou tudo, vamos remover todos os bloqueios daquela data
      const dateStr = format(selectedDate!, "yyyy-MM-dd");
      setIsProcessingBlock(true);
      try {
        await Promise.all(units.map(u => 
          fetch(`/api/admin/blocked-days?date=${dateStr}&unitId=${u.id}`, {
            method: "DELETE",
            headers: { "x-tenant-slug": tenant.slug }
          })
        ));
        toast({ title: "Sucesso", description: "Bloqueios removidos" });
        setIsBlockDialogOpen(false);
        fetchBlockedDays();
      } catch (e) {
        toast({ title: "Erro", description: "Falha ao remover bloqueios", variant: "destructive" });
      } finally {
        setIsProcessingBlock(false);
      }
      return;
    }

    setIsProcessingBlock(true);
    try {
      const dateStr = format(selectedDate!, "yyyy-MM-dd");
      const res = await fetch("/api/admin/blocked-days", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug 
        },
        body: JSON.stringify({ 
          date: dateStr, 
          unitIds: targetUnitIds, 
          forceCancel: force 
        })
      });

      if (res.ok) {
        toast({ title: "Sucesso", description: force ? "Agendamentos cancelados e dia bloqueado" : "Bloqueio atualizado com sucesso" });
        setIsBlockDialogOpen(false);
        setIsConfirmCancelOpen(false);
        fetchBlockedDays();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao salvar bloqueio", variant: "destructive" });
    } finally {
      setIsProcessingBlock(false);
    }
  };

  const isDayBlocked = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return blockedDays.some(b => b.date === dateStr);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href={getLink("/admin")} className="hover:text-primary flex items-center gap-1 transition-colors">
            <LayoutGrid className="w-4 h-4" /> Painel
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Unidades</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">Gerenciar Unidades</h1>
            <p className="text-muted-foreground">Cadastre e gerencie as localizações da sua barbearia.</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Unidade
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : units.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nenhuma unidade encontrada</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              Você ainda não cadastrou nenhuma unidade. Comece criando a sua unidade principal.
            </p>
            <Button onClick={() => handleOpenDialog()}>Adicionar Primeira Unidade</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {units.map((unit) => (
            <Card key={unit.id} className="overflow-hidden border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-serif">{unit.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(unit)}>
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {unit.city}, {unit.state}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="text-sm space-y-1">
                  <p className="font-medium">Endereço:</p>
                  <p className="text-muted-foreground">
                    {unit.address}, {unit.number}
                  </p>
                  <p className="text-muted-foreground">
                    CEP: {unit.postal_code || "N/A"}
                  </p>
                </div>

                {unit.google_maps_link && (
                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <a href={unit.google_maps_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" /> Ver no Google Maps
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Seção de Bloqueio de Agenda */}
      <div className="mt-16 pt-8 border-t">
        <div className="mb-6">
          <h2 className="text-2xl font-serif font-bold tracking-tight">Bloqueio de Agenda</h2>
          <p className="text-muted-foreground">
            Selecione uma data no calendário abaixo para bloquear agendamentos em unidades específicas. 
            Isso é útil para feriados, manutenções ou folgas coletivas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Calendário de Bloqueios</CardTitle>
              <CardDescription>Clique em um dia para gerenciar</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {isProcessingBlock && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] flex items-center justify-center rounded-md">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Verificando...</span>
                  </div>
                </div>
              )}
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateClick}
                locale={ptBR}
                disabled={isProcessingBlock}
                className="rounded-md border shadow-sm"
                modifiers={{
                  blocked: (date) => isDayBlocked(date)
                }}
                modifiersClassNames={{
                  blocked: "bg-destructive/10 text-destructive font-bold border-destructive/20"
                }}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Datas Bloqueadas</CardTitle>
              <CardDescription>Resumo dos próximos bloqueios ativos</CardDescription>
            </CardHeader>
            <CardContent>
              {blockedDays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum bloqueio configurado.
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from(new Set(blockedDays.map(b => b.date)))
                    .sort()
                    .filter(d => new Date(d) >= new Date(new Date().setHours(0,0,0,0)))
                    .map(dateStr => {
                      const dateBlocks = blockedDays.filter(b => b.date === dateStr);
                      return (
                        <div key={dateStr} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                          <div>
                            <p className="font-medium">{format(new Date(dateStr + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {dateBlocks.map(b => {
                                const unit = units.find(u => u.id === b.unit_id);
                                return (
                                  <span key={b.unit_id} className="text-[10px] px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                                    {unit?.name || "Unidade"}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDateClick(new Date(dateStr + "T12:00:00"))}
                          >
                            Editar
                          </Button>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Seleção de Unidades */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Bloqueio</DialogTitle>
            <DialogDescription>
              Selecione quais unidades estarão fechadas em {selectedDate && format(selectedDate, "dd/MM/yyyy")}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm font-medium">Unidades para bloquear:</p>
            <div className="space-y-3">
              {units.map((unit) => (
                <div key={unit.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Checkbox 
                    id={`unit-${unit.id}`}
                    checked={targetUnitIds.includes(unit.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setTargetUnitIds([...targetUnitIds, unit.id]);
                      } else {
                        setTargetUnitIds(targetUnitIds.filter(id => id !== unit.id));
                      }
                    }}
                  />
                  <Label htmlFor={`unit-${unit.id}`} className="flex-1 cursor-pointer">{unit.name}</Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => saveBlocks()} 
              disabled={isProcessingBlock}
              className="gap-2"
            >
              {isProcessingBlock && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Confirmação de Cancelamento */}
      <AlertDialog open={isConfirmCancelOpen} onOpenChange={setIsConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existem agendamentos para este dia!</AlertDialogTitle>
            <AlertDialogDescription>
              Foram encontrados <strong>{appointmentCount}</strong> agendamento(s) para o dia {selectedDate && format(selectedDate, "dd/MM/yyyy")}.
              Se você prosseguir com o bloqueio, todos esses agendamentos serão <strong>cancelados</strong>.
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setIsConfirmCancelOpen(false);
                setIsBlockDialogOpen(true);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, entendi e quero bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">
              {editingUnit ? "Editar Unidade" : "Nova Unidade"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da localização.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto pr-2 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nome da Unidade *</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Unidade Centro" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Logradouro / Endereço *</Label>
                <Input 
                  id="address" 
                  placeholder="Rua, Avenida, etc" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input 
                  id="number" 
                  placeholder="123" 
                  value={formData.number}
                  onChange={(e) => setFormData({...formData, number: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">CEP</Label>
                <Input 
                  id="postal_code" 
                  placeholder="00000-000" 
                  value={formData.postal_code}
                  onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input 
                  id="city" 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input 
                  id="state" 
                  placeholder="SP" 
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="maps">Link Google Maps (Opcional)</Label>
                <Input 
                  id="maps" 
                  placeholder="https://goo.gl/maps/..." 
                  value={formData.google_maps_link}
                  onChange={(e) => setFormData({...formData, google_maps_link: e.target.value})}
                />
              </div>

              <div className="md:col-span-2 mt-4 space-y-4 pt-4 border-t border-border/50">
                 <div className="flex items-center gap-2">
                   <Clock className="w-5 h-5 text-primary" />
                   <h3 className="font-serif font-bold text-lg">Horário de Funcionamento</h3>
                 </div>
                 <p className="text-sm text-muted-foreground">Defina o expediente para esta unidade específica.</p>
                 
                 <div className="space-y-3">
                   {DAYS_OF_WEEK.map((day) => {
                     const config = formData.weekly_hours?.[day.id] || { active: false, start: "09:00", end: "18:00" };
                     return (
                       <div key={day.id} className={`p-3 rounded-md border transition-all ${config.active ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-dashed opacity-60'}`}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-40">
                               <Switch 
                                 checked={config.active}
                                 onCheckedChange={(val) => {
                                   const newWeekly = { ...formData.weekly_hours, [day.id]: { ...config, active: val } };
                                   setFormData({ ...formData, weekly_hours: newWeekly });
                                 }}
                               />
                               <span className="text-sm font-medium">{day.label}</span>
                            </div>

                            {config.active ? (
                              <div className="flex items-center gap-2">
                                 <Select
                                   value={config.start}
                                   onValueChange={(val) => {
                                     const newWeekly = { ...formData.weekly_hours, [day.id]: { ...config, start: val } };
                                     setFormData({ ...formData, weekly_hours: newWeekly });
                                   }}
                                 >
                                   <SelectTrigger className="w-[100px] h-8 text-xs bg-background">
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {generateTimeOptions().map(t => (
                                       <SelectItem key={t} value={t}>{t}</SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                                 <span className="text-xs text-muted-foreground px-1">até</span>
                                 <Select
                                   value={config.end}
                                   onValueChange={(val) => {
                                     const newWeekly = { ...formData.weekly_hours, [day.id]: { ...config, end: val } };
                                     setFormData({ ...formData, weekly_hours: newWeekly });
                                   }}
                                 >
                                   <SelectTrigger className="w-[100px] h-8 text-xs bg-background">
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {generateTimeOptions().filter(t => t > config.start).map(t => (
                                       <SelectItem key={t} value={t}>{t}</SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                              </div>
                            ) : (
                              <span className="text-[10px] uppercase font-bold text-muted-foreground mr-4">Fechado</span>
                            )}
                          </div>
                       </div>
                     );
                   })}
                 </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingUnit ? "Salvar Alterações" : "Criar Unidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
