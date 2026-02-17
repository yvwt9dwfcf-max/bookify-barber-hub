import { useState, useEffect } from 'react';
import { supabase, Barber } from '@/lib/supabase';
import { User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarberSelectionProps {
  onSelect: (barber: Barber) => void;
  barbershopId?: string;
  availableBarbers?: Barber[];
}

export function BarberSelection({ onSelect, barbershopId, availableBarbers }: BarberSelectionProps) {
  const [barbers, setBarbers] = useState<Barber[]>(availableBarbers || []);
  const [loading, setLoading] = useState(!availableBarbers);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (availableBarbers && availableBarbers.length > 0) {
      setBarbers(availableBarbers);
      setLoading(false);
      return;
    }
    fetchBarbers();
  }, [barbershopId, availableBarbers]);

  const fetchBarbers = async () => {
    try {
      let query = supabase
        .from('barbers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (barbershopId) {
        query = query.eq('barbershop_id', barbershopId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Erro ao buscar barbeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (barber: Barber) => {
    setSelected(barber.id);
    setTimeout(() => onSelect(barber), 150);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Nenhum profissional disponível</h3>
        <p className="text-muted-foreground mt-2">
          Por favor, tente novamente mais tarde.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Escolha o profissional</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Selecione o barbeiro de sua preferência
        </p>
      </div>

      <div className="grid gap-3">
        {barbers.map((barber) => (
          <button
            key={barber.id}
            onClick={() => handleSelect(barber)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ease-out text-left',
              'hover:shadow-lg active:scale-[0.98]',
              selected === barber.id
                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                : 'border-border/40 hover:border-primary/40 bg-card/60 dark:bg-card/60'
            )}
          >
            {/* Avatar circular */}
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
              selected === barber.id
                ? "text-primary-foreground"
                : "bg-primary/10"
            )}
              style={selected === barber.id ? { background: 'var(--primary-gradient)' } : undefined}
            >
              <User className={cn("h-7 w-7", selected === barber.id ? "text-primary-foreground" : "text-primary")} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">{barber.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Profissional
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
