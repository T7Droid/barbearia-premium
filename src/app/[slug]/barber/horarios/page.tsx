"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Clock, Save, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { Label } from "@/components/ui/label";

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
  const router = useRouter();
  const [weeklyHours, setWeeklyHours] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [barberId, setBarberId] = useState<number | null>(null);

  const generateTimeOptions = () => {
    const options = [];
    const interval = 30; // Poderia vir das configurações do tenant, mas fixamos 30 para o barbeiro
    const totalMinutesInDay = 24 * 60;
    for (let minutes = 0; minutes < totalMinutesInDay; minutes += interval) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      options.push(time);
    }
    return options;
  };

  const fetchSchedule = async () => {
    try {
      const res = await fetch("/api/barber/me", { 
        headers: { "x-tenant-slug": tenant.slug },
        cache: "no-store" 
      });
      
      if (!res.ok) {
        console.error(`BarberSchedule: GET /api/barber/me failed with status ${res.status}`);
        if (res.status === 403) {
          toast({ 
            title: "Acesso negado", 
            description: "ER-BAR-STS: Não autorizado",
            variant: "destructive" 
          });
          return;
        }
        if (res.status === 404) {
          toast({ 
            title: "Perfil não encontrado", 
            description: "Você será redirecionado para ativar sua conta profissional.",
            variant: "destructive" 
          });
          setTimeout(() => router.push(`/${tenant.slug}/barber`), 2000);
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Status ${res.status}: ${errorData.error || "Erro ao buscar perfil"}`);
      }

      const data = await res.json();
      
      if (data.weekly_hours) {
        setWeeklyHours(data.weekly_hours);
      } else {
        const settingsRes = await fetch("/api/settings", { headers });
        const settings = await settingsRes.json();
        setWeeklyHours(settings.weekly_hours || {});
      }
      setBarberId(data.id);
    } catch (error) {
      console.error("fetchSchedule error:", error);
      toast({ title: "Erro", description: "Falha ao carregar horários. Verifique se você já ativou seu perfil profissional.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenant.slug) fetchSchedule();
  }, [tenant.slug]);

  const handleToggleDay = (dayId: string, active: boolean) => {
    setWeeklyHours((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        [dayId]: { ...prev[dayId], active }
      };
    });
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
      if (!barberId) {
        toast({ title: "Erro", description: "Sua conta profissional não foi identificada. Tente recarregar a página.", variant: "destructive" });
        setIsSaving(false);
        return;
      }

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
                        <div className="flex flex-1 items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-300 justify-end">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] uppercase font-bold text-muted-foreground">Início</span>
                             <Select
                               value={config.start || "09:00"}
                               onValueChange={(val) => handleTimeChange(day.id, "start", val)}
                             >
                               <SelectTrigger className="w-[110px] h-10 text-sm bg-background border-border/50">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 {generateTimeOptions().map(time => (
                                   <SelectItem key={time} value={time}>{time}</SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] uppercase font-bold text-muted-foreground">Fim</span>
                             <Select
                               value={config.end || "18:00"}
                               onValueChange={(val) => handleTimeChange(day.id, "end", val)}
                             >
                               <SelectTrigger className="w-[110px] h-10 text-sm bg-background border-border/50">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 {generateTimeOptions()
                                   .filter(t => t > (config.start || "00:00"))
                                   .map(time => (
                                     <SelectItem key={time} value={time}>{time}</SelectItem>
                                   ))}
                               </SelectContent>
                             </Select>
                          </div>
                        </div>
                      )}

                      {!config.active && (
                        <div className="flex-1 text-right italic text-xs text-muted-foreground">
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
