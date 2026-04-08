"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings2, ShieldCheck, Ticket, CalendarClock, CreditCard, Clock, ExternalLink } from "lucide-react";
import { formatDateBR } from "@/lib/format/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { toast } = useToast();

  const generateTimeOptions = () => {
    const options = [];
    const interval = settings.slotInterval || 45;
    const totalMinutesInDay = 24 * 60;
    for (let minutes = 0; minutes < totalMinutesInDay; minutes += interval) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      options.push(time);
    }
    return options;
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    isPointsEnabled: true,
    cancellationWindowDays: 2,
    isPrepaymentRequired: true,
    businessStartTime: "09:00",
    businessEndTime: "18:00",
    slotInterval: 45,
    subscriptionStatus: "active" as "active" | "past_due" | "canceled" | "trialing",
    subscriptionNextPayment: "2026-05-15",
    pointsPerAppointment: 50,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar as configurações", variant: "destructive" });
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast({ title: "Sucesso", description: "Configurações salvas com sucesso!" });
      } else {
        const err = await res.json();
        toast({ title: "Erro", description: err.error || "Falha ao salvar", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erro", description: "Falha na conexão", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4 md:gap-0">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-primary" /> Configurações
          </h1>
          <p className="text-muted-foreground mt-2">Gerencie as regras de negócio da sua barbearia.</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Subscription Status */}
        <Card className="bg-card border-border/50 shadow-lg overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary-foreground opacity-50" />
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>Minha Assinatura</CardTitle>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  settings.subscriptionStatus === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                }`}>
                  {settings.subscriptionStatus === 'active' ? 'Ativa' : 'Pendente'}
                </div>
              </div>
              <CardDescription>Gerencie seu plano e pagamentos do Barber Premium.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-accent/50 border border-border/40">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Próximo Vencimento</p>
                <p className="text-lg font-bold text-foreground">{formatDateBR(settings.subscriptionNextPayment)}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/50 border border-border/40">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Valor Mensal</p>
                <p className="text-lg font-bold text-foreground">R$ 99,90</p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2 hover:bg-primary hover:text-white transition-all shadow-md active:scale-95"
                    onClick={() => window.open('https://stripe.com', '_blank')}>
              Gerenciar Assinatura (Stripe) <ExternalLink className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>Sistema de Fidelidade</CardTitle>
              <CardDescription>Clientes ganham pontos a cada agendamento.</CardDescription>
            </div>
            <Switch
              checked={settings.isPointsEnabled}
              onCheckedChange={(val) => setSettings({...settings, isPointsEnabled: val})}
            />
          </CardHeader>
          {settings.isPointsEnabled && (
            <CardContent className="pt-0">
              <div className="flex flex-col gap-2 max-w-xs mt-2">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Pontos por Agendamento</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    value={settings.pointsPerAppointment || 50}
                    onChange={(e) => setSettings({...settings, pointsPerAppointment: parseInt(e.target.value) || 0})}
                    className="text-lg font-medium"
                  />
                  <span className="text-muted-foreground">Pts</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="bg-card border-border/50 shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <CardTitle>Janela de Cancelamento</CardTitle>
              <CardDescription>Antecedência mínima permitida para remarcar ou cancelar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 max-w-xs">
              <Input
                type="number"
                min={0}
                value={settings.cancellationWindowDays}
                onChange={(e) => setSettings({...settings, cancellationWindowDays: parseInt(e.target.value) || 0})}
                className="text-lg font-medium"
              />
              <span className="text-muted-foreground">Dias</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <CardTitle>Intervalo de Agendamento</CardTitle>
              <CardDescription>Defina o tempo de duração padrão entre cada horário.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Select
                value={settings.slotInterval?.toString()}
                onValueChange={(val) => {
                  const newInterval = parseInt(val);
                  setSettings({...settings, slotInterval: newInterval});

                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o intervalo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Minutos</SelectItem>
                  <SelectItem value="45">45 Minutos</SelectItem>
                  <SelectItem value="60">60 Minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <CardTitle>Horário de Funcionamento</CardTitle>
              <CardDescription>Defina o intervalo de horários de atendimento (30, 45 ou 60 min).</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
              <div className="space-y-2">
                <Label>Início do Expediente</Label>
                <Select
                  value={settings.businessStartTime}
                  onValueChange={(val) => {
                    setSettings({...settings, businessStartTime: val});

                    if (settings.businessEndTime && settings.businessEndTime <= val) {
                      setSettings(prev => ({...prev, businessStartTime: val, businessEndTime: ""}));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o início" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeOptions().map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fim do Expediente</Label>
                <Select
                  value={settings.businessEndTime}
                  onValueChange={(val) => setSettings({...settings, businessEndTime: val})}
                  disabled={!settings.businessStartTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!settings.businessStartTime ? "Selecione o início primeiro" : "Selecione o fim"} />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeOptions()
                      .filter(time => !settings.businessStartTime || time > settings.businessStartTime)
                      .map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                {!settings.businessStartTime && (
                  <p className="text-[10px] text-orange-500 font-medium">
                    * Selecione o início para habilitar o fim do expediente.
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6 italic">
              Nota: Os clientes verão apenas horários entre {settings.businessStartTime} e {settings.businessEndTime} que coincidam com intervalos de 30, 45 ou 60 minutos.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <CardTitle>Pagamento Antecipado</CardTitle>
              <CardDescription>Exigir pagamento (Online) no momento do agendamento.</CardDescription>
            </div>
            <Switch
              checked={settings.isPrepaymentRequired}
              onCheckedChange={(val) => setSettings({...settings, isPrepaymentRequired: val})}
            />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground italic">
              {settings.isPrepaymentRequired
                ? "Ativado: O cliente só reserva após o checkout."
                : "Desativado: O cliente terá a opção de pagar no local."}
            </p>
          </CardContent>
        </Card>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3 text-sm text-foreground">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <p>Estas configurações afetam imediatamente o fluxo de agendamento e a visualização na área do cliente.</p>
        </div>
      </div>
    </div>
  );
}
