import { Layout } from "@/components/layout";

export default function TermosPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold mb-8 text-center">Termos de Uso</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar o sistema de agendamento da Barber Premium, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
              Este sistema é destinado a facilitar a reserva de serviços de barbearia de forma prática e segura.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">2. Agendamentos e Cancelamentos</h2>
            <p>
              Os agendamentos realizados através deste portal estão sujeitos à disponibilidade dos profissionais. 
              Reservamo-nos o direito de cancelar ou reagendar serviços em casos de força maior, garantindo sempre a comunicação prévia ao cliente.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cancelamentos devem ser feitos com no mínimo 2 horas de antecedência.</li>
              <li>O não comparecimento sem aviso prévio pode resultar na suspensão do direito de agendamento online.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">3. Pagamentos e Reembolsos</h2>
            <p>
              Para serviços que exigem pagamento antecipado, o reembolso total será processado apenas para cancelamentos realizados dentro do prazo estipulado. 
              Em casos de reagendamento, o crédito será transferido automaticamente para a nova data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">4. Fidelidade e Pontos</h2>
            <p>
              O sistema de pontos de fidelidade é um benefício exclusivo para clientes cadastrados. 
              Os pontos são pessoais, intransferíveis e possuem validade de 12 meses a partir da data de aquisição.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">5. Contato</h2>
            <p>
              Para dúvidas sobre estes termos, entre em contato através do nosso WhatsApp de suporte ou pelo e-mail contato@barbeariapremium.com.
            </p>
          </section>
        </div>
        <div className="mt-12 text-center text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>
    </Layout>
  );
}
