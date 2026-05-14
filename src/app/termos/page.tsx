import { GlobalLayout } from "@/components/global-layout";

export default function TermosPage() {
  return (
    <GlobalLayout>
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold mb-8 text-center text-foreground">Termos e Condições de Uso</h1>
        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section className="bg-primary/10 p-6 rounded-xl border border-primary/20">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao utilizar a plataforma <strong>KingBarbers</strong>, seja para agendamento de serviços, cadastro de estabelecimento ou simples navegação, você declara estar plenamente de acordo com todos os termos e condições aqui descritos. Caso não concorde com qualquer disposição, você deve interromper o uso do sistema imediatamente.
            </p>
          </section>

          <section className="bg-muted/20 p-6 rounded-xl border border-border/50">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">2. Período de Experiência (Trial)</h2>
            <p>
              A KingBarbers pode oferecer um período de teste gratuito para novos Estabelecimentos. A duração deste período é definida pela KingBarbers e pode ser alterada a qualquer momento sem aviso prévio para novos cadastros.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-sm">
              <li><strong>Encerramento do Teste:</strong> Ao final do período de teste, o acesso às funcionalidades administrativas e de recebimento de agendamentos será suspenso até que um dos planos pagos seja assinado.</li>
              <li><strong>Assinatura Antecipada:</strong> Caso o usuário opte por assinar um plano pago <strong>antes</strong> do término do período de teste gratuito, o período de teste remanescente será automaticamente cancelado e a contagem da assinatura mensal paga terá início imediato.</li>
              <li>Os dados cadastrados durante o período de teste serão preservados por um período limitado após o término do trial, para que o usuário possa reativar a conta mediante assinatura.</li>
            </ul>
          </section>

          <section className="bg-muted/20 p-6 rounded-xl border border-border/50">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">3. Natureza da Plataforma</h2>
            <p>
              A <strong>KingBarbers</strong> é uma plataforma tecnológica que atua como intermediária entre Clientes, Barbeiros Profissionais e Estabelecimentos (Barbearias). 
              Nossa função é facilitar o agendamento de serviços e o processamento de pagamentos, não sendo a KingBarbers a prestadora direta dos serviços de barbearia.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">4. Sistema de Pagamentos (Mercado Pago)</h2>
            <p>
              A plataforma utiliza o sistema do <strong>Mercado Pago</strong> para o processamento de transações financeiras.
            </p>
            <ul className="list-decimal pl-6 space-y-3 mt-4">
              <li>Ao realizar um pagamento antecipado, os valores são direcionados diretamente para a conta do Mercado Pago configurada pelo Estabelecimento responsável.</li>
              <li>A plataforma não retém os valores destinados aos prestadores, atuando apenas como o canal tecnológico para a transação.</li>
              <li><strong>Taxas de Processamento:</strong> O processamento de pagamentos está sujeito às taxas operacionais cobradas exclusivamente pelo Mercado Pago. <a href="https://www.mercadopago.com.br/knowledge-hub/tabela-taxas-tarifas_45243" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Consulte as taxas vigentes clicando aqui</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">5. Agendamentos e Cadastro</h2>
            <p className="mb-4">
              Para garantir a segurança e a integridade das informações, a gestão de agendamentos segue as seguintes regras:
            </p>
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div className="bg-accent/10 p-4 rounded-lg border border-primary/20">
                <h3 className="text-primary font-bold mb-2 uppercase text-xs tracking-widest">Obrigatoriedade de Cadastro</h3>
                <p className="text-sm">Para que o Cliente possa <strong>cancelar, remarcar ou visualizar seu histórico de agendamentos</strong>, é obrigatória a realização de um cadastro (conta de usuário) na plataforma. Agendamentos realizados sem login podem ser limitados em sua gestão posterior.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">6. Cancelamentos e Reembolsos</h2>
            <p>
              O prazo para cancelamento com direito a reembolso total é de <strong>24 horas de antecedência</strong>, a menos que o Estabelecimento específico defina um prazo diferente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">7. Privacidade e Dados</h2>
            <p className="mb-4">
              Ao realizar um agendamento, você autoriza o compartilhamento de seus dados de contato com o estabelecimento escolhido.
            </p>
            <div className="text-sm bg-muted/20 p-4 rounded-lg border border-border/50">
              <p>
                <strong>Exclusão de Dados:</strong> Os usuários podem solicitar a exclusão de seus dados através do e-mail de suporte, observadas as obrigações legais de retenção descritas em nossa <a href="/privacidade" className="text-primary hover:underline">Política de Privacidade</a>.
              </p>
            </div>
          </section>

          <section className="bg-destructive/10 p-6 rounded-xl border border-destructive/20 mt-8">
            <h2 className="text-2xl font-serif font-semibold text-destructive mb-4">8. Limitação de Responsabilidade</h2>
            <p className="text-foreground font-medium">
              A KingBarbers não se responsabiliza por:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-sm">
              <li>Insatisfação com os serviços prestados pelos estabelecimentos.</li>
              <li>Atrasos ou não comparecimento de qualquer uma das partes.</li>
              <li>Danos físicos, materiais ou morais ocorridos dentro do estabelecimento.</li>
            </ul>
          </section>

          <section className="border-t border-border/50 pt-8 mt-12">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">9. Contatos e Suporte</h2>
            <p>
              Dúvidas técnicas: <strong>thyagoneves.sa@gmail.com</strong><br />
              Dúvidas sobre serviços ou pagamentos: Entre em contato diretamente com a barbearia.
            </p>
          </section>
        </div>

        <div className="mt-16 text-center text-xs text-muted-foreground bg-muted/10 py-4 rounded-lg">
          Última atualização: {new Date().toLocaleDateString('pt-BR')} | KingBarbers Marketplace
        </div>
      </div>
    </GlobalLayout>
  );
}
