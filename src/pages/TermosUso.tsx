import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermosUso = () => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/" />
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-[calc(7rem+env(safe-area-inset-top))] pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto prose prose-invert prose-green">
          <h1 className="text-3xl font-bold text-foreground mb-8">Termos de Uso – Bookify</h1>

          <p className="text-muted-foreground leading-relaxed mb-6">
            Ao utilizar o Bookify, o usuário concorda:
          </p>

          <ol className="text-muted-foreground space-y-4 list-decimal pl-6">
            <li>O Bookify é uma plataforma de agendamento e gestão para barbearias.</li>
            <li>O usuário é responsável pelas informações inseridas.</li>
            <li>O plano contratado será cobrado conforme regras do período gratuito (quando aplicável).</li>
            <li>Após o período de teste, o acesso pode ser bloqueado por falta de pagamento.</li>
            <li>O uso indevido pode resultar em suspensão da conta.</li>
            <li>Os termos podem ser atualizados.</li>
          </ol>
        </div>
      </main>
    </div>
  );
};

export default TermosUso;
