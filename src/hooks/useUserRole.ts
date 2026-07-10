import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, UserRole, Barbershop } from '@/lib/supabase';
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
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['user-role', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      if (roleError) throw roleError;

      let barbershop: Barbershop | null = null;
      if (roleData?.barbershop_id) {
        const { data: shopData, error: shopError } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', roleData.barbershop_id)
          .maybeSingle();
        if (shopError) throw shopError;
        barbershop = shopData as Barbershop | null;
      }
      return { userRole: (roleData as UserRole | null) ?? null, barbershop };
    },
  });

  const userRole = data?.userRole ?? null;
  const barbershop = data?.barbershop ?? null;

  return {
    userRole,
    barbershop,
    loading: !!userId && isLoading,
    isMaster: userRole?.role === 'master',
    isBarber: userRole?.role === 'barber',
    refetch: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-role', userId] });
    },
  };
}
