"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ShieldCheck, CalendarClock, CreditCard, Clock, Settings, ExternalLink, Ticket, Wallet, AlertCircle, LayoutGrid, QrCode, Copy, Check, Instagram, Facebook, MessageCircle, Send, Share2 } from "lucide-react";
import Link from "next/link";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useTenant } from "@/hooks/use-tenant";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatDateBR, formatCurrencyFromCents } from "@/lib/format";
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
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [settings, setSettings] = useState<any>({
    isPointsEnabled: true,
    cancellationWindowDays: 2,
    isPrepaymentRequired: true,
    businessStartTime: "09:00",
    businessEndTime: "18:00",
    slotInterval: 45,
    subscriptionExpiresAt: null,
    plan: null,
    isSubscriptionActive: true,
    stripeCustomerId: null,
    pointsPerAppointment: 50,
    initialPoints: 0,
    mpConnected: false,
    mpPublicKey: "",
    mpConnectionError: null
  });
  const [copied, setCopied] = useState(false);

  const getLink = (path: string) => `/${tenant?.slug}${path}`;

  const fetchSettings = async () => {
    try {
      const headers = { "x-tenant-slug": tenant.slug };
      const res = await fetch("/api/settings", { headers });
      const data = await res.json();
      setSettings(data);
      DemoStore.saveSettings(data);
    } catch (error) {
      const saved = DemoStore.getSettings();
      if (saved) setSettings(saved);
    } finally {
      setLoading(false);
    }
  };

  const handleManageStripe = async (targetPlanId?: string) => {
    setLoadingStripe(true);
    try {
      // Se já tem customer ID, vai para o Portal. Se não, vai para o Checkout com o plano solicitado ou atual.
      const endpoint = settings.stripeCustomerId 
        ? "/api/subscription/portal" 
        : "/api/subscription/checkout";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-tenant-slug": tenant.slug 
        },
        body: JSON.stringify({ 
          planId: targetPlanId || settings.plan?.slug || "basico" 
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ 
          title: "Erro", 
          description: data.error || "Falha ao gerar acesso ao Stripe.", 
          variant: "destructive" 
        });
      }
    } catch (e) {
      toast({ title: "Erro", description: "Erro de conexão com o servidor.", variant: "destructive" });
    } finally {
      setLoadingStripe(false);
    }
  };

  useEffect(() => {
    if (tenant?.slug) {
      fetchSettings();
    }

    const params = new URLSearchParams(window.location.search);
    
    // Tratamento de Upgrade Automático
    const upgradePlan = params.get("upgrade");
    if (upgradePlan && !loading && settings.plan) {
      // Pequeno delay para garantir que tudo carregou e evitar loops
      const timer = setTimeout(() => {
        handleManageStripe(upgradePlan);
        // Limpa a URL
        window.history.replaceState({}, '', window.location.pathname);
      }, 500);
      return () => clearTimeout(timer);
    }

    if (params.get("mp_success") === "true") {
      toast({ title: "Sucesso!", description: "Sua conta do Mercado Pago foi conectada com sucesso." });
      window.history.replaceState({}, '', window.location.pathname);
    }
    const mpError = params.get("mp_error");
    if (mpError) {
      toast({ title: "Erro na conexão", description: decodeURIComponent(mpError), variant: "destructive" });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [tenant, loading]); // Adicionado loading como dependência para o upgrade automático

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
        await fetchSettings();
      } else {
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

  const bookingUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/${tenant.slug}/booking` 
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link Copiado!", description: "O link de agendamento está pronto para ser compartilhado." });
  };

  const handleSocialShare = (platform: string) => {
    const text = `Agende seu horário na barbearia ${tenant.name} pelo nosso portal online!`;
    let url = "";

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + bookingUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookingUrl)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(bookingUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'instagram':
        handleCopyLink();
        toast({ title: "Dica de Instagram", description: "O link foi copiado! Agora cole-o na Bio do seu perfil." });
        return;
    }

    if (url) window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    const text = `Agende seu horário na barbearia ${tenant.name} pelo nosso portal online! \n\nLink: ${bookingUrl}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(bookingUrl)}&bgcolor=ffffff&color=000000&margin=20`;
    
    if (navigator.share) {
      try {
        // Tentar baixar a imagem para compartilhar como arquivo
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const file = new File([blob], `agendamento-${tenant.slug}.png`, { type: 'image/png' });

        const shareData: ShareData = {
          title: `Agendamento - ${tenant.name}`,
          text: text,
          url: bookingUrl,
        };

        // Verificar se o navegador suporta compartilhar arquivos
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }

        await navigator.share(shareData);
      } catch (err) {
        // Fallback se o fetch ou a inclusão do arquivo falhar
        try {
          await navigator.share({
            title: `Agendamento - ${tenant.name}`,
            text: text,
            url: bookingUrl,
          });
        } catch (e) {
          // Usuário cancelou
        }
      }
    } else {
      handleCopyLink();
      toast({ 
        title: "Link Copiado", 
        description: "Seu navegador não suporta o menu de compartilhamento, por isso copiamos o link para você.",
        variant: "default"
      });
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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href={getLink("/admin")} className="hover:text-primary flex items-center gap-1 transition-colors">
            <LayoutGrid className="w-4 h-4" /> Painel
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Configurações</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
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
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Minha Assinatura</CardTitle>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${settings.isSubscriptionActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {settings.isSubscriptionActive ? 'Ativa' : 'Inativa/Vencida'}
                </div>
                {settings.plan && (
                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary">
                    Plano {settings.plan.name}
                  </div>
                )}
              </div>
              <CardDescription>Gerencie seu plano e pagamentos do KingBarber.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-accent/50 border border-border/40">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Próximo Vencimento</p>
                <p className="text-lg font-bold text-foreground">
                  {settings.subscriptionExpiresAt ? formatDateBR(settings.subscriptionExpiresAt) : 'N/D'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-accent/50 border border-border/40">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Valor Mensal</p>
                <p className="text-lg font-bold text-foreground">
                  {settings.plan ? formatCurrencyFromCents(settings.plan.price * 100) : 'R$ 0,00'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full gap-2 hover:bg-primary hover:text-white transition-all shadow-md active:scale-95"
              onClick={handleManageStripe}
              disabled={loadingStripe}
            >
              {loadingStripe ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {settings.stripeCustomerId ? 'Gerenciar Assinatura (Stripe)' : 'Ativar Assinatura Online'} 
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {settings.plan?.slug !== 'basico' && (
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
                      value={settings.pointsPerAppointment === 0 ? "0" : settings.pointsPerAppointment.toString().replace(/^0+/, '') || "0"}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/^0+/, ''), 10);
                        setSettings({ ...settings, pointsPerAppointment: isNaN(val) ? 0 : val });
                      }}
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
                      value={settings.initialPoints === 0 ? "0" : settings.initialPoints.toString().replace(/^0+/, '') || "0"}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/^0+/, ''), 10);
                        setSettings({ ...settings, initialPoints: isNaN(val) ? 0 : val });
                      }}
                      className="text-lg font-medium"
                    />
                    <span className="text-muted-foreground">Pts</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Pontos atribuídos automaticamente ao criar a conta.</p>
                </div>
              </CardContent>
            )}
          </Card>
        )}

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
                value={settings.cancellationWindowDays === 0 ? "0" : settings.cancellationWindowDays.toString().replace(/^0+/, '') || "0"}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/^0+/, ''), 10);
                  setSettings({ ...settings, cancellationWindowDays: isNaN(val) ? 0 : val });
                }}
                className="text-lg font-medium"
              />
              <span className="text-muted-foreground">Dias</span>
            </div>
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
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    Sua barbearia já está conectada com o Mercado Pago e você já pode receber pagamentos dos clientes online!
                  </p>
                  <p className="mt-1 opacity-80 text-xs pl-7">Tudo pronto! Seus recebimentos cairão diretamente na sua conta digital vinculada.</p>
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

        <Card className="bg-card border-border/50 shadow-lg overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>Divulgação</CardTitle>
              <CardDescription>Compartilhe o link ou QR Code nas redes sociais.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col items-center py-6">
            <div className="p-4 bg-white rounded-2xl shadow-inner border border-muted/30">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bookingUrl)}&bgcolor=ffffff&color=000000&margin=10`} 
                alt="QR Code Agendamento"
                className="w-[180px] h-[180px]"
              />
            </div>

            <div className="flex gap-4 w-full justify-center">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full border-green-500/30 text-green-600 hover:bg-green-50"
                onClick={() => handleSocialShare('whatsapp')}
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full border-blue-600/30 text-blue-600 hover:bg-blue-50"
                onClick={() => handleSocialShare('facebook')}
              >
                <Facebook className="w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full border-pink-600/30 text-pink-600 hover:bg-pink-50"
                onClick={() => handleSocialShare('instagram')}
              >
                <Instagram className="w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full border-sky-500/30 text-sky-500 hover:bg-sky-50"
                onClick={() => handleSocialShare('telegram')}
              >
                <Send className="w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full border-primary/30 text-primary hover:bg-primary/5"
                onClick={handleNativeShare}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="w-full space-y-2">
              <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Link da sua Barbearia Online</Label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted/50 border rounded-lg text-sm font-medium truncate text-muted-foreground select-all">
                  {bookingUrl}
                </div>
                <Button 
                  size="icon" 
                  variant={copied ? "ghost" : "outline"}
                  onClick={handleCopyLink}
                  className={`shrink-0 transition-all ${copied ? 'text-green-500' : 'hover:border-primary hover:text-primary'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic text-center">
                Dica: Imprima este QR Code e coloque no seu balcão ou vitrine.
              </p>
            </div>
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
