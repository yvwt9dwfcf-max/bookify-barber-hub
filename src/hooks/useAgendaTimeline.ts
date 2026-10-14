import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, startOfDay } from 'date-fns';
import { supabase, type Appointment, type Barber, type BlockedSlot, type OpeningHours } from '@/lib/supabase';
import { agendaDates, allowedBarbers, type AgendaMode } from '@/components/painel/agenda/timelineUtils';

export function useAgendaTimeline({ shopId, barbers, currentBarber, selectedBarberId, canViewOthers, mode, selectedDate }: {
  shopId?: string; barbers: Barber[]; currentBarber: Barber | null; selectedBarberId: string | null;
  canViewOthers: boolean; mode: AgendaMode; selectedDate: Date;
}) {
  const queryClient = useQueryClient();
  const allowed = useMemo(() => allowedBarbers(barbers, currentBarber, canViewOthers), [barbers, currentBarber, canViewOthers]);
  const selected = allowed.find(b => b.id === selectedBarberId) || allowed.find(b => b.id === currentBarber?.id) || allowed[0];
  const visible = mode === 'team' ? allowed : selected ? [selected] : [];
  const ids = visible.map(b => b.id).sort();
  const dates = agendaDates(selectedDate, mode);
  const start = startOfDay(dates[0]).toISOString();
  const end = addDays(startOfDay(dates[dates.length - 1]), 1).toISOString();
  const query = useQuery({
    queryKey: ['agenda-timeline', shopId, ids.join(','), start, end],
    enabled: Boolean(shopId && ids.length),
    staleTime: 30_000,
    queryFn: async () => {
      const [appointments, blocks, hours] = await Promise.all([
        supabase.from('appointments').select('*, service:services(*), barber:barbers(*)')
          .eq('barbershop_id', shopId || '').in('barber_id', ids)
          .lt('start_time', end).gt('end_time', start).order('start_time'),
        supabase.from('blocked_slots').select('id, barber_id, barbershop_id, start_time, end_time, reason, created_at')
          .eq('barbershop_id', shopId || '').in('barber_id', ids).lt('start_time', end).gt('end_time', start),
        supabase.from('opening_hours').select('id, barber_id, barbershop_id, day_of_week, start_time, end_time, is_open, break_start, break_end, created_at')
          .eq('barbershop_id', shopId || '').in('barber_id', ids),
      ]);
      if (appointments.error) throw appointments.error;
      if (blocks.error) throw blocks.error;
      if (hours.error) throw hours.error;
      return { appointments: (appointments.data || []) as Appointment[], blockedSlots: (blocks.data || []) as BlockedSlot[], openingHours: (hours.data || []) as OpeningHours[] };
    },
  });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!shopId) return;
    const refresh = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => queryClient.invalidateQueries({ queryKey: ['agenda-timeline', shopId] }), 160);
    };
    const channel = supabase.channel(`agenda-cockpit-${shopId}`);
    for (const table of ['appointments', 'blocked_slots', 'opening_hours']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `barbershop_id=eq.${shopId}` }, refresh);
    }
    channel.subscribe();
    return () => { clearTimeout(timer.current); supabase.removeChannel(channel); };
  }, [shopId, queryClient]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['agenda-timeline', shopId] });
  return { ...query, allowed, selected, visible, dates, refresh };
}
