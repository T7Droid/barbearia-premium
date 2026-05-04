"use client";

import { useEffect, useState } from "react";
import { User, Mail, Phone, Bell, ShieldCheck, Save, Loader2, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { useUserStore } from "@/lib/store/user-store";
import { supabase } from "@/lib/supabase";
import { requestNotificationPermission } from "@/lib/firebase";

export default function SettingsPage() {
  const { toast } = useToast();
  const tenant = useTenant();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    notificationsEnabled: false,
    pushNotificationsEnabled: false,
    fcmToken: ""
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return;
      
      try {
        if (!supabase) throw new Error("Supabase not configured");
        
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setProfile({
            fullName: data.full_name || "",
            email: data.email || "",
            phone: data.phone || "",
            notificationsEnabled: data.notifications_enabled ?? false,
            pushNotificationsEnabled: data.push_notifications_enabled ?? false,
            fcmToken: data.fcm_token || ""
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      if (!supabase) throw new Error("Supabase not configured");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.fullName,
          phone: profile.phone,
          notifications_enabled: profile.notificationsEnabled,
          push_notifications_enabled: profile.pushNotificationsEnabled,
          fcm_token: profile.fcmToken,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "Suas preferências foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar suas configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-24 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse text-sm">Carregando suas preferências...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-primary" /> Minhas Configurações
            </h1>
            <p className="text-muted-foreground mt-2">Gerencie seus dados pessoais e preferências de contato.</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="h-11 px-8 gap-2 shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Personal Info */}
          <Card className="bg-card border-border/50 shadow-xl overflow-hidden transition-all hover:border-primary/20">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 to-primary/10" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>Seus dados básicos de contato.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                  <Input 
                    id="fullName" 
                    value={profile.fullName} 
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="bg-accent/30 border-border/50 focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</Label>
                  <Input 
                    id="email" 
                    value={profile.email} 
                    disabled 
                    className="bg-accent/10 border-dashed border-border/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp / Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      value={profile.phone} 
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="pl-10 bg-accent/30 border-border/50 focus:border-primary/50"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="bg-card border-border/50 shadow-xl transition-all hover:border-primary/20">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <CardTitle>Comunicações por E-mail</CardTitle>
                <CardDescription>Escolha como deseja ser avisado sobre seus agendamentos.</CardDescription>
              </div>
              <Switch
                checked={profile.notificationsEnabled}
                onCheckedChange={(val) => setProfile({ ...profile, notificationsEnabled: val })}
                className="data-[state=checked]:bg-primary"
              />
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-accent/30 border border-border/40">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-primary mt-1 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Alertas de Agendamento</p>
                    <p className="text-xs text-muted-foreground">
                      Você receberá e-mails automáticos com detalhes do seu horário, confirmações de pagamento e alertas de cancelamento.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card className="bg-card border-border/50 shadow-xl transition-all hover:border-primary/20">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <CardTitle>Notificações Push</CardTitle>
                <CardDescription>Receba alertas instantâneos no seu navegador ou celular.</CardDescription>
              </div>
              <Switch
                checked={profile.pushNotificationsEnabled}
                onCheckedChange={async (val) => {
                  if (val) {
                    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied") {
                      toast({
                        title: "Acesso Bloqueado",
                        description: "Para ativar, você precisa ir nas configurações do seu navegador e permitir as notificações.",
                        variant: "destructive"
                      });
                      return;
                    }

                    const token = await requestNotificationPermission();
                    if (token) {
                      setProfile({ 
                        ...profile, 
                        pushNotificationsEnabled: true,
                        fcmToken: token 
                      });
                    } else {
                      if (Notification.permission !== "granted") {
                        toast({
                          title: "Permissão Necessária",
                          description: "Você precisa permitir as notificações no diálogo que aparece no navegador.",
                          variant: "destructive"
                        });
                      }
                    }
                  } else {
                    setProfile({ ...profile, pushNotificationsEnabled: false });
                  }
                }}
                className="data-[state=checked]:bg-primary"
              />
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-accent/30 border border-border/40">
                <div className="flex items-start gap-3">
                  <Bell className="w-4 h-4 text-primary mt-1 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Lembretes e Confirmações</p>
                    <p className="text-xs text-muted-foreground">
                      Você receberá notificações instantâneas com detalhes do seu horário e alertas de cancelamento diretamente no seu dispositivo.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Note */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex gap-4 text-sm text-foreground">
            <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">Privacidade & Segurança</p>
              <p className="text-muted-foreground leading-relaxed italic">
                Seus dados são protegidos e utilizados apenas para a gestão de seus agendamentos na unidade {tenant?.name}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
