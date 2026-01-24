import { useState, useEffect } from 'react';
import { supabase, Barber } from '@/lib/supabase';
import { User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarberSelectionProps {
  onSelect: (barber: Barber) => void;
}

export function BarberSelection({ onSelect }: BarberSelectionProps) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .order('name');

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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Escolha o profissional</h2>
      <p className="text-muted-foreground text-sm">
        Selecione o barbeiro de sua preferência
      </p>

      <div className="grid gap-3 mt-6">
        {barbers.map((barber) => (
          <button
            key={barber.id}
            onClick={() => handleSelect(barber)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
              'hover:border-primary hover:bg-accent',
              selected === barber.id
                ? 'border-primary bg-accent'
                : 'border-border'
            )}
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">{barber.name}</h3>
              {barber.phone && (
                <p className="text-sm text-muted-foreground truncate">
                  {barber.phone}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
