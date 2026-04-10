"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoStore } from "@/lib/persistence/demo-store";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, ChevronRight, Clock, CreditCard, User, Scissors, Wallet, UserPlus, ArrowRight } from "lucide-react";
import {
  useListServices,
  useGetAvailability,
  useCreateCheckout,
  useConfirmAppointment,
  getGetAvailabilityQueryKey,
} from "@workspace/api-client-react";
import type { Service, TimeSlot } from "@workspace/api-client-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatCurrencyFromCents } from "@/lib/format";

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const rescheduleId = searchParams.get("reschedule");
  const preSelectedServiceId = searchParams.get("serviceId");

  const [step, setStep] = useState(rescheduleId ? 2 : 1);
  const [settings, setSettings] = useState<any>(null);
  const [isLogged, setIsLogged] = useState(false);

  const timeSectionRef = useRef<HTMLDivElement>(null);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "", phone: "" });
  const [cardInfo, setCardInfo] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [paymentMethod, setPaymentMethod] = useState<"card" | "local">("local");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPrePaid, setIsPrePaid] = useState(false);
  const [mpPublicKey, setMpPublicKey] = useState<string>("");
  const [mpPaymentToken, setMpPaymentToken] = useState<string | null>(null);

  const { data: services, isLoading: isLoadingServices } = useListServices();

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then(res => res.json()),
      fetch("/api/auth/me").then(res => res.json())
    ]).then(([settingsData, authData]) => {
      // Sincronizar configurações
      setSettings(settingsData);
      DemoStore.saveSettings(settingsData);
      setMpPublicKey(settingsData.mpPublicKey || "");

      // Definir método de pagamento inicial baseado nas configurações
      if (settingsData.isPrepaymentRequired) {
        setPaymentMethod("card");
      } else {
        setPaymentMethod("local");
      }

      // Sincronizar autenticação
      const savedUser = DemoStore.getUser();
      if (authData.authenticated) {
        setIsLogged(true);
        const phone = authData.user.phone || savedUser?.phone || "";
        setCustomerInfo({
          name: authData.user.name,
          email: authData.user.email,
          phone: phone ? formatPhone(phone) : ""
        });
        // Sincronizar dados da API com o DemoStore
        DemoStore.saveUser({ ...savedUser, ...authData.user, phone });
      } else if (savedUser) {
        setIsLogged(true);
        setCustomerInfo({
          name: savedUser.name,
          email: savedUser.email,
          phone: savedUser.phone ? formatPhone(savedUser.phone) : ""
        });
      }

      if (preSelectedServiceId && services) {
        const service = services.find(s => s.id === parseInt(preSelectedServiceId));
        if (service) setSelectedService(service);
      }
    }).catch(() => {
      // Fallback para configurações salvas se API falhar
      const savedSettings = DemoStore.getSettings();
      if (savedSettings) setSettings(savedSettings);
    });
  }, [services, preSelectedServiceId]);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const { data: availability, isLoading: isLoadingAvailability } = useGetAvailability(
    { date: dateStr, serviceId: selectedService?.id || 0 },
    {
      query: {
        enabled: !!selectedDate && !!selectedService?.id,
        queryKey: getGetAvailabilityQueryKey({ date: dateStr, serviceId: selectedService?.id || 0 })
      }
    }
  );

  const createCheckout = useCreateCheckout();
  const confirmAppointment = useConfirmAppointment();

  const handleNextStep = () => setStep((s) => Math.min(s + 1, 5));
  const handlePrevStep = () => setStep((s) => {
    if (rescheduleId && s === 2) return s;
    return Math.max(s - 1, 1);
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

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedTime(null);
    handleNextStep();
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSelectedTime(null);

      // Scroll automático para horários no Mobile
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          timeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    handleNextStep();
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !customerInfo.name || !customerInfo.email) return;

    try {
      const result = await createCheckout.mutateAsync({
        data: {
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          serviceId: selectedService.id,
          appointmentDate: format(selectedDate, "yyyy-MM-dd"),
          appointmentTime: selectedTime,

          rescheduleId: rescheduleId ? parseInt(rescheduleId) : undefined
        } as any
      }) as any;
      setSessionId(result.sessionId);

      if (result.isPaid) {
        setIsPrePaid(true);
        // Se já está pago, não vai para o checkout, confirma direto
        handlePaymentSubmit(undefined, result.sessionId);
      } else {
        setIsPrePaid(false);
        handleNextStep();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a sessão de agendamento.",
        variant: "destructive"
      });
    }
  };

  const handlePaymentSubmit = async (e?: React.FormEvent, overrideSessionId?: string) => {
    if (e) e.preventDefault();
    const sid = overrideSessionId || sessionId;
    if (!sid) return;

    try {
      const appointment = await confirmAppointment.mutateAsync({
        data: {
          sessionId: sid,
          paymentMethodId: isPrePaid ? "pre_paid" : (paymentMethod === "card" ? "mercado_pago" : "offline_local"),

          mp_data: paymentMethod === "card" && !isPrePaid ? {
            token: mpPaymentToken || "mock_token_" + Math.random().toString(36).substr(2, 9),
            payment_method_id: "master",
            installments: 1,
            transaction_amount: selectedService?.price || 0,
            description: selectedService?.name,
            payer: { email: customerInfo.email }
          } : undefined
        } as any
      });

      toast({
        title: rescheduleId ? "Reagendado!" : "Sucesso!",
        description: rescheduleId
          ? "Sua reserva foi remarcada com sucesso."
          : "Seu agendamento foi confirmado.",
      });

      // Persistir localmente para fallback na Vercel (modo Demo)
      DemoStore.saveAppointment(appointment);

      router.push(`/confirmacao/${appointment.id}`);
    } catch (error) {
      toast({
        title: "Erro na confirmação",
        description: "Não foi possível confirmar o agendamento.",
        variant: "destructive"
      });
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.replace(/(\d{4})/g, "$1 ").trim();
    setCardInfo({ ...cardInfo, number: formatted });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardInfo({ ...cardInfo, expiry: value });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-center mb-4">
            {rescheduleId ? "Remarcar Horário" : "Agendar Horário"}
          </h1>
          {rescheduleId && (
            <p className="text-center text-muted-foreground mb-8">
              Você está alterando o horário do serviço: <strong className="text-primary">{selectedService?.name}</strong>
            </p>
          )}

          { }
          <div className="flex items-center justify-between relative mt-10">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border z-0"></div>
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            ></div>

            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-medium border-2 transition-colors
                  ${step > s ? 'bg-primary border-primary text-primary-foreground' :
                    step === s ? 'bg-background border-primary text-primary' :
                      'bg-background border-border text-muted-foreground'}`}
              >
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-lg p-6 shadow-xl">
          { }
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-serif font-semibold">Escolha o Serviço</h2>
              {isLoadingServices ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services?.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => handleServiceSelect(service)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50
                        ${selectedService?.id === service.id ? 'border-primary bg-primary/5' : 'border-border/50 bg-background'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-lg">{service.name}</h3>
                        <span className="text-primary font-medium">{formatCurrencyFromCents(service.price)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{service.description}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" /> {service.durationMinutes} min
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          { }
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold text-foreground">Data e Horário</h2>
                {!rescheduleId && <Button variant="ghost" size="sm" onClick={handlePrevStep}>Voltar</Button>}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-3">
                  <Label className="mb-4 block text-lg font-medium text-foreground">1. Selecione a data</Label>
                  <div className="border border-border/50 rounded-xl p-4 w-full bg-background shadow-sm">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      locale={ptBR}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date.getDay() === 0) return true;
                        if (date < today) return true;
                        return false;
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2" ref={timeSectionRef}>
                  <Label className="mb-4 block text-lg font-medium text-foreground">2. Escolha o horário</Label>
                  {isLoadingAvailability ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
                    </div>
                  ) : !selectedDate ? (
                    <div className="text-center p-10 border border-dashed rounded-xl text-muted-foreground bg-accent/5">
                      Por favor, selecione uma data primeiro.
                    </div>
                  ) : availability?.length === 0 ? (
                    <div className="text-center p-10 border border-dashed rounded-xl text-muted-foreground bg-accent/5">
                      Nenhum horário disponível nesta data.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(() => {
                        const todayStr = format(new Date(), "yyyy-MM-dd");
                        const isToday = dateStr === todayStr;
                        const currentTime = format(new Date(), "HH:mm");

                        return availability?.map((slot: TimeSlot) => {
                          const isPast = isToday && slot.time <= currentTime;
                          const isDisabled = !slot.available || isPast;

                          return (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? "default" : "outline"}
                              className={`h-12 text-base font-medium transition-all ${isDisabled
                                ? "opacity-60 cursor-not-allowed bg-muted border-dashed text-muted-foreground"
                                : "hover:border-primary hover:text-primary active:scale-95 text-foreground"
                                }`}
                              disabled={isDisabled}
                              onClick={() => handleTimeSelect(slot.time)}
                            >
                              {slot.time}
                            </Button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          { }
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold text-foreground">Seus Dados</h2>
                <Button variant="ghost" size="sm" onClick={handlePrevStep}>Voltar</Button>
              </div>

              {!isLogged && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between mb-4">
                  <p className="text-sm text-foreground">Já possui uma conta? Entre para agendar mais rápido.</p>
                  <Button variant="link" asChild className="p-0 text-primary h-auto"><Link href="/login">Entrar</Link></Button>
                </div>
              )}

              <form onSubmit={handleInfoSubmit} className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    required
                    value={customerInfo.name}
                    onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="João Silva"
                    disabled={isLogged}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={customerInfo.email}
                    onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    placeholder="joao@exemplo.com"
                    disabled={isLogged}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    required
                    value={customerInfo.phone}
                    onChange={e => setCustomerInfo({ ...customerInfo, phone: formatPhone(e.target.value) })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full mt-6"
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? "Processando..." : (settings?.isPrepaymentRequired ? "Ir para Pagamento" : "Confirmar Agendamento")}
                  {!createCheckout.isPending && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </div>
          )}

          { }
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold text-foreground">
                  {isPrePaid ? "Confirmar Remarcação" : "Pagamento"}
                </h2>
                <Button variant="ghost" size="sm" onClick={handlePrevStep} disabled={confirmAppointment.isPending}>Voltar</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                { }
                <div className="bg-background rounded-lg p-6 border border-border/50 h-fit">
                  <h3 className="font-medium text-lg mb-4 text-foreground">Resumo do Agendamento</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-2"><Scissors className="w-4 h-4" /> Serviço</span>
                      <span className="font-medium text-right text-foreground">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Data e Hora</span>
                      <span className="font-medium text-right text-foreground">
                        {selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                      </span>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center text-lg font-serif">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary font-bold">{formatCurrencyFromCents(selectedService?.price)}</span>
                  </div>
                  {isPrePaid && (
                    <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Pagamento já realizado anteriormente
                    </div>
                  )}
                </div>


                {isPrePaid ? (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-lg">Tudo pronto!</CardTitle>
                      <CardDescription>
                        Como seu agendamento original já estava pago, não há custo adicional para esta remarcação.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 text-sm text-muted-foreground">
                        <p>Ao confirmar, o horário anterior será liberado automaticamente.</p>
                      </div>
                      <Button onClick={() => handlePaymentSubmit()} className="w-full mt-6 h-12 text-lg" disabled={confirmAppointment.isPending}>
                        {confirmAppointment.isPending ? "Confirmando..." : "Confirmar Nova Data"}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border">
                    <CardContent className="pt-6">
                      <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                        <TabsList className="grid w-full mb-6 grid-cols-2">
                          <TabsTrigger value="card" className="gap-2">
                            <CreditCard className="w-4 h-4" /> Online
                          </TabsTrigger>
                          <TabsTrigger value="local" className="gap-2">
                            <Wallet className="w-4 h-4" /> No Local
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="card" className="space-y-4">
                          {mpPublicKey ? (
                            <div className="p-8 border border-dashed rounded-lg text-center bg-muted/50">
                              <p className="text-sm font-medium mb-2">Mercado Pago Card Brick Placeholder</p>
                              <p className="text-xs text-muted-foreground">O componente CardPayment Brick seria renderizado aqui usando a chave: {mpPublicKey}</p>
                              { }
                              <Button variant="outline" size="sm" className="mt-4" onClick={() => setMpPaymentToken("mock_token_123")}>
                                {mpPaymentToken ? "Cartão Validado ✓" : "Simular Validação de Cartão"}
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="cardName">Nome no Cartão</Label>
                                <Input id="cardName" required value={cardInfo.name} onChange={e => setCardInfo({ ...cardInfo, name: e.target.value.toUpperCase() })} placeholder="JOÃO M SILVA" />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="cardNumber">Número do Cartão</Label>
                                <Input id="cardNumber" required value={cardInfo.number} onChange={handleCardNumberChange} placeholder="0000 0000 0000 0000" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="expiry">Validade</Label>
                                  <Input id="expiry" required value={cardInfo.expiry} onChange={handleExpiryChange} placeholder="MM/AA" />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="cvv">CVV</Label>
                                  <Input id="cvv" required maxLength={3} value={cardInfo.cvv} onChange={e => setCardInfo({ ...cardInfo, cvv: e.target.value.replace(/\D/g, "") })} placeholder="123" type="password" />
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="local" className="space-y-4 py-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border mb-4">
                              <p className="text-sm font-medium">Você pagará diretamente na barbearia.</p>
                              <p className="text-xs text-muted-foreground mt-1 text-foreground">Aceitamos Dinheiro, Pix e Cartão de Débito/Crédito.</p>
                            </div>
                          </TabsContent>

                        <Button
                          onClick={() => handlePaymentSubmit()}
                          className="w-full mt-6 h-12 text-lg bg-[#EAB308] hover:bg-[#CA8A04] text-black font-bold shadow-lg transition-all active:scale-95"
                          disabled={
                            confirmAppointment.isPending ||
                            (paymentMethod === "card" && !isPrePaid && (
                              !cardInfo.name ||
                              cardInfo.number.replace(/\s/g, "").length < 16 ||
                              cardInfo.expiry.length < 5 ||
                              cardInfo.cvv.length < 3
                            ))
                          }
                        >
                          {confirmAppointment.isPending ? "Confirmando..." : (paymentMethod === "card" ? `Pagar ${formatCurrencyFromCents(selectedService?.price)}` : "Finalizar Agendamento")}
                        </Button>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function BookingClient() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-24 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <BookingContent />
    </Suspense>
  );
}
