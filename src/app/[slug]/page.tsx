"use client";

import Link from "next/link";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useListServices } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, MapPin, Phone } from "lucide-react";
import { formatCurrencyFromCents } from "@/lib/format";
import { useTenant } from "@/hooks/use-tenant";

export default function Home() {
  const { data: services, isLoading, isError } = useListServices();
  const tenant = useTenant();

  if (isError) return <div>Erro ao carregar serviços. Tente atualizar a página.</div>;

  const getLink = (path: string) => `/${tenant.slug}${path}`;

  return (
    <Layout>
      <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero.png"
            alt="Barbershop Interior"
            className="w-full h-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        <div className="container relative z-10 px-4 text-center max-w-4xl mx-auto mt-20">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 tracking-tight leading-tight">
            A Tradição do <br /><span className="text-primary italic">Corte Perfeito</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto font-light">
            Um refúgio para o homem moderno. Sofisticação, técnica impecável e um ambiente pensado para o seu ritual de cuidados.
          </p>
          <Button asChild size="lg" className="h-14 px-8 text-lg font-medium tracking-wide">
            <Link href={getLink("/booking")}>
              Agendar Horário
            </Link>
          </Button>
        </div>
      </section>

      {}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Nossos Serviços</h2>
            <div className="w-16 h-1 bg-primary mx-auto mb-6"></div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Da barboterapia clássica ao corte executivo. Conheça nossos serviços pensados para sua melhor versão.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[300px] w-full rounded-sm bg-card" />
                  <Skeleton className="h-6 w-3/4 bg-card" />
                  <Skeleton className="h-4 w-1/4 bg-card" />
                </div>
              ))}
            </div>
          ) : services && services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services?.map((service, idx) => (
                <div key={service.id} className="group cursor-pointer">
                  <div className="relative h-[300px] w-full overflow-hidden rounded-sm mb-4">
                    <img
                      src={service.imageUrl || `/images/service-${['haircut', 'beard', 'combo', 'hydration'][idx % 4]}.png`}
                      alt={service.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold mb-2 group-hover:text-primary transition-colors">{service.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-medium text-lg">{formatCurrencyFromCents(service.price)}</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {service.durationMinutes} min
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-6">Nenhum serviço disponível no momento.</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          )}

          <div className="mt-16 text-center">
            <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Link href={getLink("/booking")}>
                Ver todos os serviços e agendar
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {}
      <section className="py-24 bg-card border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-border/50">
            <div className="flex flex-col items-center p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="text-primary w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Localização</h3>
              <p className="text-muted-foreground">Rua Frei Gaspar 7777<br />Centro - São Vicente</p>
            </div>
            <div className="flex flex-col items-center p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="text-primary w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Horário</h3>
              <p className="text-muted-foreground">Seg a Sex: 09h às 21h<br />Sáb: 09h às 18h</p>
            </div>
            <div className="flex flex-col items-center p-6">
              <a 
                href={`https://wa.me/5513982046758?text=${encodeURIComponent("Olá! Acabei de testar o sistema de agendamento online para barbearias e gostei muito. Tenho uma barbearia e queria entender como posso implementar no meu negócio e os valores.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 hover:bg-primary/20 transition-colors"
                title="Conversar no WhatsApp"
              >
                <Phone className="text-primary w-6 h-6" />
              </a>
              <h3 className="font-serif text-xl font-semibold mb-2">Contato</h3>
              <p className="text-muted-foreground">(13) 98204-6758<br />thyagonevesa.sa@gmail.com</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
