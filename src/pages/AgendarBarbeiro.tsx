import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Barber, Barbershop } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, UserX, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const AgendarBarbeiro = () => {
  const { barberId } = useParams<{ barberId: string }>();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [subscriptionInactive, setSubscriptionInactive] = useState(false);

  useEffect(() => {
    if (barberId) {
      fetchBarber();
    }
  }, [barberId]);

  const fetchBarber = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', barberId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setNotFound(true);
      } else {
        setBarber(data);

        // Check if barbershop subscription is active
        if (data.barbershop_id) {
          const { data: shopData } = await supabase
            .from('barbershops')
            .select('subscription_active')
            .eq('id', data.barbershop_id)
            .maybeSingle();

          if (shopData && !shopData.subscription_active) {
            setSubscriptionInactive(true);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar barbeiro:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
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

        <main className="section-padding py-12">
          <div className="max-w-md mx-auto text-center">
            <Card>
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  <UserX className="h-8 w-8 text-muted-foreground" />
                </div>
                <h1 className="text-xl font-bold mb-2">Profissional não encontrado</h1>
                <p className="text-muted-foreground mb-6">
                  O link que você acessou não é válido ou o profissional não está mais disponível.
                </p>
                <Button asChild className="btn-primary-gradient">
                  <Link to="/agendar">
                    Ver todos os profissionais
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (subscriptionInactive) {
    return (
      <div className="min-h-screen bg-background">
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

        <main className="section-padding py-12">
          <div className="max-w-md mx-auto text-center">
            <Card>
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-full bg-warning/10 mx-auto flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                </div>
                <h1 className="text-xl font-bold mb-2">Agendamentos indisponíveis</h1>
                <p className="text-muted-foreground mb-6">
                  Este profissional está temporariamente sem aceitar novos agendamentos.
                </p>
                <Button asChild className="btn-primary-gradient">
                  <Link to="/">
                    Voltar ao início
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

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
              Agende com {barber?.name}
            </h1>
            <p className="text-muted-foreground">
              Escolha o serviço e horário para seu atendimento
            </p>
          </div>
          <BookingFlow preselectedBarber={barber} />
        </div>
      </main>
    </div>
  );
};

export default AgendarBarbeiro;
