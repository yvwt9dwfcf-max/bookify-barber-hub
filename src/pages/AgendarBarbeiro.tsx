import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, Barber } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { UserX } from 'lucide-react';
import { PremiumSkeleton, SkeletonCard } from '@/components/ui/premium-skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { BookingAppearance, DEFAULT_BOOKING_APPEARANCE } from '@/components/booking/bookingAppearance';

const BookingFlow = lazy(() => import('@/components/booking/BookingFlow').then(m => ({ default: m.BookingFlow })));

const AgendarBarbeiro = () => {
  const { barberId } = useParams<{ barberId: string }>();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [appearance, setAppearance] = useState<BookingAppearance>(DEFAULT_BOOKING_APPEARANCE);

  useEffect(() => {
    if (barberId) {
      fetchBarber();
    }
  }, [barberId]);

  const fetchBarber = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name, photo_url, is_active, barbershop_id')
        .eq('id', barberId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setNotFound(true);
      } else {
        setBarber(data as unknown as Barber);
        if (data.barbershop_id) {
          const [{ data: profile }, { data: shop }] = await Promise.all([
            supabase
              .from('public_profiles')
              .select('theme_style, font_style, accent_color, logo_url')
              .eq('barbershop_id', data.barbershop_id)
              .maybeSingle(),
            supabase
              .from('barbershops')
              .select('name')
              .eq('id', data.barbershop_id)
              .maybeSingle(),
          ]);
          setAppearance({
            themeStyle: profile?.theme_style === 'urbano' ? 'urbano' : 'editorial',
            fontStyle: profile?.font_style === 'luckiest_guy' ? 'luckiest_guy' : 'playfair',
            accentColor: profile?.accent_color || '#4da6ff',
            shopName: shop?.name,
            logoUrl: profile?.logo_url,
          });
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
      <div className="min-h-screen bg-background animate-page-enter">
        <div className="px-4 sm:px-6 py-4 border-b border-border/50 bg-card/80 backdrop-blur-xl">
          <PremiumSkeleton className="w-28 h-8" />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <PremiumSkeleton variant="text" className="w-48 h-8" />
            <PremiumSkeleton variant="text" className="w-64 h-4" />
          </div>
          <div className="space-y-3 mt-4">
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
                  <UserX className="h-8 w-8 text-muted-foreground" />
                </div>
                <h1 className="text-xl font-bold mb-2">Profissional não encontrado</h1>
                <p className="text-muted-foreground">
                  O link que você acessou não é válido ou o profissional não está mais disponível.
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
      <header className="section-padding py-4 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {appearance.logoUrl ? (
            <img
              src={appearance.logoUrl}
              alt={`Logo da ${appearance.shopName ?? 'barbearia'}`}
              className={`w-10 h-10 object-cover ${appearance.themeStyle === 'urbano' ? 'rounded-xl border-2' : 'rounded-lg'}`}
              style={{ borderColor: appearance.themeStyle === 'urbano' ? appearance.accentColor : undefined }}
            />
          ) : null}
          <span className={`${appearance.themeStyle === 'urbano' ? 'font-urban-preview uppercase text-xl' : 'font-display text-lg font-semibold'}`}>
            {appearance.shopName || 'Bookify'}
          </span>
        </div>
      </header>

      {/* Booking Flow */}
      <main className="section-padding py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className={`${appearance.themeStyle === 'urbano' ? 'font-urban-preview uppercase text-3xl md:text-4xl' : 'font-display text-2xl md:text-3xl font-bold'} mb-2`}>
              {appearance.themeStyle === 'urbano' ? (
                <><span style={{ color: appearance.accentColor }}>Agende com</span> {barber?.name}</>
              ) : `Agende com ${barber?.name}`}
            </h1>
            <p className="text-muted-foreground">
              Escolha o serviço e horário para seu atendimento
            </p>
          </div>
          <Suspense fallback={<SkeletonCard />}>
            <BookingFlow preselectedBarber={barber} barbershopId={barber?.barbershop_id || undefined} appearance={appearance} />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AgendarBarbeiro;
