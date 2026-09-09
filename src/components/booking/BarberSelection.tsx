import { useState, useEffect } from 'react';
import { supabase, Barber } from '@/lib/supabase';
import { UserRound as User } from 'lucide-react';
import { PremiumSkeleton, SkeletonCard } from '@/components/ui/premium-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

interface BarberSelectionProps {
  onSelect: (barber: Barber) => void;
  barbershopId?: string;
  availableBarbers?: Barber[];
}

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

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
        .select('id, name, photo_url, is_active, barbershop_id')
        .eq('is_active', true)
        .order('name');

      if (barbershopId) {
        query = query.eq('barbershop_id', barbershopId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBarbers((data || []) as unknown as Barber[]);
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
      <div className="space-y-6">
        <div>
          <PremiumSkeleton variant="text" className="w-48 h-6" />
          <PremiumSkeleton variant="text" className="w-64 h-4 mt-2" />
        </div>
        <div className="grid gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <EmptyState
        icon={User}
        title="Nenhum profissional disponível"
        description="Por favor, tente novamente mais tarde."
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
          — Profissional
        </p>
        <h2 className="font-display text-2xl font-semibold">Escolha o profissional</h2>
        <p className="text-sm mt-1" style={{ color: '#8C887C' }}>
          Selecione o barbeiro de sua preferência
        </p>
      </div>

      <div className="grid gap-2.5">
        {barbers.map((barber) => {
          const isSelected = selected === barber.id;
          return (
            <button
              key={barber.id}
              onClick={() => handleSelect(barber)}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border text-left transition-colors duration-200',
                'active:scale-[0.99]'
              )}
              style={{
                borderColor: isSelected ? '#22C55E' : 'rgba(242,238,228,0.14)',
                background: isSelected ? 'rgba(34,197,94,0.06)' : 'transparent',
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-sans text-sm font-semibold"
                style={{
                  border: `1px solid ${isSelected ? '#22C55E' : 'rgba(242,238,228,0.14)'}`,
                  color: isSelected ? '#22C55E' : 'inherit',
                }}
              >
                {getInitials(barber.name) || <User className="h-5 w-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-sans text-[15px] font-semibold truncate">{barber.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: '#8C887C' }}>
                  Profissional
                </p>
              </div>

              <span
                className="w-4 h-4 rounded-full flex-shrink-0 transition-colors duration-200"
                style={{
                  border: `1px solid ${isSelected ? '#22C55E' : 'rgba(242,238,228,0.24)'}`,
                  background: isSelected ? '#22C55E' : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
