import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, MessageCircle, User, Clock, ChevronRight, Scissors, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PremiumSkeleton, SkeletonCard } from '@/components/ui/premium-skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface BarbershopData {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  photo_url: string | null;
  city: string | null;
  google_maps_url: string | null;
}

interface PublicProfileData {
  foto_capa_url: string | null;
  logo_url: string | null;
  descricao: string | null;
  endereco: string | null;
  numero: string | null;
  cidade: string | null;
  estado: string | null;
  instagram_url: string | null;
  whatsapp_numero: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface BarberData {
  id: string;
  name: string;
  photo_url: string | null;
  is_active: boolean;
}

interface ServiceData {
  id: string;
  name: string;
  duration_minutes: number;
  barber_id: string;
}

interface GalleryImage {
  id: string;
  image_url: string;
  sort_order: number;
}

const BarbeariaPublica = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [barbershop, setBarbershop] = useState<BarbershopData | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileData | null>(null);
  const [barbers, setBarbers] = useState<BarberData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    if (slug) fetchData();
  }, [slug]);

  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => setFadeIn(true));
    }
  }, [loading]);

  const fetchData = async () => {
    try {
      // Find barbershop by slug or custom slug from public_profiles
      let shop: BarbershopData | null = null;

      // Try barbershop slug first
      const { data: bySlug } = await supabase
        .from('barbershops')
        .select('id, name, slug, phone, photo_url, city, google_maps_url')
        .eq('slug', slug!)
        .maybeSingle();

      if (bySlug) {
        shop = bySlug;
      } else {
        // Try custom slug from public_profiles
        const { data: byCustomSlug } = await supabase
          .from('public_profiles')
          .select('barbershop_id')
          .eq('slug_personalizado', slug!)
          .maybeSingle();

        if (byCustomSlug) {
          const { data: byId } = await supabase
            .from('barbershops')
            .select('id, name, slug, phone, photo_url, city, google_maps_url')
            .eq('id', byCustomSlug.barbershop_id)
            .maybeSingle();
          shop = byId;
        } else {
          // Try by ID
          const { data: byId } = await supabase
            .from('barbershops')
            .select('id, name, slug, phone, photo_url, city, google_maps_url')
            .eq('id', slug!)
            .maybeSingle();
          shop = byId;
        }
      }

      if (!shop) {
        setNotFound(true);
        return;
      }

      setBarbershop(shop);

      // Fetch everything in parallel
      const [barbersRes, servicesRes, galleryRes, profileRes] = await Promise.all([
        supabase
          .from('barbers')
          .select('id, name, photo_url, is_active')
          .eq('barbershop_id', shop.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('services')
          .select('id, name, duration_minutes, barber_id')
          .eq('barbershop_id', shop.id)
          .eq('active', true),
        supabase
          .from('barbershop_gallery')
          .select('*')
          .eq('barbershop_id', shop.id)
          .order('sort_order'),
        supabase
          .from('public_profiles')
          .select('foto_capa_url, logo_url, descricao, endereco, numero, cidade, estado, instagram_url, whatsapp_numero, latitude, longitude')
          .eq('barbershop_id', shop.id)
          .maybeSingle(),
      ]);

      setBarbers(barbersRes.data || []);
      setServices(servicesRes.data || []);
      setGallery(galleryRes.data || []);
      setPublicProfile(profileRes.data as PublicProfileData | null);
    } catch (err) {
      console.error(err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBarber = (barberId: string) => {
    setSelectedBarber(prev => prev === barberId ? null : barberId);
  };

  const handleAgendar = (barberId: string) => {
    if (barbershop) {
      navigate(`/agendar/${barbershop.slug || barbershop.id}?barber=${barberId}`);
    }
  };

  const barberServices = selectedBarber
    ? services.filter(s => s.barber_id === selectedBarber)
    : [];

  const displayCity = publicProfile?.cidade || barbershop?.city;
  const displayState = publicProfile?.estado;
  const whatsappNumber = publicProfile?.whatsapp_numero || barbershop?.phone;
  const whatsappLink = whatsappNumber
    ? `https://wa.me/55${whatsappNumber.replace(/\D/g, '')}`
    : null;
  const mapAddress = publicProfile?.endereco
    ? [publicProfile.endereco, publicProfile.numero, publicProfile.cidade, publicProfile.estado].filter(Boolean).join(', ')
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background animate-page-enter">
        <PremiumSkeleton className="w-full h-56 rounded-none" />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <PremiumSkeleton variant="avatar" className="w-20 h-20 rounded-2xl" />
            <PremiumSkeleton variant="text" className="w-48 h-7" />
            <PremiumSkeleton variant="text" className="w-64 h-4" />
            <PremiumSkeleton variant="text" className="w-32 h-4" />
          </div>
          <div className="flex justify-center gap-3 mt-2">
            <PremiumSkeleton className="w-28 h-9 rounded-full" />
            <PremiumSkeleton className="w-28 h-9 rounded-full" />
          </div>
          <div className="space-y-3 mt-4">
            <PremiumSkeleton variant="text" className="w-40 h-5" />
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <Scissors className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-bold mb-2">Barbearia não encontrada</h1>
            <p className="text-muted-foreground text-sm">
              O link que você acessou não é válido ou a barbearia não está mais disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background transition-opacity duration-700 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* Hero / Header */}
      <header className="relative overflow-hidden">
        {publicProfile?.foto_capa_url ? (
          <div className="relative h-56 sm:h-72">
            <img
              src={publicProfile.foto_capa_url}
              alt={barbershop?.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : barbershop?.photo_url ? (
          <div className="relative h-56 sm:h-72">
            <img
              src={barbershop.photo_url}
              alt={barbershop.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : (
          <div className="h-32 sm:h-44 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}

        <div className="relative -mt-16 sm:-mt-20 px-4 sm:px-6 pb-6 max-w-lg mx-auto text-center">
          {/* Logo */}
          {publicProfile?.logo_url ? (
            <img
              src={publicProfile.logo_url}
              alt="Logo"
              className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover ring-4 ring-background shadow-lg"
            />
          ) : !publicProfile?.foto_capa_url && !barbershop?.photo_url ? (
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center border-2 border-border bg-card shadow-lg">
              <Scissors className="h-8 w-8 text-primary" />
            </div>
          ) : null}

          <h1 className="text-2xl sm:text-3xl font-bold">{barbershop?.name}</h1>

          {/* Description */}
          {publicProfile?.descricao && (
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">{publicProfile.descricao}</p>
          )}

          {/* Location */}
          {(displayCity || displayState) && (
            <p className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mt-2">
              <MapPin className="h-3.5 w-3.5" />
              {[displayCity, displayState].filter(Boolean).join(' - ')}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center mt-5 flex-wrap">
            {publicProfile?.instagram_url && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={() => window.open(publicProfile.instagram_url!, '_blank')}
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </Button>
            )}
            {whatsappLink && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={() => window.open(whatsappLink, '_blank')}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            )}
            {(barbershop?.google_maps_url || mapAddress) && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2"
                onClick={() => {
                  if (barbershop?.google_maps_url) {
                    window.open(barbershop.google_maps_url, '_blank');
                  } else if (mapAddress) {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddress)}`, '_blank');
                  }
                }}
              >
                <MapPin className="h-4 w-4" />
                Ver no mapa
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-12 max-w-lg mx-auto space-y-8">
        {/* Map Embed */}
        {mapAddress && (
          <section className="animate-in fade-in duration-500">
            <div className="rounded-xl overflow-hidden border border-border h-48">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`}
              />
            </div>
          </section>
        )}

        {/* Barbers Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Nossos Profissionais</h2>
          {barbers.length === 0 ? (
            <EmptyState
              icon={User}
              title="Nenhum profissional disponível"
              description="Esta barbearia ainda não possui profissionais cadastrados."
            />
          ) : (
          <div className="space-y-3">
            {barbers.map((barber, i) => (
              <Card
                key={barber.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedBarber === barber.id
                    ? 'ring-2 ring-primary shadow-lg'
                    : ''
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => handleSelectBarber(barber.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {barber.photo_url ? (
                    <img
                      src={barber.photo_url}
                      alt={barber.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{barber.name}</h3>
                    <p className="text-sm text-muted-foreground">Profissional</p>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${selectedBarber === barber.id ? 'rotate-90' : ''}`} />
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </section>

        {/* Services + Booking after barber selection */}
        {selectedBarber && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-lg font-semibold mb-4">Serviços</h2>
            {barberServices.length > 0 ? (
              <div className="space-y-2">
                {barberServices.map(service => (
                  <Card key={service.id} className="transition-all duration-200 hover:shadow-md">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                        <Scissors className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{service.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.duration_minutes} min
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Scissors}
                title="Nenhum serviço disponível"
                description="Este profissional ainda não possui serviços cadastrados."
              />
            )}

            <Button
              className="w-full mt-6 btn-primary-gradient h-12 text-base rounded-xl transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              onClick={() => handleAgendar(selectedBarber)}
            >
              Agendar com este profissional
            </Button>
          </section>
        )}

        {/* Gallery Section */}
        {gallery.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Galeria</h2>
            <div className="grid grid-cols-3 gap-2">
              {gallery.map(img => (
                <div key={img.id} className="aspect-square rounded-xl overflow-hidden">
                  <img
                    src={img.image_url}
                    alt="Foto da barbearia"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-4 pb-2">
          <p className="text-xs text-muted-foreground">
            Agendamento online por <span className="font-semibold text-foreground">Bookify</span>
          </p>
        </footer>
      </main>

      {/* Floating WhatsApp Button */}
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: 'hsl(142, 71%, 45%)' }}
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </a>
      )}
    </div>
  );
};

export default BarbeariaPublica;
