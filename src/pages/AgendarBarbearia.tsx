import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase, Barber, Barbershop } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { Building2 } from 'lucide-react';
import { PremiumSkeleton, SkeletonCard } from '@/components/ui/premium-skeleton';
import { Card, CardContent } from '@/components/ui/card';

const BookingFlow = lazy(() => import('@/components/booking/BookingFlow').then(m => ({ default: m.BookingFlow })));

const AgendarBarbearia = () => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const [searchParams] = useSearchParams();
  const preselectedBarberId = searchParams.get('barber');
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [preselectedBarber, setPreselectedBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bookingBlocked, setBookingBlocked] = useState<string | null>(null);

  useEffect(() => {
    if (slugOrId) {
      fetchBarbershopData();
    }
  }, [slugOrId]);

  const fetchBarbershopData = async () => {
    try {
      let shopData: any = null;

      const shopCols = 'id, name, slug, phone, photo_url, city, google_maps_url';
      const { data: bySlug } = await supabase
        .from('barbershops')
        .select(shopCols)
        .eq('slug', slugOrId)
        .maybeSingle();

      if (bySlug) {
        shopData = bySlug;
      } else {
        const { data: byId } = await supabase
          .from('barbershops')
          .select(shopCols)
          .eq('id', slugOrId)
          .maybeSingle();
        shopData = byId;
      }

      if (!shopData) {
        setNotFound(true);
        return;
      }

      setBarbershop(shopData as Barbershop);

      // Check booking availability gating from public_profiles
      const { data: profile } = await supabase
        .from('public_profiles')
        .select('booking_enabled, booking_24h, booking_start_time, booking_end_time')
        .eq('barbershop_id', shopData.id)
        .maybeSingle();

      if (profile) {
        const enabled = (profile as any).booking_enabled ?? true;
        const h24 = (profile as any).booking_24h ?? true;
        const start = ((profile as any).booking_start_time || '08:00').slice(0, 5);
        const end = ((profile as any).booking_end_time || '22:00').slice(0, 5);
        const toMin = (s: string) => {
          const [h, m] = s.split(':').map(Number);
          return (h || 0) * 60 + (m || 0);
        };
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (!enabled) {
          setBookingBlocked('Agendamento online indisponível no momento.');
        } else if (!h24 && (nowMin < toMin(start) || nowMin >= toMin(end))) {
          setBookingBlocked(`Os agendamentos estarão disponíveis a partir das ${start}.`);
        }
      }

      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('id, name, photo_url, is_active, barbershop_id')
        .eq('barbershop_id', shopData.id)
        .eq('is_active', true)
        .order('name');

      if (barbersError) throw barbersError;
      setBarbers((barbersData || []) as unknown as Barber[]);

      // Pre-select barber if specified in URL
      if (preselectedBarberId && barbersData) {
        const found = barbersData.find(b => b.id === preselectedBarberId);
        if (found) setPreselectedBarber(found as Barber);
      }
    } catch (error) {
      console.error('Erro ao buscar barbearia:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background animate-page-enter">
        <div className="px-4 sm:px-6 py-4 border-b border-border/50 bg-card/80 backdrop-blur-xl">
          <PremiumSkeleton className="w-28 h-8" />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <PremiumSkeleton variant="text" className="w-56 h-8" />
            <PremiumSkeleton variant="text" className="w-72 h-4" />
          </div>
          <div className="space-y-3 mt-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <header className="px-4 sm:px-6 py-4 border-b border-border/50 bg-card/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto">
            <Logo linkTo={undefined} />
          </div>
        </header>

        <main className="px-4 sm:px-6 py-12">
          <div className="max-w-md mx-auto text-center">
            <Card className="border-border/40">
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--primary-gradient)', opacity: 0.15 }}>
                  <Building2 className="h-8 w-8 text-primary" />
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      {/* Header — fixo com blur */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 py-4 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <Logo linkTo={undefined} />
        </div>
      </header>

      {/* Booking Flow */}
      <main className="relative z-10 px-4 sm:px-6 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {barbershop?.name}
            </h1>
          </div>
          {bookingBlocked ? (
            <Card className="max-w-md mx-auto border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/15">
                  <Building2 className="h-6 w-6 text-amber-500" />
                </div>
                <h2 className="text-lg font-semibold">Agenda indisponível</h2>
                <p className="text-sm text-muted-foreground">{bookingBlocked}</p>
              </CardContent>
            </Card>
          ) : (
            <Suspense fallback={<SkeletonCard />}>
              <BookingFlow
                barbershopId={barbershop?.id}
                availableBarbers={barbers}
                preselectedBarber={preselectedBarber}
              />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
};

export default AgendarBarbearia;
