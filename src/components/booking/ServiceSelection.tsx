import { useState, useEffect } from 'react';
import { supabase, Service } from '@/lib/supabase';
import { Scissors, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceSelectionProps {
  barberId: string;
  onSelect: (service: Service) => void;
}

export function ServiceSelection({ barberId, onSelect }: ServiceSelectionProps) {
  const [services, setServices] = useState<Service[]>([]);
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

      const { data: barberServicesData, error: bsError } = await supabase
        .from('barber_services')
        .select('service_id')
        .eq('barber_id', barberId);

      if (bsError) throw bsError;

      const serviceIds = (barberServicesData || []).map(bs => bs.service_id);

      if (serviceIds.length === 0) {
        const { data: allServices, error: allError } = await supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', barberData.barbershop_id)
          .eq('active', true)
          .order('name');

        if (allError) throw allError;
        setServices(allServices || []);
      } else {
        const { data: linkedServices, error: linkedError } = await supabase
          .from('services')
          .select('*')
          .in('id', serviceIds)
          .eq('active', true)
          .order('name');

        if (linkedError) throw linkedError;
        setServices(linkedServices || []);
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (service: Service) => {
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <Scissors className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Nenhum serviço disponível</h3>
        <p className="text-muted-foreground mt-2">
          Este profissional ainda não possui serviços disponíveis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Escolha o serviço</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Selecione o serviço que deseja
        </p>
      </div>

      <div className="grid gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => handleSelect(service)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ease-out text-left',
              'hover:shadow-lg active:scale-[0.98]',
              selected === service.id
                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                : 'border-border/40 hover:border-primary/40 bg-card/60 dark:bg-card/60'
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
              selected === service.id
                ? "text-primary-foreground"
                : "bg-primary/10"
            )}
              style={selected === service.id ? { background: 'var(--primary-gradient)' } : undefined}
            >
              <Scissors className={cn("h-5 w-5", selected === service.id ? "text-primary-foreground" : "text-primary")} />
            </div>
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
        ))}
      </div>
    </div>
  );
}
