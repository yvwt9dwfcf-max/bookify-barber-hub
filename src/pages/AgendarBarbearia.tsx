import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Barber, Barbershop } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Building2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const AgendarBarbearia = () => {
  const { barbershopId } = useParams<{ barbershopId: string }>();
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [subscriptionInactive, setSubscriptionInactive] = useState(false);

  useEffect(() => {
    if (barbershopId) {
      fetchBarbershopData();
    }
  }, [barbershopId]);

  const fetchBarbershopData = async () => {
    try {
      // Fetch barbershop
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .maybeSingle();

      if (shopError) throw shopError;
      
      if (!shopData) {
        setNotFound(true);
        return;
      }

      setBarbershop(shopData as Barbershop);

      // Check if subscription is active
      if (!shopData.subscription_active) {
        setSubscriptionInactive(true);
        return;
      }

      // Fetch active barbers from this barbershop
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('name');

      if (barbersError) throw barbersError;
      setBarbers(barbersData || []);
    } catch (error) {
      console.error('Erro ao buscar barbearia:', error);
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
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h1 className="text-xl font-bold mb-2">Barbearia não encontrada</h1>
                <p className="text-muted-foreground mb-6">
                  O link que você acessou não é válido ou a barbearia não está mais disponível.
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
                  Esta barbearia está temporariamente sem aceitar novos agendamentos.
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
              {barbershop?.name}
            </h1>
            <p className="text-muted-foreground">
              Escolha um profissional para agendar seu horário
            </p>
          </div>
          <BookingFlow 
            barbershopId={barbershopId} 
            availableBarbers={barbers}
          />
        </div>
      </main>
    </div>
  );
};

export default AgendarBarbearia;
