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
import { useUserStore } from "@/lib/store/user-store";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, ChevronRight, Clock, CreditCard, User, Scissors, Wallet, MapPin } from "lucide-react";
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
  services?: { id: number }[];
  weekly_hours?: any;
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
  const getLink = (path: string) => `/${tenant.slug}${path}`;

  const rescheduleId = searchParams.get("reschedule");
  const preSelectedServiceId = searchParams.get("serviceId");

  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<any>(null);
  const { user: currentUser, setUser: setStoreUser, refreshProfile } = useUserStore();
  const isLogged = !!currentUser;

  const timeSectionRef = useRef<HTMLDivElement>(null);

  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  const { data: allServices, isLoading: isLoadingServices } = useListServices();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [busyDates, setBusyDates] = useState<string[]>([]);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(true);
  const [isLoadingBusyDates, setIsLoadingBusyDates] = useState(false);
  
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: ""
  });

  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [isPrePaid, setIsPrePaid] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixData, setPixData] = useState<any>(null);

  const [mpPublicKey, setMpPublicKey] = useState("");
  const [isMpLoaded, setIsMpLoaded] = useState(false);
  const [mpPaymentToken, setMpPaymentToken] = useState<string | null>(null);
  const [mpPaymentData, setMpPaymentData] = useState<any>(null);
  const paymentSubmitRef = useRef<any>(null);

  const [isPollingPix, setIsPollingPix] = useState(false);
  const [pixCountdown, setPixCountdown] = useState(0);

  // Cache de dados para economia de chamadas
  const [cache, setCache] = useState<Record<string, any>>({
    units: [],
    barbers: {}, // unitId -> barbers[]
    services: {}, // unitId -> services[]
  });

  // Estados de Disponibilidade
  const [isGloballyClosed, setIsGloballyClosed] = useState(false);
  const [closureReason, setClosureReason] = useState<"settings" | "barbers" | null>(null);

  const checkAvailability = (sData: any, bData: any[], uData: any[]) => {
    // 1. Verificar Unidades (Pelo menos uma unidade com horário ativo)
    const hasOpenUnit = uData && uData.length > 0;

    if (!hasOpenUnit) {
      setIsGloballyClosed(true);
      setClosureReason("settings"); // Mantemos o motivo como "settings" para reaproveitar a mensagem de "Barbearia Fechada"
      return;
    }

    // 2. Verificar se há barbeiros bookable
    if (!bData || bData.length === 0) {
      setIsGloballyClosed(true);
      setClosureReason("barbers");
      return;
    }

    setIsGloballyClosed(false);
    setClosureReason(null);
  };

  const isValidCpf = (cpfStr: string) => {
    if (!cpfStr) return true; // se vazio não valida (ignorado)
    const strCPF = cpfStr.replace(/[^\d]+/g, "");
    if (strCPF.length !== 11 || /^(\d)\1{10}$/.test(strCPF)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(strCPF.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(strCPF.substring(10, 11))) return false;
    return true;
  };

  // Script do Mercado Pago
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => setIsMpLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const headers = { "x-tenant-slug": tenant.slug };
    
    // Tenta carregar do cache primeiro
    if (cache.units.length > 0) {
      setIsLoadingUnits(false);
      return;
    }

    Promise.all([
      fetch(`/api/settings?t=${Date.now()}`, { headers }).then(res => res.json()),
      fetch("/api/auth/me", { headers }).then(res => res.json()),
      fetch("/api/units", { headers }).then(res => res.json()),
      fetch("/api/barbers?active=true&bookable=true", { headers }).then(res => res.json())
    ]).then(([settingsData, authData, unitsData, barbersData]) => {
      
      let activeUnits = [] as any[];
      if (Array.isArray(unitsData)) {
        activeUnits = unitsData.filter(unit => {
          const hours = unit.weekly_hours || {};
          return Object.values(hours).some((day: any) => day.active === true);
        });

        setUnits(activeUnits);
        setCache(prev => ({ ...prev, units: activeUnits }));

        if (activeUnits.length === 1) {
          setSelectedUnit(activeUnits[0]);
          setStep(s => s === 1 ? 2 : s);
        }
      }
      setIsLoadingUnits(false);

      let finalBarbers = [] as any[];
      if (Array.isArray(barbersData)) {
        finalBarbers = barbersData;
        setBarbers(barbersData);
      }
      setIsLoadingBarbers(false);

      setSettings(settingsData);
      checkAvailability(settingsData, finalBarbers, activeUnits);
      DemoStore.saveSettings(settingsData);
      setMpPublicKey(settingsData.mpPublicKey || "");

      if (!settingsData.isPrepaymentRequired) {
        setPaymentMethod("local");
      }

      if (authData.authenticated) {
        setStoreUser(authData.user);
        setCustomerInfo(prev => ({
          ...prev,
          name: authData.user.name || prev.name,
          email: authData.user.email || prev.email,
          phone: authData.user.phone ? formatPhone(authData.user.phone) : prev.phone
        }));
      }
    });
  }, [tenant]);

  // Pre-selecionar serviço se vier via URL
  useEffect(() => {
    if (preSelectedServiceId && Array.isArray(services) && selectedServices.length === 0) {
      const s = services.find(srv => String(srv.id) === String(preSelectedServiceId));
      if (s) setSelectedServices([s]);
    }
  }, [preSelectedServiceId, services, selectedServices.length]);

  // Filtrar barbeiros e serviços quando a unidade é selecionada (Com Cache)
  useEffect(() => {
    if (selectedUnit && Array.isArray(allServices)) {
      const uId = selectedUnit.id;

      // 1. Barbeiros
      if (cache.barbers[uId]) {
        setBarbers(cache.barbers[uId]);
        if (cache.barbers[uId].length === 1 && step === 2) {
          setSelectedBarber(cache.barbers[uId][0]);
          setStep(3);
        }
      } else {
        setIsLoadingBarbers(true);
        fetch(`/api/barbers?active=true&unitId=${uId}`, { headers: { "x-tenant-slug": tenant.slug } })
          .then(res => res.json())
          .then(data => {
              const barbersList = Array.isArray(data) ? data : [];
              setBarbers(barbersList);
              setCache(prev => ({ ...prev, barbers: { ...prev.barbers, [uId]: barbersList } }));
              if (barbersList.length === 1 && step === 2) {
                  setSelectedBarber(barbersList[0]);
                  setStep(3);
              }
          })
          .catch(() => setBarbers([]))
          .finally(() => setIsLoadingBarbers(false));
      }
        
      // 2. Serviços
      if (cache.services[uId]) {
        setServices(cache.services[uId]);
      } else {
        fetch(`/api/services?unitId=${uId}`, { headers: { "x-tenant-slug": tenant.slug } })
          .then(res => res.json())
          .then(data => {
            const servicesList = Array.isArray(data) ? data : [];
            setServices(servicesList);
            setCache(prev => ({ ...prev, services: { ...prev.services, [uId]: servicesList } }));
          })
          .catch(() => setServices([]));
      }
    } else if (Array.isArray(allServices)) {
      setServices(allServices);
    }
  }, [selectedUnit, allServices, tenant]);

  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  useEffect(() => {
    if (step < 4) return; // Só busca se já selecionou serviços
    
    const fetchBusyDates = async () => {
      setIsLoadingBusyDates(true);
      const start = format(new Date(), "yyyy-MM-dd");
      const end = format(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

      let url = `/api/availability/busy-dates?start=${start}&end=${end}`;
      if (selectedBarber?.id) url += `&barberId=${selectedBarber.id}`;
      if (selectedUnit?.id) url += `&unitId=${selectedUnit.id}`;
      if (totalDuration > 0) url += `&totalDuration=${totalDuration}`;

      try {
        const res = await fetch(url, { headers: { "x-tenant-slug": tenant?.slug || "" } });
        const data = await res.json();
        if (Array.isArray(data)) setBusyDates(data);
      } catch (err) {
        console.error("Error fetching busy dates:", err);
      } finally {
        setIsLoadingBusyDates(false);
      }
    };

    fetchBusyDates();
  }, [selectedBarber?.id, selectedUnit?.id, tenant?.slug, totalDuration, step]);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const serviceIdsStr = selectedServices.map(s => s.id).join(",");

  const { data: availability, isLoading: isLoadingAvailability, isFetching: isFetchingAvailability } = useGetAvailability(
    { 
      date: dateStr, 
      serviceId: selectedServices[0]?.id || 0,
      barberId: selectedBarber?.id as any,
      unitId: selectedUnit?.id || undefined,
      serviceIds: serviceIdsStr || undefined,
      reschedule: rescheduleId || undefined
    } as any,
    {
      query: {
        enabled: !!selectedDate && selectedServices.length > 0 && !!selectedBarber?.id,
        queryKey: getGetAvailabilityQueryKey({ 
          date: dateStr, 
          serviceId: selectedServices[0]?.id || 0, 
          barberId: selectedBarber?.id as any,
          unitId: selectedUnit?.id || undefined,
          serviceIds: serviceIdsStr || undefined,
          reschedule: rescheduleId || undefined
        } as any)
      }
    }
  );

  const isChangingAvailability = isLoadingAvailability || isFetchingAvailability;


  // Update ref to latest handlePaymentSubmit to avoid stale closures in useEffect
  useEffect(() => {
    paymentSubmitRef.current = handlePaymentSubmit;
  }, [sessionId, mpPaymentToken, mpPaymentData, isPrePaid, paymentMethod, selectedServices, customerInfo]);

  useEffect(() => {
    // Only proceed if all requirements are met
    if (!isMpLoaded || !mpPublicKey || step !== 6 || paymentMethod !== "card" || isPrePaid) {
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
      const totalAmount = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      const amount = totalAmount / 100;
      const email = customerInfo.email;

      console.log("DEBUG: Mercado Pago Initialization Config:", {
        amount,
        email,
        publicKey: mpPublicKey?.substring(0, 10) + "...",
        services: selectedServices.map(s => s.name).join(", ")
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
              amount: selectedServices.reduce((sum, s) => sum + (s.price || 0), 0) / 100,
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
  }, [isMpLoaded, mpPublicKey, step, paymentMethod, isPrePaid, selectedServices, customerInfo.email]);

  const createCheckout = useCreateCheckout();
  const confirmAppointment = useConfirmAppointment();

  const handleNextStep = () => setStep((s) => Math.min(s + 1, 6));
  const handlePrevStep = () => setStep((s) => {
    // Não permitir voltar para o passo 1 se houver apenas um barbeiro
    if (barbers.length === 1 && s === 2) return s;
    if (rescheduleId && s === 2) return s;
    return Math.max(s - 1, 1);
  });

  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber);
    handleNextStep();
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
    setSelectedTime(null);
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
    if (selectedServices.length === 0 || !selectedDate || !selectedTime || !customerInfo.name || !customerInfo.email) return;

    try {
      const result = await createCheckout.mutateAsync({
        data: {
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          customerCpf: customerInfo.cpf,
          serviceIds: selectedServices.map(s => s.id),
          barberId: selectedBarber?.id,
          barberName: selectedBarber?.name,
          appointmentDate: format(selectedDate, "yyyy-MM-dd"),
          appointmentTime: selectedTime,
          userId: currentUser?.id,
          unitId: selectedUnit?.id,
          unitName: selectedUnit?.name,
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
    if (!sessionId || !customerInfo.cpf || pixData || isGeneratingPix) {
      if (!customerInfo.cpf) {
        toast({
          title: "Dados incompletos",
          description: "Por favor, preencha o seu CPF na etapa anterior.",
          variant: "destructive"
        });
        setStep(3);
      }
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

  // Auto-gerar Pix quando selecionar a aba
  useEffect(() => {
    if (step === 6 && paymentMethod === "pix" && !pixData && !isGeneratingPix && sessionId && customerInfo.cpf) {
      handleGeneratePix();
    }
  }, [step, paymentMethod, pixData, isGeneratingPix, sessionId, customerInfo.cpf]);

  // Efeito de Polling PIX
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Para o polling se sair do passo 6 ou trocar de método
    if (step !== 6 || paymentMethod !== "pix") {
      if (isPollingPix) {
        setIsPollingPix(false);
        setPixCountdown(0);
      }
      return;
    }

    if (isPollingPix) {
      timer = setInterval(() => {
        setPixCountdown((prev) => {
          if (prev <= 1) {
            handlePaymentSubmit(undefined, sessionId, pixData);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isPollingPix, step, paymentMethod, sessionId, pixData]);

  const handleStartPixVerification = () => {
    handlePaymentSubmit(undefined, sessionId, pixData);
    setIsPollingPix(true);
    setPixCountdown(10);
  };

  const handlePaymentSubmit = async (e?: any, overrideSessionId?: string, directMpData?: any) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    const sid = overrideSessionId || sessionId;
    if (!sid) return null;

    try {
      const totalAmount = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      const combinedNames = selectedServices.map(s => s.name).join(" + ");

      const currentMpData = directMpData ? {
        ...directMpData,
        transaction_amount: directMpData.transaction_amount * 100,
        description: combinedNames,
        payer: { email: customerInfo.email }
      } : (paymentMethod === "card" && !isPrePaid ? {
        token: mpPaymentToken,
        payment_method_id: mpPaymentData?.payment_method_id || "master",
        installments: mpPaymentData?.installments || 1,
        transaction_amount: totalAmount,
        description: combinedNames,
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

      if ((paymentMethod === "card" || paymentMethod === "pix") && settings?.isPointsEnabled) {
        // Em vez de somar manualmente, solicitamos que o Store recarregue os dados do banco
        // O backend já processou o acréscimo de pontos no AppointmentService.confirm
        await refreshProfile(tenant?.slug);
      }

      DemoStore.saveAppointment(appointment);
      
      console.log("DEBUG: Agendamento retornado pela API:", appointment);
      
      // Captura robusta do ID (tenta vários formatos de resposta da API)
      const rawId = appointment?.id || 
                    appointment?.data?.id || 
                    appointment?.appointment?.id || 
                    (appointment as any)?.appointmentId;

      if (rawId) {
        router.push(getLink(`/confirmacao/${rawId}`));
      } else {
        console.warn("Agendamento confirmado, mas ID não identificado no payload. Verifique o log de DEBUG acima.", appointment);
        router.push(getLink("/meu-perfil/historico"));
      }
    } catch (error: any) {
      // Traduzir mensagens técnicas do Mercado Pago
      let errorMessage = error.response?.data?.error || error.message || "Não foi possível confirmar o agendamento.";
      
      const isSlotOccupied = errorMessage.includes("SLOT_OCCUPIED") || 
                             (error.response?.data?.error?.includes("SLOT_OCCUPIED"));

      if (isSlotOccupied) {
        toast({
          title: "Horário Ocupado",
          description: "Desculpe, este horário acabou de ser preenchido por outro cliente. Por favor, escolha um novo horário.",
          variant: "destructive"
        });
        setStep(4); // Volta para a seleção de horários
        setSelectedTime(null);
        return;
      }

      if (errorMessage.includes("pending_waiting_transfer")) {
        errorMessage = "Aguardando confirmação do banco. Fique na tela, estamos verificando automaticamente o seu pagamento a cada 10 segundos.";
      } else if (errorMessage.includes("Pagamento não aprovado") || errorMessage.includes("não aprovado")) {
        errorMessage = "O pagamento ainda não foi aprovado. Se você já pagou, aguarde a verificação automática.";
      }

      if (!isPollingPix) {
        toast({
          title: "Aguardando Pagamento",
          description: errorMessage,
          variant: "default" 
        });
      }
      
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
              Você está alterando o horário para o agendamento atual.
            </p>
          )}

          {isGloballyClosed && !isLoadingUnits && !isLoadingBarbers && (
            <div className="mt-12 animate-in fade-in slide-in-from-top-4 duration-500">
              <Card className="border-destructive/20 bg-destructive/5 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
                <CardHeader className="pb-2">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4 mx-auto">
                    <Clock className="w-10 h-10" />
                  </div>
                  <CardTitle className="text-3xl font-serif text-center">
                    {closureReason === "settings" ? "Barbearia Fechada" : "Indisponível no Momento"}
                  </CardTitle>
                  <CardDescription className="text-center text-lg mt-2">
                    {closureReason === "settings" 
                      ? "Não estamos aceitando novos agendamentos no momento de acordo com nosso horário de funcionamento."
                      : "No momento não temos profissionais disponíveis para agendamento online."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6 pb-8">
                  <p className="text-muted-foreground text-center max-w-md">
                    Siga-nos nas redes sociais ou entre em contato pelo WhatsApp para mais informações sobre horários e disponibilidade futura.
                  </p>
                  <div className="flex gap-4">
                    <Button variant="outline" asChild>
                      <Link href="/">Voltar ao Início</Link>
                    </Button>
                    <Button onClick={() => window.location.reload()} className="gap-2">
                      <Clock className="w-4 h-4" /> Tentar Novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!isGloballyClosed && (
            <div className="flex items-center justify-between relative mt-10">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border z-0"></div>
            {(() => {
              const hasUnits = units.length > 1;
              const hasBarbers = barbers.length > 1;
              
              // O total de passos visíveis depende se houve pulo automático
              const totalSteps = 4 + (hasUnits ? 1 : 0) + (hasBarbers ? 1 : 0);
              
              // Mapeamento de steps reais para visuais para manter progresso linear
              let visualStep = 1;
              if (step === 1 && hasUnits) visualStep = 1;
              else if (step === 2) visualStep = hasUnits ? 2 : 1;
              else if (step === 3) visualStep = (hasUnits ? 1 : 0) + (hasBarbers ? 1 : 0) + 1;
              else if (step === 4) visualStep = (hasUnits ? 1 : 0) + (hasBarbers ? 1 : 0) + 2;
              else if (step === 5) visualStep = (hasUnits ? 1 : 0) + (hasBarbers ? 1 : 0) + 3;
              else if (step === 6) visualStep = (hasUnits ? 1 : 0) + (hasBarbers ? 1 : 0) + 4;
              
              const progressWidth = ((visualStep - 1) / (totalSteps - 1)) * 100;

              return (
                <>
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary z-0 transition-all duration-300"
                    style={{ width: `${Math.max(0, progressWidth)}%` }}
                  ></div>

                  {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => {
                    const isActive = visualStep === s;
                    const isCompleted = visualStep > s;
                    
                    return (
                      <div
                        key={s}
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-medium border-2 transition-colors
                          ${isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                            isActive ? 'bg-background border-primary text-primary' :
                              'bg-background border-border text-muted-foreground'}`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : s}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
          )}
        </div>

        {!isGloballyClosed && (
          <div className="bg-card border border-border/50 rounded-lg p-6 shadow-xl">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-serif font-semibold">Selecione a Unidade</h2>
              {isLoadingUnits ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {units?.map((unit) => {
                    const barbersInUnit = barbers.filter(b => b.active && b.units?.some((u: any) => u.id === unit.id));
                    const isUnitClosed = barbersInUnit.length === 0;

                    return (
                      <div
                        key={unit.id}
                        onClick={() => {
                          if (isUnitClosed) return;
                          setSelectedUnit(unit);
                          setStep(2);
                        }}
                        className={`p-4 border rounded-lg transition-all flex items-center gap-4 relative overflow-hidden
                          ${isUnitClosed 
                            ? 'opacity-60 grayscale cursor-not-allowed bg-muted/50 border-border' 
                            : selectedUnit?.id === unit.id 
                              ? 'border-primary bg-primary/5 cursor-pointer ring-1 ring-primary' 
                              : 'border-border/50 bg-background cursor-pointer hover:border-primary/50'}`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                          ${isUnitClosed ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                          <MapPin className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                             <h3 className="font-medium text-lg leading-tight">{unit.name}</h3>
                             {isUnitClosed && (
                               <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full uppercase tracking-wider">
                                 Fechada
                               </span>
                             )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{unit.address}, {unit.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {isUnitClosed ? "Sem profissionais disponíveis nesta unidade" : `${unit.city}/${unit.state}`}
                          </p>
                        </div>
                        {isUnitClosed && (
                          <div className="absolute inset-0 bg-background/5 pointer-events-none" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold">Selecione o Barbeiro</h2>
                {units.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Mudar Unidade</Button>
                )}
              </div>
              {isLoadingBarbers ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : barbers.length === 0 ? (
                <div className="text-center py-10">
                   <p className="text-muted-foreground">Nenhum barbeiro disponível nesta unidade.</p>
                   <Button onClick={() => setStep(1)} className="mt-4">Voltar</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {barbers?.map((barber) => (
                    <div
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarber(barber);
                        setStep(3);
                      }}
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

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold">Escolha o Serviço</h2>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedServices([]); setStep(2); }}>Voltar</Button>
              </div>
              {isLoadingServices ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services?.filter(s => {
                      if (!selectedBarber) return true;
                      return selectedBarber.services?.some(bs => bs.id === s.id);
                    })?.map((service) => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      return (
                        <div
                          key={service.id}
                          onClick={() => handleServiceSelect(service)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 relative
                            ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border/50 bg-background'}`}
                        >
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-0.5 shadow-lg">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-lg">{service.name}</h3>
                            <span className="text-primary font-medium">{formatCurrencyFromCents(service.price)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {service.durationMinutes} min
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedServices.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 mt-4 animate-in fade-in zoom-in duration-500">
                      <div>
                        <p className="text-sm font-medium">{selectedServices.length} serviço(s) selecionado(s)</p>
                        <p className="text-lg font-bold text-primary">
                          Total: {formatCurrencyFromCents(selectedServices.reduce((sum, s) => sum + (s.price || 0), 0))}
                        </p>
                      </div>
                      <Button onClick={() => setStep(4)} className="w-full sm:w-auto px-10 h-12 text-lg font-bold shadow-lg">
                        Continuar <ChevronRight className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold text-foreground">Data e Horário</h2>
                <Button variant="ghost" size="sm" onClick={() => setStep(3)}>Voltar</Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-3">
                  <Label className="mb-4 block text-lg font-medium text-foreground">1. Selecione a data</Label>
                  <div className="border border-border/50 rounded-xl p-4 w-full bg-background shadow-sm min-h-[350px] flex items-center justify-center">
                    {isLoadingBusyDates ? (
                      <div className="w-full space-y-4">
                        <div className="flex justify-between items-center px-2">
                           <Skeleton className="h-8 w-32" />
                           <div className="flex gap-2">
                             <Skeleton className="h-8 w-8 rounded-full" />
                             <Skeleton className="h-8 w-8 rounded-full" />
                           </div>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                           {Array.from({ length: 35 }).map((_, i) => (
                             <Skeleton key={i} className="h-10 w-full rounded-md" />
                           ))}
                        </div>
                      </div>
                    ) : (
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        onMonthChange={() => {
                          setSelectedDate(undefined);
                          setSelectedTime(null);
                        }}
                        locale={ptBR}
                        fromDate={new Date()}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const dateStr = format(date, "yyyy-MM-dd");
                          
                          // Bloquear se for data passada (redundante com fromDate mas seguro)
                          if (date < today) return true;
                          
                          // Bloquear se o backend marcou como ocupado/fechado
                          if (busyDates.includes(dateStr)) return true;
                          
                          return false;
                        }}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>

                <div className={`lg:col-span-2 ${isChangingAvailability ? 'pointer-events-none' : ''}`} ref={timeSectionRef}>
                  <Label className="mb-4 block text-lg font-medium text-foreground">2. Escolha o horário</Label>
                  {isChangingAvailability ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                        <div key={i} className="h-12 w-full bg-muted rounded-md border border-border/50" />
                      ))}
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

          {step === 5 && (
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
                      className={`bg-background/50 border-border h-11 ${customerInfo.cpf && !isValidCpf(customerInfo.cpf) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {customerInfo.cpf && !isValidCpf(customerInfo.cpf) && (
                      <p className="text-xs text-destructive mt-1 font-medium">CPF inválido. Por favor, revise os números.</p>
                    )}
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

          {step === 6 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold text-foreground">
                  {isPrePaid ? "Confirmar Remarcação" : "Pagamento"}
                </h2>
                <Button variant="ghost" size="sm" onClick={handlePrevStep} disabled={confirmAppointment.isPending}>Voltar</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-background rounded-lg p-6 border border-border/50 h-fit">
                  <h3 className="font-medium text-lg mb-4 text-foreground">Resumo do Agendamento</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Barbeiro</span>
                      <span className="font-medium text-right text-foreground">{selectedBarber?.name || "Qualquer um"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-2"><Scissors className="w-4 h-4" /> Serviços</span>
                      <div className="text-right">
                        {selectedServices.map(s => (
                          <div key={s.id} className="font-medium text-foreground">{s.name}</div>
                        ))}
                      </div>
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
                    <span className="text-primary font-bold">
                      {formatCurrencyFromCents(selectedServices.reduce((sum, s) => sum + (s.price || 0), 0))}
                    </span>
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
                      {(() => {
                        const canPayLocal = !settings?.isPrepaymentRequired && currentUser?.canPayAtShop !== false;
                        const isPixAvailable = !!(customerInfo.cpf && isValidCpf(customerInfo.cpf));
                        const defaultPaymentMethod = canPayLocal ? "local" : "card";
                        
                        let tabCount = 1; // Cartão sempre existe
                        if (canPayLocal) tabCount++;
                        if (isPixAvailable) tabCount++;
                        const gridColsClass = tabCount === 3 ? "grid-cols-3" : (tabCount === 2 ? "grid-cols-2" : "grid-cols-1");
                        
                        return (
                          <Tabs defaultValue={defaultPaymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                            <TabsList className={`grid w-full mb-6 ${gridColsClass}`}>
                          <TabsTrigger value="card" className="gap-2">
                            <CreditCard className="w-4 h-4" /> Cartão
                          </TabsTrigger>
                          {(customerInfo.cpf && isValidCpf(customerInfo.cpf)) && (
                            <TabsTrigger value="pix" className="gap-2" onClick={handleGeneratePix}>
                              <QrCode className="w-4 h-4" /> Pix
                            </TabsTrigger>
                          )}
                          {!settings?.isPrepaymentRequired && currentUser?.canPayAtShop !== false && (
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
                                    onClick={handleStartPixVerification}
                                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
                                  >
                                    {isPollingPix ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Verificar Pagamento
                                  </Button>
                                  {isPollingPix && (
                                    <p className="text-xs text-muted-foreground mt-2 animate-pulse">
                                      (Próxima verificação em {pixCountdown} segundos)
                                    </p>
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

                        {!settings?.isPrepaymentRequired && currentUser?.canPayAtShop !== false && (
                          <TabsContent value="local" className="space-y-4 py-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border mb-4">
                              <p className="text-sm font-medium">Você pagará diretamente na barbearia.</p>
                              <p className="text-xs text-muted-foreground mt-1 text-foreground">Aceitamos Dinheiro, Pix e Cartão de Débito/Crédito.</p>
                            </div>
                          </TabsContent>
                        )}

                        {paymentMethod === "local" || (paymentMethod === "card" && isPrePaid) ? (
                          <Button
                            onClick={() => handlePaymentSubmit()}
                            className="w-full mt-6 h-12 text-lg bg-[#EAB308] hover:bg-[#CA8A04] text-black font-bold shadow-lg transition-all active:scale-95"
                            disabled={confirmAppointment.isPending}
                          >
                            {confirmAppointment.isPending ? "Confirmando..." : "Finalizar Agendamento"}
                          </Button>
                        ) : paymentMethod === "card" ? (
                          <div className="mt-4 text-center">
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-500" /> Use o botão do Mercado Pago acima para finalizar
                            </p>
                          </div>
                        ) : null}
                          </Tabs>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </Layout>
    }>
      <BookingContent />
    </Suspense>
  );
}
