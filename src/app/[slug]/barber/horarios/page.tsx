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

import { Input } from "@/components/ui/input";

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
        let unitData = dbHours[uId];
        
        // Se não houver dados específicos para esta unidade, tentamos migrar se houver dados legados
        if (!unitData) {
          const isLegacyFlat = dbHours.monday || dbHours.tuesday;
          if (isLegacyFlat) {
            // Migra preservando apenas os horários úteis (opcional) ou limpando
            unitData = JSON.parse(JSON.stringify(dbHours)); 
          } else {
            // Inicializa vazio (tudo fechado) conforme o fluxo dinâmico exige
            unitData = {
              config: { useBreakTime: false, breakTimeMinutes: "0" }
            };
            DAYS_OF_WEEK.forEach(day => {
              unitData[day.id] = { active: false, start: "09:00", end: "18:00" };
            });
          }
        }
        
        // Garantir que a config de respiro existe no objeto com nomes corretos
        if (!unitData.config) {
          unitData.config = { useBreakTime: false, breakTimeMinutes: "0" };
        } else {
          // Normalizar nomes se vierem do legado
          if (unitData.config.isBreakEnabled !== undefined) {
             unitData.config.useBreakTime = unitData.config.isBreakEnabled;
          }
          if (unitData.config.breakTime !== undefined) {
             unitData.config.breakTimeMinutes = String(unitData.config.breakTime);
          }
        }

        newWeeklyHours[uId] = unitData;
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

  const handleToggleBreakTime = (unitId: string, enabled: boolean) => {
    setWeeklyHours((prev) => {
      const unitConfig = prev[unitId] || {};
      const currentConfig = unitConfig.config || { useBreakTime: false, breakTimeMinutes: "0" };
      return {
        ...prev,
        [unitId]: {
          ...unitConfig,
          config: { ...currentConfig, useBreakTime: enabled }
        }
      };
    });
  };

  const handleBreakTimeMinutesChange = (unitId: string, minutes: string) => {
    setWeeklyHours((prev) => {
      const unitConfig = prev[unitId] || {};
      const currentConfig = unitConfig.config || { useBreakTime: false, breakTimeMinutes: "0" };
      return {
        ...prev,
        [unitId]: {
          ...unitConfig,
          config: { ...currentConfig, breakTimeMinutes: minutes }
        }
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Saneamento final: se a unidade está fechada em um dia, o barbeiro deve estar inativo nesse dia
      const sanitizedHours = JSON.parse(JSON.stringify(weeklyHours));
      
      units.forEach((unit) => {
        const uId = String(unit.id);
        if (sanitizedHours[uId]) {
          DAYS_OF_WEEK.forEach((day) => {
            const unitDayConfig = unit.weekly_hours?.[day.id];
            const isUnitClosed = !unitDayConfig?.active;
            
            if (isUnitClosed && sanitizedHours[uId][day.id]) {
              sanitizedHours[uId][day.id].active = false;
            }
          });
        }
      });

      console.log("[SALVAR] Enviando horários saneados:", sanitizedHours);
      
      const res = await fetch(`/api/barbers/${barberId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug 
        },
        body: JSON.stringify({ weeklyHours: sanitizedHours }) 
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao salvar");
      }

      toast({ title: "Sucesso!", description: "Escalas salvas e saneadas com sucesso." });
      // Atualizar o estado local com os dados limpos
      setWeeklyHours(sanitizedHours);
    } catch (error: any) {
      toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Unidade: <span className="text-primary">{unit.name}</span>
                    </CardTitle>
                    <CardDescription>Defina sua jornada nesta unidade específica.</CardDescription>
                  </div>
                  
                  {/* 
                  <div className="bg-background/40 border border-primary/20 rounded-xl p-4 flex items-center gap-6 shadow-sm">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-bold uppercase tracking-widest text-primary/80">Tempo de Respiro</Label>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={weeklyHours[String(unit.id)]?.config?.useBreakTime || false}
                          onCheckedChange={(val) => handleToggleBreakTime(String(unit.id), val)}
                        />
                        <span className="text-xs font-medium text-foreground">Intervalo entre serviços?</span>
                      </div>
                    </div>
                    
                    {weeklyHours[String(unit.id)]?.config?.useBreakTime && (
                      <div className="flex flex-col gap-1 animate-in zoom-in-95 duration-200">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Minutos</Label>
                        <Input 
                          type="number"
                          className="w-20 h-9 bg-background/50"
                          value={weeklyHours[String(unit.id)]?.config?.breakTimeMinutes || "0"}
                          onChange={(e) => handleBreakTimeMinutesChange(String(unit.id), e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  */}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {DAYS_OF_WEEK.map((day) => {
                    const uId = String(unit.id);
                    const unitDay = unit.weekly_hours?.[day.id] || { active: false, start: "09:00", end: "18:00" };
                    const config = weeklyHours[uId]?.[day.id] || { active: false, start: unitDay.start, end: unitDay.end };
                    const isUnitClosed = !unitDay.active;

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
                                {isUnitClosed ? 'Fechado' : config.active ? 'Atendimento' : 'Folga'}
                              </span>
                            </div>
                          </div>

                          {config.active && !isUnitClosed && (
                            <div className="flex flex-1 items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-300 justify-end">
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Início</span>
                                  <Select
                                    value={config.start || unitDay.start || "09:00"}
                                    onValueChange={(val) => handleTimeChange(uId, day.id, "start", val)}
                                  >
                                    <SelectTrigger className="w-[110px] h-10 bg-background border-border/50 shadow-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {generateTimeOptions(unitDay.start, unitDay.end).map(time => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Fim</span>
                                  <Select
                                    value={config.end || unitDay.end || "18:00"}
                                    onValueChange={(val) => handleTimeChange(uId, day.id, "end", val)}
                                  >
                                    <SelectTrigger className="w-[110px] h-10 bg-background border-border/50 shadow-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {generateTimeOptions(unitDay.start, unitDay.end)
                                        .filter(t => t > (config.start || "00:00"))
                                        .map(time => (
                                          <SelectItem key={time} value={time}>{time}</SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                              </div>
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
            Salvar Minhas Escalas
          </Button>
        </div>
      </div>
    </Layout>
  );
}
