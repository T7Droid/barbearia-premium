"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
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
import { useTenant } from "@/hooks/use-tenant";
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

export interface Barber {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  active: boolean;
}
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatCurrencyFromCents } from "@/lib/format";
import { Copy, QrCode, Check } from "lucide-react";

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Obter contexto do tenant
  const tenant = useTenant();

  const rescheduleId = searchParams.get("reschedule");
  const preSelectedServiceId = searchParams.get("serviceId");

  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<any>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const timeSectionRef = useRef<HTMLDivElement>(null);

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(true);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "", phone: "", cpf: "" });
  const [pixData, setPixData] = useState<any>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [cardInfo, setCardInfo] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [paymentMethod, setPaymentMethod] = useState<"card" | "local">("card");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPrePaid, setIsPrePaid] = useState(false);
  const [mpPublicKey, setMpPublicKey] = useState<string>("");
  const [mpPaymentToken, setMpPaymentToken] = useState<string | null>(null);
  const [mpPaymentData, setMpPaymentData] = useState<any>(null);
  const [busyDates, setBusyDates] = useState<string[]>([]);
  const [isMpLoaded, setIsMpLoaded] = useState(typeof window !== "undefined" && !!(window as any).MercadoPago);
  const paymentSubmitRef = useRef<any>(null);

  const { data: services, isLoading: isLoadingServices } = useListServices();

  useEffect(() => {
    Promise.all([
      fetch(`/api/settings?t=${Date.now()}`).then(res => res.json()),
      fetch("/api/auth/me").then(res => res.json()),
      fetch("/api/barbers").then(res => res.json())
    ]).then(([settingsData, authData, barbersData]) => {
      console.log("DEBUG: Configurações carregadas da API:", settingsData);

      // Sincronizar barbeiros
      if (Array.isArray(barbersData)) {
        setBarbers(barbersData);
      }
      setIsLoadingBarbers(false);

      // Sincronizar configurações
      setSettings(settingsData);
      DemoStore.saveSettings(settingsData);

      const publicKey = settingsData.mpPublicKey || "";
      console.log("DEBUG: Definindo mpPublicKey como:", publicKey);
      setMpPublicKey(publicKey);

      // Definir método de pagamento inicial baseado nas configurações
      if (!settingsData.isPrepaymentRequired) {
        setPaymentMethod("local");
      }

      // Sincronizar autenticação
      const savedUser = DemoStore.getUser();
      if (authData.authenticated) {
        setIsLogged(true);
        setCurrentUser(authData.user);
        const phone = authData.user.phone || savedUser?.phone || "";
        
        setCustomerInfo(prev => ({
          ...prev,
          name: authData.user.name || prev.name,
          email: authData.user.email || prev.email,
          phone: prev.phone || (phone ? formatPhone(phone) : "")
        }));
        
        // Sincronizar dados da API com o DemoStore
        DemoStore.saveUser({ ...savedUser, ...authData.user, phone });
      } else if (savedUser) {
        setIsLogged(true);
        setCurrentUser(savedUser); // Garantir que o estado do usuário logado seja restaurado
        setCustomerInfo(prev => ({
          ...prev,
          name: savedUser.name || prev.name,
          email: savedUser.email || prev.email,
          phone: prev.phone || (savedUser.phone ? formatPhone(savedUser.phone) : "")
        }));
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

  useEffect(() => {
    // Buscar dias ocupados/fechados para os próximos 2 meses
    const start = format(new Date(), "yyyy-MM-dd");
    const end = format(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

    fetch(`/api/availability/busy-dates?start=${start}&end=${end}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBusyDates(data);
      })
      .catch(err => console.error("Error fetching busy dates:", err));
  }, []);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const { data: availability, isLoading: isLoadingAvailability } = useGetAvailability(
    { date: dateStr, serviceId: selectedService?.id || 0, barberId: selectedBarber?.id as any },
    {
      query: {
        enabled: !!selectedDate && !!selectedService?.id && !!selectedBarber?.id,
        queryKey: getGetAvailabilityQueryKey({ date: dateStr, serviceId: selectedService?.id || 0, barberId: selectedBarber?.id as any })
      }
    }
  );

  // Update ref to latest handlePaymentSubmit to avoid stale closures in useEffect
  useEffect(() => {
    paymentSubmitRef.current = handlePaymentSubmit;
  }, [sessionId, mpPaymentToken, mpPaymentData, isPrePaid, paymentMethod, selectedService, customerInfo]);

  useEffect(() => {
    // Only proceed if all requirements are met
    if (!isMpLoaded || !mpPublicKey || step !== 5 || paymentMethod !== "card" || isPrePaid) {
      console.log("DEBUG: MP Brick não inicializou. Razões:", {
        isMpLoaded,
        hasMpKey: !!mpPublicKey,
        step,
        paymentMethod,
        isPrePaid
      });
      return;
    }

    let cardPaymentBrickController: any = null;

    const initCardBrick = async () => {
      const amount = (selectedService?.price || 0) / 100;
      const email = customerInfo.email;

      console.log("DEBUG: Mercado Pago Initialization Config:", {
        amount,
        email,
        publicKey: mpPublicKey?.substring(0, 10) + "...",
        service: selectedService?.name
      });

      if (amount <= 0) {
        console.error("DEBUG: Valor inválido para o Mercado Pago:", amount);
        return;
      }

      try {
        const mp = new (window as any).MercadoPago(mpPublicKey, {
          locale: 'pt-BR'
        });
        const bricksBuilder = mp.bricks();

        cardPaymentBrickController = await bricksBuilder.create(
          'cardPayment',
          'cardPaymentBrick_container',
          {
            initialization: {
              amount: (selectedService?.price || 0) / 100,
              payer: { email: customerInfo.email },
            },
            customization: {
              visual: { style: { theme: 'dark' } },
            },
            callbacks: {
              onReady: () => console.log("Card Brick Ready"),
              onSubmit: (formData: any) => {
                return new Promise(async (resolve, reject) => {
                  try {
                    console.log("Card Brick Submit", formData);
                    setMpPaymentData(formData);
                    setMpPaymentToken(formData.token);

                    if (paymentSubmitRef.current) {
                      await paymentSubmitRef.current(undefined, undefined, formData);
                      resolve();
                    } else {
                      reject();
                    }
                  } catch (error) {
                    console.error("Erro ao processar onSubmit do Brick:", error);
                    // Rejeitar faz o botão ser reativado no formulário do Mercado Pago
                    reject();
                  }
                });
              },
              onError: (error: any) => {
                console.error("Card Brick Error Detail:", error);
                // Tenta extrair mais informações se o erro for um objeto vazio {}
                if (error && Object.keys(error).length === 0) {
                  console.warn("DEBUG: Erro vazio recebido do MP. Verifique as chaves e o ambiente (Sandbox vs Prod).");
                }
              },
            },
          }
        );
      } catch (e) {
        console.error("Error creating brick:", e);
      }
    };

    initCardBrick();

    return () => {
      if (cardPaymentBrickController) {
        console.log("Desmontando Card Brick...");
        cardPaymentBrickController.unmount();
      }
    };
  }, [isMpLoaded, mpPublicKey, step, paymentMethod, isPrePaid, selectedService, customerInfo.email]);

  const createCheckout = useCreateCheckout();
  const confirmAppointment = useConfirmAppointment();

  const handleNextStep = () => setStep((s) => Math.min(s + 1, 5));
  const handlePrevStep = () => setStep((s) => {
    if (rescheduleId && s === 2) return s;
    return Math.max(s - 1, 1);
  });

  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber);
    handleNextStep();
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
          customerCpf: customerInfo.cpf,
          serviceId: selectedService.id,
          barberId: selectedBarber?.id,
          barberName: selectedBarber?.name,
          appointmentDate: format(selectedDate, "yyyy-MM-dd"),
          appointmentTime: selectedTime,
          userId: currentUser?.id,
          rescheduleId: rescheduleId ? parseInt(rescheduleId) : undefined
        } as any
      }) as any;
      setSessionId(result.sessionId);

      if (result.isPaid) {
        setIsPrePaid(true);
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

  const handleGeneratePix = async () => {
    if (!sessionId || !customerInfo.cpf) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha o seu CPF na etapa anterior.",
        variant: "destructive"
      });
      setStep(3);
      return;
    }

    setIsGeneratingPix(true);
    try {
      const response = await fetch("/api/appointments/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          payer: {
            name: customerInfo.name,
            email: customerInfo.email,
            identification: { type: "CPF", number: customerInfo.cpf }
          }
        }),
      });

      if (!response.ok) throw new Error("Falha ao gerar Pix");
      const data = await response.json();
      setPixData(data);
    } catch (error) {
      toast({
        title: "Erro no Pix",
        description: "Não foi possível gerar o código Pix. Tente outro método.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handlePaymentSubmit = async (e?: any, overrideSessionId?: string, directMpData?: any) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    const sid = overrideSessionId || sessionId;
    if (!sid) return null;

    try {
      const currentMpData = directMpData ? {
        ...directMpData,
        transaction_amount: directMpData.transaction_amount * 100,
        description: selectedService?.name,
        payer: { email: customerInfo.email }
      } : (paymentMethod === "card" && !isPrePaid ? {
        token: mpPaymentToken,
        payment_method_id: mpPaymentData?.payment_method_id || "master",
        installments: mpPaymentData?.installments || 1,
        transaction_amount: selectedService?.price || 0,
        description: selectedService?.name,
        payer: { email: customerInfo.email }
      } : undefined);

      const appointment = await confirmAppointment.mutateAsync({
        data: {
          sessionId: sid,
          paymentMethodId: isPrePaid ? "pre_paid" : (paymentMethod === "card" ? "mercado_pago" : (paymentMethod === "pix" ? "pix" : "offline_local")),
          mp_data: paymentMethod === "pix" ? pixData : currentMpData
        } as any
      });

      toast({
        title: rescheduleId ? "Reagendado!" : "Sucesso!",
        description: rescheduleId
          ? "Sua reserva foi remarcada com sucesso."
          : "Seu agendamento foi confirmado.",
      });

      DemoStore.saveAppointment(appointment);
      router.push(`/confirmacao/${appointment.id}`);
    } catch (error: any) {
      // Traduzir mensagens técnicas do Mercado Pago
      let errorMessage = error.response?.data?.error || error.message || "Não foi possível confirmar o agendamento.";
      
      if (errorMessage === "pending_waiting_transfer") {
        errorMessage = "Aguardando o pagamento do Pix. Por favor, realize o pagamento no app do seu banco e clique em 'Verificar Pagamento' novamente.";
      } else if (errorMessage === "Pagamento não aprovado") {
        errorMessage = "O pagamento ainda não foi aprovado. Se você já pagou, aguarde alguns segundos e tente novamente.";
      }

      toast({
        title: "Aguardando Pagamento",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Não lançamos mais o erro aqui para evitar 'unhandledRejection' no console do navegador,
      // a menos que seja um erro crítico que precise travar o Card Brick.
      if (paymentMethod === "card") throw error;
    }
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
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-serif font-semibold">Selecione o Barbeiro</h2>
              {isLoadingBarbers ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {barbers?.map((barber) => (
                    <div
                      key={barber.id}
                      onClick={() => handleBarberSelect(barber)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 flex items-center gap-4
                        ${selectedBarber?.id === barber.id ? 'border-primary bg-primary/5' : 'border-border/50 bg-background'}`}
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0 border-2 border-border/50 shadow-sm">
                        {barber.imageUrl ? (
                          <img src={barber.imageUrl} alt={barber.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                            <User className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-lg leading-tight">{barber.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{barber.description || "Especialista"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold">Escolha o Serviço</h2>
                <Button variant="ghost" size="sm" onClick={handlePrevStep}>Voltar</Button>
              </div>
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

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold text-foreground">Data e Horário</h2>
                <Button variant="ghost" size="sm" onClick={handlePrevStep}>Voltar</Button>
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
                        const dateStr = format(date, "yyyy-MM-dd");
                        if (date < today) return true;
                        if (busyDates.includes(dateStr)) return true;
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

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold text-foreground">Seus Dados</h2>
                <Button variant="ghost" size="sm" onClick={handlePrevStep}>Voltar</Button>
              </div>

              {!isLogged && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between mb-4">
                  <p className="text-sm text-foreground">Já possui uma conta? Entre para agendar mais rápido.</p>
                  <Button variant="link" asChild className="p-0 text-primary h-auto"><Link href={getLink("/login")}>Entrar</Link></Button>
                </div>
              )}

              <form onSubmit={handleInfoSubmit} className="space-y-4 max-w-md mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="bg-background/50 border-border h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="bg-background/50 border-border h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                      required
                      className="bg-background/50 border-border h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF (Obrigatório para Pix)</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={customerInfo.cpf}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                      required={paymentMethod === "pix"}
                      className="bg-background/50 border-border h-11"
                    />
                  </div>
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
          {step === 5 && (
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
                      <span className="text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Barbeiro</span>
                      <span className="font-medium text-right text-foreground">{selectedBarber?.name || "Qualquer um"}</span>
                    </div>
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

                { }
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
                      <Tabs defaultValue={settings?.isPrepaymentRequired ? "card" : "local"} onValueChange={(v) => setPaymentMethod(v as any)}>
                        <TabsList className={`grid w-full mb-6 ${settings?.isPrepaymentRequired ? "grid-cols-2" : "grid-cols-3"}`}>
                          <TabsTrigger value="card" className="gap-2">
                            <CreditCard className="w-4 h-4" /> Cartão
                          </TabsTrigger>
                          <TabsTrigger value="pix" className="gap-2" onClick={handleGeneratePix}>
                            <QrCode className="w-4 h-4" /> Pix
                          </TabsTrigger>
                          {!settings?.isPrepaymentRequired && (
                            <TabsTrigger value="local" className="gap-2">
                              <Wallet className="w-4 h-4" /> No Local
                            </TabsTrigger>
                          )}
                        </TabsList>

                        <TabsContent value="card" className="space-y-4">
                          {mpPublicKey ? (
                            <div className="min-h-[400px]">
                              <div id="cardPaymentBrick_container"></div>
                              <Script
                                src="https://sdk.mercadopago.com/js/v2"
                                strategy="afterInteractive"
                                onLoad={() => setIsMpLoaded(true)}
                              />
                            </div>
                          ) : (
                            <div className="p-8 border border-dashed rounded-lg text-center bg-muted/50">
                              <p className="text-sm font-medium mb-2 text-destructive">Configuração Necessária</p>
                              <p className="text-xs text-muted-foreground">O Mercado Pago não está configurado corretamente (chave pública ausente).</p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="pix" className="space-y-6 py-4">
                          {isGeneratingPix ? (
                            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                              <Loader2 className="w-8 h-8 animate-spin text-primary" />
                              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                            </div>
                          ) : pixData ? (
                            <div className="flex flex-col items-center space-y-6">
                              <div className="bg-white p-4 rounded-xl shadow-inner">
                                <img 
                                  src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                                  alt="QR Code Pix" 
                                  className="w-48 h-48"
                                />
                              </div>
                              
                              <div className="w-full space-y-3">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código Pix Copia e Cola</Label>
                                <div className="flex gap-2">
                                  <Input 
                                    readOnly 
                                    value={pixData.qr_code} 
                                    className="font-mono text-[10px] bg-muted h-10"
                                  />
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="shrink-0"
                                    onClick={() => {
                                      navigator.clipboard.writeText(pixData.qr_code);
                                      toast({ title: "Copiado!", description: "Código Pix copiado para a área de transferência." });
                                    }}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 w-full text-center space-y-4">
                                <p className="text-sm font-medium text-primary">Após pagar, clique no botão abaixo para concluir!</p>
                                <div className="space-y-2 w-full">
                                  <Button 
                                    onClick={() => handlePaymentSubmit(undefined, sessionId, pixData)}
                                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
                                  >
                                    <Check className="w-4 h-4" /> Verificar Pagamento
                                  </Button>
                                  
                                  {process.env.NODE_ENV === "development" && (
                                    <Button 
                                      variant="outline"
                                      onClick={() => handlePaymentSubmit(undefined, sessionId, { ...pixData, status: "approved" })}
                                      className="w-full border-dashed border-primary text-primary hover:bg-primary/5 gap-2"
                                    >
                                      <Scissors className="w-4 h-4" /> 🧪 Simular Sucesso (Só Dev)
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-8">
                              <Button onClick={handleGeneratePix} variant="outline">Tentar Gerar Novamente</Button>
                            </div>
                          )}
                        </TabsContent>

                        {!settings?.isPrepaymentRequired && (
                          <TabsContent value="local" className="space-y-4 py-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border mb-4">
                              <p className="text-sm font-medium">Você pagará diretamente na barbearia.</p>
                              <p className="text-xs text-muted-foreground mt-1 text-foreground">Aceitamos Dinheiro, Pix e Cartão de Débito/Crédito.</p>
                            </div>
                          </TabsContent>
                        )}

                        {paymentMethod !== "card" || isPrePaid ? (
                          <Button
                            onClick={() => handlePaymentSubmit()}
                            className="w-full mt-6 h-12 text-lg bg-[#EAB308] hover:bg-[#CA8A04] text-black font-bold shadow-lg transition-all active:scale-95"
                            disabled={confirmAppointment.isPending}
                          >
                            {confirmAppointment.isPending ? "Confirmando..." : "Finalizar Agendamento"}
                          </Button>
                        ) : (
                          <div className="mt-4 text-center">
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-500" /> Use o botão do Mercado Pago acima para finalizar
                            </p>
                          </div>
                        )}
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
