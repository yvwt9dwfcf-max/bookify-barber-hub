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
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barberId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
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
          Este profissional ainda não cadastrou serviços.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Escolha o serviço</h2>
      <p className="text-muted-foreground text-sm">
        Selecione o serviço que deseja
      </p>

      <div className="grid gap-3 mt-6">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => handleSelect(service)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
              'hover:border-primary hover:bg-accent',
              selected === service.id
                ? 'border-primary bg-accent'
                : 'border-border'
            )}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Scissors className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{service.name}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {service.duration_minutes} min
                </span>
              </div>
            </div>
            <div className="text-right">
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
