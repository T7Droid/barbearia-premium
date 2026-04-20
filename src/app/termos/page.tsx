import { Layout } from "@/components/layout";

export default function TermosPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold mb-8 text-center text-foreground">Termos e Condições de Uso</h1>
        
        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section className="bg-muted/20 p-6 rounded-xl border border-border/50">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Natureza da Plataforma</h2>
            <p>
              A <strong>King Barber</strong> é uma plataforma tecnológica que atua como intermediária entre Clientes, Barbeiros Profissionais e Estabelecimentos (Barbearias). 
              Nossa função é facilitar o agendamento de serviços e o processamento de pagamentos, não sendo a King Barber a prestadora direta dos serviços de barbearia.
              A plataforma King Barber não possui nenhum vínculo empregatício, societário ou de representação comercial com os Estabelecimentos ou Barbeiros Profissionais cadastrados. Toda a relação de prestação de serviço ocorre estritamente e diretamente entre o Cliente e o Barbeiro/Estabelecimento escolhido.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">2. Sistema de Pagamentos (Mercado Pago)</h2>
            <p>
              A plataforma utiliza o sistema do <strong>Mercado Pago</strong> para o processamento de transações financeiras.
            </p>
            <ul className="list-decimal pl-6 space-y-3 mt-4">
              <li>Ao realizar um pagamento antecipado, os valores são direcionados diretamente para a conta do Mercado Pago configurada pelo Estabelecimento ou Barbeiro responsável.</li>
              <li>A plataforma não retém os valores destinados aos prestadores, atuando apenas como o canal tecnológico para a transação.</li>
              <li>Questões relacionadas a falhas de processamento no cartão ou estornos devem ser verificadas junto ao Mercado Pago e ao Estabelecimento prestador.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">3. Agendamentos e Responsabilidades</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="bg-accent/10 p-4 rounded-lg">
                <h3 className="text-foreground font-bold mb-2 uppercase text-sm tracking-widest">Do Barbeiro / Estabelecimento</h3>
                <p className="text-sm">Responsável exclusivo pela prestação do serviço, qualidade, atendimento ao cliente, eventuais danos físicos ou materiais ocorridos durante o serviço, e pelo recolhimento de seus respectivos tributos.</p>
              </div>
              <div className="bg-accent/10 p-4 rounded-lg">
                <h3 className="text-foreground font-bold mb-2 uppercase text-sm tracking-widest">Do Cliente</h3>
                <p className="text-sm">Responsável por fornecer dados precisos, comparecer ao local no horário agendado e realizar o cancelamento dentro do prazo permitido caso necessário.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">4. Cancelamentos e Reembolsos</h2>
            <p>
              O prazo para cancelamento com direito a reembolso total (quando aplicável) é de <strong>24 horas de antecedência</strong>, a menos que o Estabelecimento específico defina um prazo diferente em suas configurações.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Cancelamentos fora do prazo podem resultar na retenção de parte ou da totalidade do valor pago antecipadamente, conforme política de cada barbearia.</li>
              <li>A solicitação de estorno de valores já transferidos para o barbeiro deve ser tratada diretamente com o mesmo ou com a gerência do estabelecimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 border-b border-border/50 pb-2">5. Privacidade e Dados</h2>
            <p>
              Ao realizar um agendamento, você autoriza o compartilhamento de seus dados de contato (Nome, E-mail e Telefone) com o estabelecimento e/ou profissional escolhido, para fins exclusivos de coordenação do serviço. Seus dados financeiros são processados diretamente pelo Mercado Pago, sob seus padrões de segurança.
            </p>
          </section>

          <section className="bg-destructive/10 p-6 rounded-xl border border-destructive/20 mt-8">
            <h2 className="text-2xl font-serif font-semibold text-destructive mb-4">6. Limitação de Responsabilidade</h2>
            <p className="text-foreground font-medium">
              A King Barber, por ser apenas a provedora da infraestrutura tecnológica (software), não se responsabiliza por:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4 text-sm">
              <li>Insatisfação estrutural ou técnica com os cortes e serviços prestados.</li>
              <li>Atrasos ou não comparecimento de qualquer uma das pontas (Cliente, Barbeiro ou Estabelecimento).</li>
              <li>Acidentes, lesões, furtos ou danos morais e materiais ocorridos fisicamente dentro do estabelecimento ou durante o trajeto.</li>
              <li>Conflitos trabalhistas, cíveis ou tributários decorrentes da relação autônoma entre o Estabelecimento e o Profissional Barbeiro.</li>
            </ul>
          </section>

          <section className="border-t border-border/50 pt-8 mt-12">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">7. Contatos e Suporte</h2>
            <p>
              Dúvidas sobre o funcionamento técnico da plataforma: <strong>thyagoneves.sa@gmail.com</strong><br />
              Dúvidas sobre serviços, horários ou pagamentos específicos: Entre em contato diretamente com a barbearia através do canal disponibilizado no perfil da mesma.
            </p>
          </section>
        </div>
        
        <div className="mt-16 text-center text-xs text-muted-foreground bg-muted/10 py-4 rounded-lg">
          Última atualização: {new Date().toLocaleDateString('pt-BR')} | King Barbers Marketplace
        </div>
      </div>
    </Layout>
  );
}
