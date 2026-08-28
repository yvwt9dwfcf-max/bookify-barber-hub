import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, Barber, BarberPermissions } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface BarberWithPermissions extends Barber {
  permissions?: BarberPermissions;
}

export function useBarber() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: barber, isLoading } = useQuery<BarberWithPermissions | null>({
    queryKey: ['barber', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('barbers')
        .select(`*, permissions:barber_permissions(*)`)
        .eq('auth_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        permissions: Array.isArray(data.permissions) ? data.permissions[0] : data.permissions,
      } as BarberWithPermissions;
    },
  });

  const updateBarber = async (updates: Partial<Barber>) => {
    if (!barber) return { data: null, error: new Error('Barbeiro não encontrado') };
    try {
      const { permissions: _permissions, ...safeUpdates } = updates as Partial<BarberWithPermissions>;
      const { data, error } = await supabase
        .from('barbers')
        .update(safeUpdates)

        .eq('id', barber.id)
        .select()
        .single();
      if (error) throw error;
      queryClient.setQueryData<BarberWithPermissions | null>(['barber', userId], (prev) =>
        prev ? { ...prev, ...data } : prev
      );
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  return {
    barber: barber ?? null,
    loading: !!userId && isLoading,
    updateBarber,
    refetch: async () => {
      await queryClient.invalidateQueries({ queryKey: ['barber', userId] });
    },
  };
}
