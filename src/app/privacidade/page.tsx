import { Layout } from "@/components/layout";

export default function PrivacidadePage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-serif font-bold mb-8 text-center">Política de Privacidade</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Coleta de Dados</h2>
            <p>
              Coletamos informações básicas como nome, e-mail e telefone para possibilitar o agendamento de serviços e a comunicação sobre suas reservas. 
              Dados de pagamento são processados de forma segura e não são armazenados em nossos servidores.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">2. Uso das Informações</h2>
            <p>
              Suas informações são utilizadas exclusivamente para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Confirmar e gerenciar seus agendamentos;</li>
              <li>Enviar lembretes e atualizações sobre serviços;</li>
              <li>Gerenciar seu saldo de pontos no programa de fidelidade;</li>
              <li>Personalizar sua experiência em nossa barbearia.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">3. Proteção de Dados</h2>
            <p>
              Implementamos medidas de segurança para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição. 
              Utilizamos tecnologias modernas para garantir a integridade dos seus dados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">4. Cookies</h2>
            <p>
              Utilizamos cookies para melhorar a funcionalidade do site e lembrar suas preferências (como login e configurações de visualização). 
              Você pode desativar os cookies nas configurações do seu navegador, embora isso possa afetar algumas funcionalidades do sistema.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">5. Seus Direitos</h2>
            <p>
              Você tem o direito de acessar, corrigir ou solicitar a exclusão de seus dados pessoais a qualquer momento através das configurações do seu perfil ou entrando em contato conosco.
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
