"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Mail, Bell, ShieldCheck, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ClientSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    notificationsEnabled: true,
  });

  const formatPhone = (value: string) => {
    let raw = value.replace(/\D/g, "");
    if (raw.length > 11) raw = raw.slice(0, 11);

    if (raw.length === 0) return "";
    if (raw.length <= 2) return `(${raw}`;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  useEffect(() => {
    fetch("/api/user/profile")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setProfile({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone ? formatPhone(data.phone) : "",
            notificationsEnabled: data.notificationsEnabled ?? true,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar seu perfil", variant: "destructive" });
        setLoading(false);
      });
  }, [router, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Remover máscara antes de salvar no banco
      const rawPhone = profile.phone.replace(/\D/g, "");

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          phone: rawPhone
        }),
      });

      if (res.ok) {
        toast({ title: "Sucesso", description: "Configurações atualizadas com sucesso!" });
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
      <Layout>
        <div className="container mx-auto px-4 py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground flex items-center gap-3">
              <User className="w-8 h-8 text-primary" /> Minhas Configurações
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
                  <CardTitle>Dados do Perfil</CardTitle>
                  <CardDescription>Mantenha suas informações de contato atualizadas.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Seu nome"
                    className="bg-background/50 border-border/60 focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase font-bold tracking-wider text-muted-foreground">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="pl-10 bg-accent/30 border-border/40 text-muted-foreground cursor-not-allowed italic"
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone" className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Telefone / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      className="pl-10 bg-background/50 border-border/60 focus:border-primary/50 transition-all"
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
                    <p className="text-sm font-medium">Lembretes e Confirmações</p>
                    <p className="text-xs text-muted-foreground">
                      Você receberá e-mails automáticos com detalhes do seu horário, confirmações de pagamento e alertas de cancelamento.
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
                Seus dados são protegidos e utilizados apenas para a gestão de seus agendamentos na unidade Barbearia Premium.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
