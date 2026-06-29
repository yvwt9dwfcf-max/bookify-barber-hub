import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Barber, BarberPermissions } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface BarberWithPermissions extends Barber {
  permissions?: BarberPermissions;
}

export function useBarber() {
  const { user } = useAuth();
  const [barber, setBarber] = useState<BarberWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const fetchBarber = useCallback(async () => {
    if (!user) return;
    if (inFlightRef.current) return; // guard against Strict Mode double invoke
    inFlightRef.current = true;

    try {
      const { data, error } = await supabase
        .from('barbers')
        .select(`
          *,
          permissions:barber_permissions(*)
        `)
        .eq('auth_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const barberData = {
          ...data,
          permissions: Array.isArray(data.permissions) ? data.permissions[0] : data.permissions,
        };
        setBarber(barberData as BarberWithPermissions);
      } else {
        setBarber(null);
      }
    } catch (error) {
      console.error('Erro ao buscar barbeiro:', error);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchBarber();
    } else {
      setBarber(null);
      setLoading(false);
    }
  }, [user, fetchBarber]);

  const updateBarber = async (updates: Partial<Barber>) => {
    if (!barber) return { error: new Error('Barbeiro não encontrado') };

    try {
      const { data, error } = await supabase
        .from('barbers')
        .update(updates)
        .eq('id', barber.id)
        .select()
        .single();

      if (error) throw error;
      setBarber({ ...barber, ...data });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  return {
    barber,
    loading,
    updateBarber,
    refetch: fetchBarber,
  };
}
