import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, Barber, Barbershop } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { Loader2, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const AgendarBarbearia = () => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slugOrId) {
      fetchBarbershopData();
    }
  }, [slugOrId]);

  const fetchBarbershopData = async () => {
    try {
      // Try to find by slug first, then by ID
      let shopData: any = null;

      // Try slug
      const { data: bySlug } = await supabase
        .from('barbershops')
        .select('*')
        .eq('slug', slugOrId)
        .maybeSingle();

      if (bySlug) {
        shopData = bySlug;
      } else {
        // Fallback to ID (for backward compatibility)
        const { data: byId } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', slugOrId)
          .maybeSingle();
        shopData = byId;
      }

      if (!shopData) {
        setNotFound(true);
        return;
      }

      setBarbershop(shopData as Barbershop);

      // Fetch active barbers from this barbershop
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', shopData.id)
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
          <div className="max-w-7xl mx-auto">
            <Logo linkTo={undefined} />
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
                <p className="text-muted-foreground">
                  O link que você acessou não é válido ou a barbearia não está mais disponível.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Clean, no admin links */}
      <header className="section-padding py-4 border-b border-border/50">
        <div className="max-w-7xl mx-auto">
          <Logo linkTo={undefined} />
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
            barbershopId={barbershop?.id} 
            availableBarbers={barbers}
          />
        </div>
      </main>
    </div>
  );
};

export default AgendarBarbearia;
