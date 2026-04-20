import { GlobalLayout } from "@/components/global-layout";

export default function PrivacidadePage() {
  return (
    <GlobalLayout>
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold mb-8 text-center text-foreground">Política de Privacidade</h1>
        
        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section className="bg-muted/20 p-6 rounded-xl border border-border/50">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Compromisso com sua Privacidade</h2>
            <p>
              A <strong>King Barber</strong> valoriza a segurança e a privacidade dos dados de seus usuários (Clientes e Barbeiros). Esta política descreve como coletamos, usamos e protegemos suas informações de acordo com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">2. Dados Coletados</h2>
            <p>Coletamos informações necessárias para a prestação dos nossos serviços, incluindo:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><strong>Dados Cadastrais:</strong> Nome completo, e-mail, telefone e senha.</li>
              <li><strong>Dados de Transação:</strong> Histórico de agendamentos, serviços contratados e status de pagamentos.</li>
              <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, identificadores de dispositivo e tokens de notificação (FCM) para envio de alertas.</li>
              <li><strong>Dados de Pagamento:</strong> Processados diretamente pelo Mercado Pago. Não armazenamos números de cartão de crédito em nossa base de dados.</li>
              <li><strong>Para Barbeiros/Profissionais:</strong> Além dos dados cadastrais, tratamos dados da sua agenda profissional, métricas de desempenho e configurações de disponibilidade para o funcionamento do painel profissional.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">3. Uso das Informações</h2>
            <p>Seus dados são utilizados para as seguintes finalidades:</p>
            <ul className="list-decimal pl-6 space-y-2 mt-2">
              <li>Viabilizar e gerenciar agendamentos de serviços.</li>
              <li>Processar pagamentos via sistemas de parceiros.</li>
              <li>Envio de notificações de confirmação, lembretes e marketing (quando autorizado).</li>
              <li>Manutenção do programa de fidelidade e pontuação.</li>
              <li>Segurança da plataforma e prevenção contra fraudes.</li>
            </ul>
          </section>

          <section className="bg-primary/5 p-6 rounded-xl border border-primary/20">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">4. Compartilhamento de Dados (Marketplace)</h2>
            <p className="mb-4">
              Pela natureza do nosso serviço, seus dados de contato (Nome, E-mail e Telefone) são compartilhados tanto com o <strong>Estabelecimento</strong> quanto diretamente com o <strong>Profissional Barbeiro</strong> escolhido para a realização do serviço.
            </p>
            <div className="text-sm border-l-4 border-primary pl-4 py-2 italic text-foreground">
              <strong>IMPORTANTE:</strong> Ambos (Estabelecimento e Barbeiro) tornam-se Controladores Independentes após o recebimento dos dados na plataforma. A King Barber não se responsabiliza pelo uso das informações feito pelos parceiros fora do escopo do agendamento técnico e da intermediação pontual na plataforma.
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">5. Provedores de Serviço (Operadores)</h2>
            <p>Compartilhamos dados com provedores tecnológicos estritamente para a operação do sistema:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Mercado Pago:</strong> Processamento de pagamentos.</li>
              <li><strong>Supabase / Google Cloud / Vercel:</strong> Armazenamento e hospedagem de dados com altos padrões de criptografia.</li>
              <li><strong>Firebase:</strong> Gestão e envio de notificações push.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">6. Seus Direitos (LGPD)</h2>
            <p>Como titular dos dados, você possui direitos que podem ser exercidos a qualquer momento:</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-sm font-medium">
              <li className="flex items-center gap-2">✓ Confirmação da existência de tratamento</li>
              <li className="flex items-center gap-2">✓ Acesso aos dados</li>
              <li className="flex items-center gap-2">✓ Correção de dados incompletos ou inexatos</li>
              <li className="flex items-center gap-2">✓ Portabilidade dos dados</li>
              <li className="flex items-center gap-2">✓ Eliminação de dados pessoais</li>
              <li className="flex items-center gap-2">✓ Revogação do consentimento</li>
            </ul>
          </section>

          <section className="border-t border-border/50 pt-8 mt-12">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">7. Contato e Encarregado de Dados (DPO)</h2>
            <p>
              Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato com nosso Encarregado de Proteção de Dados pelo e-mail: <strong>thyagoneves.sa@gmail.com</strong>.
            </p>
          </section>
        </div>
        
        <div className="mt-16 text-center text-xs text-muted-foreground bg-muted/10 py-4 rounded-lg">
          Última atualização: {new Date().toLocaleDateString('pt-BR')} | Em conformidade com a LGPD Brasileira.
        </div>
      </div>
    </GlobalLayout>
  );
}
