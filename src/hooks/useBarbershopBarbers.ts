import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Barber, BarberPermissions } from '@/lib/supabase';
import { useUserRole } from './useUserRole';

interface BarberWithPermissions extends Barber {
  permissions?: BarberPermissions;
}

interface UseBarbershopBarbersReturn {
  barbers: BarberWithPermissions[];
  loading: boolean;
  canAddMore: boolean;
  currentCount: number;
  maxBarbers: number;
  refetch: () => Promise<void>;
}

export function useBarbershopBarbers(): UseBarbershopBarbersReturn {
  const { barbershop } = useUserRole();
  const [barbers, setBarbers] = useState<BarberWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const fetchBarbers = useCallback(async () => {
    if (!barbershop?.id) {
      setBarbers([]);
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const { data, error } = await supabase
        .from('barbers')
        .select(`
          *,
          permissions:barber_permissions(*)
        `)
        .eq('barbershop_id', barbershop.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const transformedData = (data || []).map((barber: any) => ({
        ...barber,
        permissions: barber.permissions?.[0] || null,
      }));

      setBarbers(transformedData);
    } catch (error) {
      console.error('Erro ao buscar barbeiros:', error);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [barbershop?.id]);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  const currentCount = barbers.filter(b => b.is_active).length;
  const maxBarbers = barbershop?.max_barbers || 3;
  const canAddMore = currentCount < maxBarbers;

  return {
    barbers,
    loading,
    canAddMore,
    currentCount,
    maxBarbers,
    refetch: fetchBarbers,
  };
}
