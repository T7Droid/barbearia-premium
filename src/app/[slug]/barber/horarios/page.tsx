"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Clock, Save, Loader2, Calendar, MapPin } from "lucide-react";
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
  const [units, setUnits] = useState<any[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [barberId, setBarberId] = useState<number | null>(null);

  const generateTimeOptions = (minTime?: string, maxTime?: string) => {
    const options = [];
    const interval = 30;
    const totalMinutesInDay = 24 * 60;
    for (let minutes = 0; minutes < totalMinutesInDay; minutes += interval) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      
      if (minTime && time < minTime) continue;
      if (maxTime && time > maxTime) continue;
      
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
      
      if (!res.ok) throw new Error("Falha ao buscar perfil");

      const data = await res.json();
      const barberUnits = data.units || [];
      setUnits(barberUnits);
      setBarberId(data.id);

      const dbHours = data.weekly_hours || {};
      const newWeeklyHours: Record<string, any> = {};

      barberUnits.forEach((unit: any) => {
        const uId = String(unit.id);
        // Tenta pegar do mapa por unidade, senão tenta o formato plano antigo, senão cria vazio (desativado)
        let unitSpecificHours = dbHours[uId];
        
        if (!unitSpecificHours) {
          // Se não tem no mapa, verifica se os dados no DB são o formato plano antigo e migra pra este unit
          const isLegacyFlat = dbHours.monday || dbHours.tuesday;
          if (isLegacyFlat) {
            unitSpecificHours = { ...dbHours };
          } else {
            // Novo unit ou sem dados: Tudo desativado por padrão conforme solicitado
            unitSpecificHours = DAYS_OF_WEEK.reduce((acc: any, day) => {
              const uDay = unit.weekly_hours?.[day.id];
              acc[day.id] = { 
                active: false, 
                start: uDay?.start || "09:00", 
                end: uDay?.end || "18:00" 
              };
              return acc;
            }, {});
          }
        }
        newWeeklyHours[uId] = unitSpecificHours;
      });

      setWeeklyHours(newWeeklyHours);
    } catch (error) {
      console.error("fetchSchedule error:", error);
      toast({ title: "Erro", description: "Falha ao carregar horários.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenant.slug) fetchSchedule();
  }, [tenant.slug]);

  const handleToggleDay = (unitId: string, dayId: string, active: boolean) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [unitId]: {
        ...prev[unitId],
        [dayId]: { ...prev[unitId][dayId], active }
      }
    }));
  };

  const handleTimeChange = (unitId: string, dayId: string, field: "start" | "end", value: string) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [unitId]: {
        ...prev[unitId],
        [dayId]: { ...prev[unitId][dayId], [field]: value }
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/barbers/${barberId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug 
        },
        body: JSON.stringify({ weeklyHours })
      });

      if (!res.ok) throw new Error("Erro ao salvar");
      toast({ title: "Sucesso!", description: "Seus horários foram atualizados em todas as unidades." });
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
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" /> Meus Horários
          </h1>
          <p className="text-muted-foreground">Configure os seus horários de atendimento para cada unidade em que você atua.</p>
        </div>

        {units.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            Você ainda não está vinculado a nenhuma unidade. Entre em contato com o administrador.
          </Card>
        ) : (
          units.map((unit) => (
            <Card key={unit.id} className="border-border/50 shadow-xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Expediente semanal na unidade: <span className="text-primary">{unit.name}</span>
                </CardTitle>
                <CardDescription>Defina sua jornada nesta unidade específica.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {DAYS_OF_WEEK.map((day) => {
                    const uId = String(unit.id);
                    const config = weeklyHours[uId]?.[day.id] || { active: false, start: "09:00", end: "18:00" };
                    const unitConfig = unit.weekly_hours?.[day.id] || { active: false };
                    const isUnitClosed = !unitConfig.active;

                    return (
                      <div key={day.id} className={`p-6 transition-colors hover:bg-muted/5 ${isUnitClosed ? 'bg-muted/20 opacity-80' : ''}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex flex-col gap-1 min-w-[150px]">
                            <span className="font-bold text-lg text-foreground">{day.label}</span>
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={config.active && !isUnitClosed} 
                                disabled={isUnitClosed}
                                onCheckedChange={(checked) => handleToggleDay(uId, day.id, checked)} 
                              />
                              <span className={`text-xs font-bold uppercase tracking-wider ${isUnitClosed ? 'text-destructive' : config.active ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {isUnitClosed ? 'Unidade Fechada' : config.active ? 'Atendimento Ativo' : 'Não Atendo'}
                              </span>
                            </div>
                          </div>

                          {config.active && !isUnitClosed && (
                            <div className="flex flex-1 items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-300 justify-end">
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Início</span>
                                 <Select
                                   value={config.start || unitConfig.start || "09:00"}
                                   onValueChange={(val) => handleTimeChange(uId, day.id, "start", val)}
                                 >
                                   <SelectTrigger className="w-[110px] h-10 text-sm bg-background border-border/50 shadow-sm">
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {generateTimeOptions(unitConfig.start, unitConfig.end).map(time => (
                                       <SelectItem key={time} value={time}>{time}</SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Fim</span>
                                 <Select
                                   value={config.end || unitConfig.end || "18:00"}
                                   onValueChange={(val) => handleTimeChange(uId, day.id, "end", val)}
                                 >
                                   <SelectTrigger className="w-[110px] h-10 text-sm bg-background border-border/50 shadow-sm">
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {generateTimeOptions(unitConfig.start, unitConfig.end)
                                       .filter(t => t > (config.start || "00:00"))
                                       .map(time => (
                                         <SelectItem key={time} value={time}>{time}</SelectItem>
                                       ))}
                                   </SelectContent>
                                 </Select>
                              </div>
                            </div>
                          )}

                          {!config.active && !isUnitClosed && (
                            <div className="flex-1 text-right italic text-xs text-muted-foreground">
                              Dia indisponível para esta unidade
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <div className="sticky bottom-8 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || units.length === 0} className="gap-2 shadow-2xl h-14 px-8 text-lg font-bold">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Todas as Escalas
          </Button>
        </div>
      </div>
    </Layout>
  );
}
