import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export default function RootPage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <h1 className="text-4xl font-serif font-bold mb-6">KingBarber</h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-lg">
          Transformamos barbearias em negócios digitais de alta performance. 
          Deseja ter o seu próprio sistema de agendamento?
        </p>
        
        <div className="bg-card border border-border/50 p-8 rounded-2xl shadow-xl max-w-sm w-full transition-all hover:border-primary/50">
          <h2 className="text-2xl font-semibold mb-4">Entre em Contato</h2>
          <p className="text-muted-foreground mb-8">
            Fale conosco agora mesmo para criar a sua barbearia digital.
          </p>
          
          <Button asChild className="w-full h-12 text-lg gap-2 bg-[#25D366] hover:bg-[#128C7E] border-none">
            <a 
              href="https://wa.me/5513982046758" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-6 h-6" />
              WhatsApp
            </a>
          </Button>
        </div>
        
        <p className="mt-12 text-sm text-muted-foreground">
          Já é cliente? Acesse o link direto da sua barbearia.
        </p>
      </div>
    </Layout>
  );
}
