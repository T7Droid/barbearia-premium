"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { Clock, Save, Loader2, Calendar } from "lucide-react";

const DAYS_OF_WEEK = [
  { id: "monday", label: "Segunda-feira" },
  { id: "tuesday", label: "Terça-feira" },
  { id: "wednesday", label: "Quarta-feira" },
  { id: "thursday", label: "Quinta-feira" },
  { id: "friday", label: "Sexta-feira" },
  { id: "saturday", label: "Sábado" },
  { id: "sunday", label: "Domingo" },
];

export default function BarberSchedulePage() {
  const { toast } = useToast();
  const tenant = useTenant();
  const [weeklyHours, setWeeklyHours] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [barberId, setBarberId] = useState<number | null>(null);

  const fetchSchedule = async () => {
    try {
      const headers = { "x-tenant-slug": tenant.slug };
      const res = await fetch("/api/barber/me", { headers });
      const data = await res.json();
      
      if (data.weekly_hours) {
        setWeeklyHours(data.weekly_hours);
      } else {
        // Se não tiver horários, carregar do global como fallback
        const settingsRes = await fetch("/api/settings", { headers });
        const settings = await settingsRes.json();
        setWeeklyHours(settings.weekly_hours || {});
      }
      setBarberId(data.id);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar horários", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenant.slug) fetchSchedule();
  }, [tenant.slug]);

  const handleToggleDay = (dayId: string, active: boolean) => {
    setWeeklyHours((prev: any) => ({
      ...prev,
      [dayId]: { ...prev[dayId], active }
    }));
  };

  const handleTimeChange = (dayId: string, field: "start" | "end", value: string) => {
    setWeeklyHours((prev: any) => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const headers = { 
        "Content-Type": "application/json",
        "x-tenant-slug": tenant.slug 
      };
      const res = await fetch(`/api/barbers/${barberId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ weeklyHours })
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      toast({ title: "Sucesso!", description: "Seus horários foram atualizados." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao atualizar horários", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" /> Meus Horários
            </h1>
            <p className="text-muted-foreground">Configure os dias e horários em que você está disponível para atendimento.</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 shadow-lg">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Salvando..." : "Salvar Horários"}
          </Button>
        </div>

        <Card className="border-border/50 shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg">Expediente Semanal</CardTitle>
            <CardDescription>Defina sua jornada de trabalho para cada dia da semana.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {DAYS_OF_WEEK.map((day) => {
                const config = weeklyHours?.[day.id] || { active: false, start: "09:00", end: "18:00" };
                return (
                  <div key={day.id} className="p-6 transition-colors hover:bg-muted/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex flex-col gap-1 min-w-[150px]">
                        <span className="font-bold text-lg text-foreground">{day.label}</span>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={config.active} 
                            onCheckedChange={(checked) => handleToggleDay(day.id, checked)} 
                          />
                          <span className={`text-xs font-bold uppercase tracking-wider ${config.active ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {config.active ? 'Atendimento Ativo' : 'Não Atendo'}
                          </span>
                        </div>
                      </div>

                      {config.active && (
                        <div className="flex flex-1 items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                          <div className="flex-1 space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Início</Label>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input 
                                type="time" 
                                value={config.start} 
                                onChange={(e) => handleTimeChange(day.id, "start", e.target.value)}
                                className="pl-9 h-11 bg-background"
                              />
                            </div>
                          </div>
                          <div className="pt-6 text-muted-foreground font-light text-xl">→</div>
                          <div className="flex-1 space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Fim</Label>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input 
                                type="time" 
                                value={config.end} 
                                onChange={(e) => handleTimeChange(day.id, "end", e.target.value)}
                                className="pl-9 h-11 bg-background"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {!config.active && (
                        <div className="flex-1 flex items-center justify-center p-4 border border-dashed rounded-lg bg-muted/10 text-muted-foreground text-sm italic">
                          Dia de descanso ou folga
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <div className="p-6 bg-muted/30 border-t flex justify-end">
             <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
             </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
