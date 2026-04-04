import { useState, useEffect } from 'react';
import { supabase, Service } from '@/lib/supabase';
import { Sparkles as Scissors, Timer as Clock } from 'lucide-react';
import { PremiumSkeleton, SkeletonCard } from '@/components/ui/premium-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ServiceSelectionProps {
  barberId: string;
  onSelect: (service: Service) => void;
  onAutoSelect?: (service: Service) => void;
}

interface ServiceWithPhoto extends Service {
  barberPhotoUrl?: string | null;
}

export function ServiceSelection({ barberId, onSelect, onAutoSelect }: ServiceSelectionProps) {
  const [services, setServices] = useState<ServiceWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, [barberId]);

  const fetchServices = async () => {
    try {
      const { data: barberData, error: barberError } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('id', barberId)
        .maybeSingle();

      if (barberError) throw barberError;
      
      if (!barberData?.barbershop_id) {
        setServices([]);
        setLoading(false);
        return;
      }

      const { data: globalServices, error: globalError } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barberData.barbershop_id)
        .eq('active', true)
        .eq('is_global', true)
        .order('name');

      if (globalError) throw globalError;

      const { data: barberServicesData, error: bsError } = await supabase
        .from('barber_services')
        .select('service_id')
        .eq('barber_id', barberId);

      if (bsError) throw bsError;

      const specificServiceIds = (barberServicesData || []).map(bs => bs.service_id);

      let specificServices: Service[] = [];
      if (specificServiceIds.length > 0) {
        const { data: linked, error: linkedError } = await supabase
          .from('services')
          .select('*')
          .in('id', specificServiceIds)
          .eq('active', true)
          .eq('is_global', false)
          .order('name');

        if (linkedError) throw linkedError;
        specificServices = (linked || []) as Service[];
      }

      const allServices = [...(globalServices || []), ...specificServices] as Service[];
      const uniqueServices = allServices.filter(
        (s, i, arr) => arr.findIndex(x => x.id === s.id) === i
      );

      // Fetch barber-specific photos for these services
      const { data: barberPhotos } = await supabase
        .from('barber_service_photos')
        .select('service_id, photo_url')
        .eq('barber_id', barberId);

      const photoMap = new Map((barberPhotos || []).map(p => [p.service_id, p.photo_url]));

      const servicesWithPhotos: ServiceWithPhoto[] = uniqueServices.map(s => ({
        ...s,
        barberPhotoUrl: photoMap.get(s.id) || null,
      }));

      setServices(servicesWithPhotos);

      if (servicesWithPhotos.length === 1 && onAutoSelect) {
        onAutoSelect(servicesWithPhotos[0]);
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (service: ServiceWithPhoto) => {
    setSelected(service.id);
    setTimeout(() => onSelect(service), 150);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <PremiumSkeleton variant="text" className="w-44 h-6" />
          <PremiumSkeleton variant="text" className="w-56 h-4 mt-2" />
        </div>
        <div className="grid gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Scissors}
        title="Nenhum serviço disponível"
        description="Este profissional ainda não possui serviços configurados."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Escolha o serviço</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Selecione o serviço que deseja agendar
        </p>
      </div>

      <div className="grid gap-3">
        {services.map((service) => {
          const photoUrl = service.barberPhotoUrl || service.photo_url;
          return (
            <button
              key={service.id}
              onClick={() => handleSelect(service)}
              className={cn(
                'flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 ease-out text-left',
                'hover:shadow-lg active:scale-[0.98]',
                selected === service.id
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                  : 'border-border/30 hover:border-primary/30 bg-secondary/50'
              )}
            >
              <Avatar className="h-12 w-12 rounded-xl flex-shrink-0 transition-all">
                {photoUrl ? (
                  <AvatarImage src={photoUrl} alt={service.name} className="object-cover" />
                ) : null}
                <AvatarFallback
                  className={cn(
                    "rounded-xl",
                    selected === service.id ? "text-primary-foreground" : "bg-primary/10"
                  )}
                  style={selected === service.id ? { background: 'var(--primary-gradient)' } : undefined}
                >
                  <Scissors className={cn("h-5 w-5", selected === service.id ? "text-primary-foreground" : "text-primary")} />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm">{service.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{service.duration_minutes} min</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-bold text-primary">
                  {formatPrice(Number(service.price))}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
