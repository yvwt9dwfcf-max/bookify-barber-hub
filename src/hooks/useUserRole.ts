import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, UserRole, Barbershop, AppRole } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface UseUserRoleReturn {
  userRole: UserRole | null;
  barbershop: Barbershop | null;
  loading: boolean;
  isMaster: boolean;
  isBarber: boolean;
  refetch: () => Promise<void>;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const fetchUserRole = useCallback(async () => {
    if (!user) {
      setUserRole(null);
      setBarbershop(null);
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return; // guard against Strict Mode double invoke
    inFlightRef.current = true;

    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) throw roleError;

      setUserRole(roleData as UserRole | null);

      if (roleData?.barbershop_id) {
        const { data: shopData, error: shopError } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', roleData.barbershop_id)
          .maybeSingle();

        if (shopError) throw shopError;
        setBarbershop(shopData as Barbershop | null);
      }
    } catch (error) {
      console.error('Erro ao buscar role do usuário:', error);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  return {
    userRole,
    barbershop,
    loading,
    isMaster: userRole?.role === 'master',
    isBarber: userRole?.role === 'barber',
    refetch: fetchUserRole,
  };
}
