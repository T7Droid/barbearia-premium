import { GlobalLayout } from "@/components/global-layout";
import { Button } from "@/components/ui/button";
import { MessageCircle, Check, Clock, CreditCard, Smartphone, TrendingUp } from "lucide-react";

export default function RootPage() {
  return (
    <GlobalLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-16">

        <div className="text-center max-w-3xl mb-12">
          <p className="text-xl md:text-2xl text-muted-foreground font-light">
            Transformamos barbearias em negócios digitais de alta performance.
          </p>
        </div>

        {/* COPY HERO */}
        <div className="max-w-5xl w-full mb-16">
          <div className="mb-12 text-center flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground leading-tight text-center">
              Coloque sua barbearia no automático em <br className="hidden md:block" />menos de <span className="text-primary italic">2 minutos</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl text-center">
              Pare de perder tempo com agenda no WhatsApp, clientes desorganizados e horários vazios.
              Crie sua conta, Cadastre seus serviços e barbeiros, compartilhe seu link e receba agendamentos online agora mesmo, simples assim.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            {/* CARD 1 */}
            <div className="bg-card border border-border/50 p-8 rounded-3xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col items-center text-center gap-4 h-full">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Mais clientes, menos dor de cabeça</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Seu negócio fica online e disponível <strong>24h por dia</strong>. Enquanto você trabalha, descansa ou até dorme, novos clientes encontram seus horários e agendam com você automaticamente.
                </p>
              </div>
            </div>

            {/* CARD 2 */}
            <div className="bg-card border border-border/50 p-8 rounded-3xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col items-center text-center gap-4 h-full">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Receba direto na sua conta</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Com apenas 1 clique, você conecta o seu Mercado Pago e começa a receber pagamentos agora mesmo. <strong>Sem intermediários, sem burocracia e direto na sua conta.</strong>
                </p>
              </div>
            </div>

            {/* CARD 3 */}
            <div className="bg-card border border-border/50 p-8 rounded-3xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col items-center text-center gap-4 h-full">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Diga adeus ao caos do WhatsApp</h3>
                <ul className="text-muted-foreground space-y-3 mt-4 text-left inline-block">
                  <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5" /> <span><strong className="text-foreground">Sem</strong> mensagens perdidas ou esquecidas</span></li>
                  <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5" /> <span><strong className="text-foreground">Sem</strong> horários duplicados (Double Booking)</span></li>
                  <li className="flex items-start gap-2"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5" /> <span><strong className="text-foreground">Sem</strong> confusão e desorganização de clientes</span></li>
                </ul>
              </div>
            </div>

            {/* CARD 4 */}
            <div className="bg-card border border-border/50 p-8 rounded-3xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col items-center text-center gap-4 h-full">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Menos cancelamento, mais faturamento</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Sistema com controle inteligente de agenda e opção para cobrança de <strong>pagamentos antecipados</strong>. O melhor remédio para reduzir cancelamentos de última hora, faltas e proteger seu faturamento.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center text-center gap-4 py-4 max-w-2xl mx-auto">
            <div>
              <h4 className="text-xl font-bold">Transforme em negócio profissional</h4>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">Tenha organização, automação e tempo livre para focar no que realmente importa: <strong>atender bem seus clientes e crescer.</strong></p>
            </div>
          </div>
        </div>

        {/* Planos */}
        <div className="max-w-7xl w-full mb-24 px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">Planos que crescem com você</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Escolha a melhor opção para o momento da sua barbearia. Sem taxas de adesão ou fidelidade.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Plano Básico */}
            <div className="bg-card border border-border/50 p-8 rounded-3xl flex flex-col hover:border-primary/30 transition-all shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">Básico</h3>
                <p className="text-sm text-muted-foreground">Para quem está começando</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold text-foreground">R$29</span>
                <span className="text-muted-foreground font-medium">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span><strong>1</strong> Unidade</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span><strong>1</strong> Barbeiro</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span><strong>300</strong> agendamentos/mês</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full h-12 rounded-xl font-bold hover:bg-primary hover:text-white transition-all">
                <a href="/onboarding?plan=basico">Começar agora</a>
              </Button>
            </div>

            <div className="bg-card border-2 border-primary p-8 rounded-3xl flex flex-col relative shadow-2xl scale-105 z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                Mais Popular
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">Profissional</h3>
                <p className="text-sm text-muted-foreground">O melhor custo-benefício</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold text-foreground">R$59</span>
                <span className="text-muted-foreground font-medium">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span><strong>1</strong> Unidade</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span>Até <strong>3</strong> barbeiros</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span><strong>1.000</strong> agendamentos/mês</span>
                </li>
              </ul>
              <Button asChild className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all">
                <a href="/onboarding?plan=profissional">Escolher Profissional</a>
              </Button>
            </div>

            {/* Plano Premium */}
            <div className="bg-card border border-border/50 p-8 rounded-3xl flex flex-col hover:border-primary/30 transition-all shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">Premium</h3>
                <p className="text-sm text-muted-foreground">Para redes em crescimento</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold text-foreground">R$99</span>
                <span className="text-muted-foreground font-medium">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span>Até <strong>3</strong> unidades</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span>Até <strong>10</strong> barbeiros</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span><strong>5.000</strong> agendamentos/mês</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full h-12 rounded-xl font-bold hover:bg-primary hover:text-white transition-all">
                <a href="/onboarding?plan=premium">Escolher Premium</a>
              </Button>
            </div>

            {/* Plano Escala */}
            <div className="bg-card border border-border/50 p-8 rounded-3xl flex flex-col hover:border-primary/30 transition-all shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">Escala</h3>
                <p className="text-sm text-muted-foreground">Alta performance e volume</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold text-foreground">R$149</span>
                <span className="text-muted-foreground font-medium">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span>Até <strong>10</strong> unidades</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span>Até <strong>30</strong> barbeiros</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  <span>Agendamentos <strong>Ilimitados</strong></span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full h-12 rounded-xl font-bold hover:bg-primary hover:text-white transition-all">
                <a href="/onboarding?plan=escala">Escolher Escala</a>
              </Button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-card border border-border/50 p-10 rounded-3xl shadow-2xl max-w-lg w-full transition-all hover:border-primary/50 hover:shadow-primary/5 relative overflow-hidden text-center z-10 group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-yellow-400 to-primary background-animate" />

          <p className="text-muted-foreground mb-6 text-lg">
            Entre em contato agora mesmo para criar a sua Barbearia Digital e receber o seu painel de gestor.
          </p>

          <p className="text-primary font-medium mb-8 italic text-sm md:text-base">
            "Tem dificuldade para configurar? Pode nos chamar que a gente configura tudo para você sem custo adicional!"
          </p>

          <Button asChild className="w-full h-16 text-lg font-bold gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white border-none rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <a
              href="https://wa.me/5513982046758"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-7 h-7" />
              Chamar no WhatsApp
            </a>
          </Button>
        </div>

        <p className="mt-12 text-sm text-muted-foreground text-center animate-pulse">
          Já é cliente? Acesse direto através da URL específica da sua barbearia.
        </p>

      </div>
    </GlobalLayout>
  );
}
