import { useState, useEffect } from 'react';
import { supabase, Service } from '@/lib/supabase';
import { Sparkles as Scissors } from 'lucide-react';
import { PremiumSkeleton, SkeletonCard } from '@/components/ui/premium-skeleton';
import { EmptyState } from '@/components/ui/empty-state';

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
    const resolved: Service = {
      ...service,
      photo_url: service.barberPhotoUrl || service.photo_url || null,
    };
    setTimeout(() => onSelect(resolved), 150);
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
        <p
          className="font-editorial-mono text-[10px] uppercase tracking-[0.18em] mb-2"
          style={{ color: '#22C55E' }}
        >
          — Serviço
        </p>
        <h2 className="font-display text-2xl font-semibold">Escolha o serviço</h2>
        <p className="text-sm mt-1" style={{ color: '#8C887C' }}>
          Selecione o serviço que deseja agendar
        </p>
      </div>

      <div style={{ borderTop: '1px solid rgba(242,238,228,0.14)' }}>
        {services.map((service) => {
          const isSelected = selected === service.id;
          return (
            <button
              key={service.id}
              onClick={() => handleSelect(service)}
              className="w-full flex items-baseline gap-4 py-4 text-left transition-colors duration-150"
              style={{
                borderBottom: '1px solid rgba(242,238,228,0.14)',
                background: isSelected ? 'rgba(34,197,94,0.06)' : 'transparent',
              }}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-semibold truncate">{service.name}</h3>
                <p
                  className="font-editorial-mono text-[11px] mt-1 uppercase tracking-[0.12em]"
                  style={{ color: '#8C887C' }}
                >
                  {service.duration_minutes} min
                </p>
              </div>
              <span
                className="font-editorial-mono text-sm font-medium shrink-0"
                style={{ color: '#22C55E' }}
              >
                {formatPrice(Number(service.price))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
