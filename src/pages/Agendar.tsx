import { Logo } from '@/components/ui/Logo';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Agendar = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="section-padding py-4 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo />
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      {/* Booking Flow */}
      <main className="section-padding py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Agende seu horário
            </h1>
            <p className="text-muted-foreground">
              Siga os passos abaixo para agendar seu atendimento
            </p>
          </div>
          <BookingFlow />
        </div>
      </main>
    </div>
  );
};

export default Agendar;
