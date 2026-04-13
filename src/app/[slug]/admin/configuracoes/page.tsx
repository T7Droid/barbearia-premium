"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ShieldCheck, CalendarClock, CreditCard, Clock, Settings, ExternalLink, Ticket, Wallet, AlertCircle } from "lucide-react";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useTenant } from "@/hooks/use-tenant";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatDateBR } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { toast } = useToast();
  const tenant = useTenant();

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
  const [connectingMP, setConnectingMP] = useState(false);
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
    initialPoints: 0,
    mpConnected: false,
    mpPublicKey: "",
    mpConnectionError: null as string | null
  });

  const fetchSettings = async () => {
    try {
      const headers = { "x-tenant-slug": tenant.slug };
      const res = await fetch("/api/settings", { headers });
      const data = await res.json();
      setSettings(data);
      // Sincronizar com DemoStore
      DemoStore.saveSettings(data);
    } catch (error) {
      const saved = DemoStore.getSettings();
      if (saved) setSettings(saved);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.slug) {
      fetchSettings();
    }
    
    // Verificar se voltou do redirecionamento do Mercado Pago
    const params = new URLSearchParams(window.location.search);
    if (params.get("mp_success") === "true") {
      toast({ title: "Sucesso!", description: "Sua conta do Mercado Pago foi conectada com sucesso." });
      window.history.replaceState({}, '', window.location.pathname);
    }
    const mpError = params.get("mp_error");
    if (mpError) {
      toast({ title: "Erro na conexão", description: decodeURIComponent(mpError), variant: "destructive" });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [tenant]);

  const handleConnectMP = async () => {
    setConnectingMP(true);
    try {
      const res = await fetch("/api/auth/mercadopago/url", {
        headers: { "x-tenant-slug": tenant.slug }
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Erro", description: "Falha ao gerar URL de conexão.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erro", description: "Erro de conexão.", variant: "destructive" });
    } finally {
      setConnectingMP(false);
    }
  };

  const handleDisconnectMP = async () => {
    if (!confirm("Tem certeza que deseja desconectar sua conta do Mercado Pago? Você não poderá receber pagamentos online até conectar novamente.")) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/auth/mercadopago/disconnect", {
        method: "POST",
        headers: { "x-tenant-slug": tenant.slug }
      });
      if (res.ok) {
        toast({ title: "Desconectado", description: "Sua conta foi desconectada com sucesso." });
        fetchSettings();
      }
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao desconectar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast({ title: "Sucesso", description: "Configurações salvas no banco de dados." });
        // RE-FETCH AFTER POST
        await fetchSettings();
      } else {
        // Fallback para DemoStore mesmo em erro da API
        DemoStore.saveSettings(settings);
        toast({ title: "Aviso", description: "Salvo localmente no navegador." });
      }
    } catch (e) {
      DemoStore.saveSettings(settings);
      toast({ title: "Aviso", description: "Salvo no navegador (Erro de conexão)." });
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
            <Settings className="w-8 h-8 text-primary" /> Configurações
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
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${settings.subscriptionStatus === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
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
              onCheckedChange={(val) => setSettings({ ...settings, isPointsEnabled: val })}
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
                    onChange={(e) => setSettings({ ...settings, pointsPerAppointment: parseInt(e.target.value) || 0 })}
                    className="text-lg font-medium"
                  />
                  <span className="text-muted-foreground">Pts</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-w-xs mt-4">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Pontos Iniciais (Boas-vindas)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    value={settings.initialPoints || 0}
                    onChange={(e) => setSettings({ ...settings, initialPoints: parseInt(e.target.value) || 0 })}
                    className="text-lg font-medium"
                  />
                  <span className="text-muted-foreground">Pts</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Pontos atribuídos automaticamente ao criar a conta.</p>
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
                onChange={(e) => setSettings({ ...settings, cancellationWindowDays: parseInt(e.target.value) || 0 })}
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
                  setSettings({ ...settings, slotInterval: newInterval });

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
              <CardDescription>Configure os horários de atendimento para cada dia da semana.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {Object.entries({
                monday: "Segunda-feira",
                tuesday: "Terça-feira",
                wednesday: "Quarta-feira",
                thursday: "Quinta-feira",
                friday: "Sexta-feira",
                saturday: "Sábado",
                sunday: "Domingo"
              }).map(([day, label]) => {
                const dayConfig = (settings as any).weeklyHours?.[day] || { start: "09:00", end: "18:00", active: true };

                return (
                  <div key={day} className={`p-4 rounded-lg border transition-all ${dayConfig.active ? 'bg-accent/30 border-border/50' : 'bg-muted/30 border-dashed opacity-60'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-40">
                        <Switch
                          checked={dayConfig.active}
                          onCheckedChange={(val) => {
                            const newWeekly = { ...((settings as any).weeklyHours || {}), [day]: { ...dayConfig, active: val } };
                            setSettings({ ...settings, weeklyHours: newWeekly } as any);
                          }}
                        />
                        <span className={`font-medium ${dayConfig.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{label}</span>
                      </div>

                      {dayConfig.active && (
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Início</span>
                            <Select
                              value={dayConfig.start}
                              onValueChange={(val) => {
                                const newWeekly = { ...((settings as any).weeklyHours || {}), [day]: { ...dayConfig, start: val } };
                                setSettings({ ...settings, weeklyHours: newWeekly } as any);
                              }}
                            >
                              <SelectTrigger className="w-[100px] h-9 text-xs">
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
                              value={dayConfig.end}
                              onValueChange={(val) => {
                                const newWeekly = { ...((settings as any).weeklyHours || {}), [day]: { ...dayConfig, end: val } };
                                setSettings({ ...settings, weeklyHours: newWeekly } as any);
                              }}
                            >
                              <SelectTrigger className="w-[100px] h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {generateTimeOptions()
                                  .filter(t => t > dayConfig.start)
                                  .map(time => (
                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      {!dayConfig.active && (
                        <div className="flex-1 text-right italic text-xs text-muted-foreground">
                          Fechado / Não haverá agendamentos
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground italic mt-4 bg-muted/50 p-3 rounded border border-dashed border-border">
              Configurando horários por dia da semana garantimos que o cliente veja apenas os horários reais disponíveis no momento do agendamento.
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-card border-border/50 shadow-lg border-l-4 ${settings.mpConnected ? 'border-l-green-500' : 'border-l-blue-500'}`}>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.mpConnected ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
              <Wallet className={`w-5 h-5 ${settings.mpConnected ? 'text-green-500' : 'text-blue-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>Integração com Mercado Pago</CardTitle>
                {settings.mpConnected && (
                  <span className="bg-green-500/20 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Conectado</span>
                )}
              </div>
              <CardDescription>Receba pagamentos via PIX e Cartão de Crédito.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!settings.mpConnected ? (
              <>
                {settings.mpConnectionError ? (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex gap-3 animate-in shake-1 duration-500">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-bold">Atenção: Conta Desconectada</p>
                      <p className="opacity-90">{settings.mpConnectionError}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-700 flex gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>É necessário conectar sua conta do Mercado Pago para poder receber dos clientes no momento do agendamento online.</p>
                  </div>
                )}
                <Button 
                  className="w-full gap-2 bg-[#009EE3] hover:bg-[#007EB5] text-white border-none shadow-md"
                  onClick={handleConnectMP}
                  disabled={connectingMP}
                >
                  {connectingMP ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  {settings.mpConnectionError ? "Reconectar Conta" : "Conectar sua conta do Mercado Pago"}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-sm text-green-700">
                  <p className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="w-4 h-4" /> Sua conta está vinculada com sucesso.
                  </p>
                  <p className="mt-1 opacity-80 text-xs">Os pagamentos dos seus clientes cairão diretamente na sua conta do Mercado Pago.</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-destructive/20 text-destructive hover:bg-destructive/5"
                  onClick={handleDisconnectMP}
                >
                  Desconectar Conta
                </Button>
              </div>
            )}
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
              onCheckedChange={(val) => setSettings({ ...settings, isPrepaymentRequired: val })}
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
