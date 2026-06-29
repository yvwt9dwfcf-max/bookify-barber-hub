import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UseRealtimeAppointmentsOptions {
  barberId: string | undefined;
  onNewAppointment?: () => void;
  shouldHandleEvent?: () => boolean;
}

export function useRealtimeAppointments({ barberId, onNewAppointment, shouldHandleEvent }: UseRealtimeAppointmentsOptions) {
  // Use ref for callback to avoid resubscribing channel on callback changes
  const callbackRef = useRef(onNewAppointment);
  const shouldHandleRef = useRef(shouldHandleEvent);
  useEffect(() => { callbackRef.current = onNewAppointment; }, [onNewAppointment]);
  useEffect(() => { shouldHandleRef.current = shouldHandleEvent; }, [shouldHandleEvent]);

  useEffect(() => {
    if (!barberId) return;

    const channel = supabase
      .channel(`appointments-${barberId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `barber_id=eq.${barberId}`,
        },
        (payload) => {
          if (shouldHandleRef.current && !shouldHandleRef.current()) return;
          // Avoid N+1: don't fetch service name on each event; the upcoming
          // refresh (callbackRef) will repopulate the grid with full data.
          const newAppointment = payload.new as {
            id: string;
            customer_name: string;
            start_time: string;
          };

          const appointmentDate = new Date(newAppointment.start_time);
          const formattedDate = format(appointmentDate, "d 'de' MMMM 'às' HH:mm", { locale: ptBR });

          toast.success('Novo agendamento!', {
            description: `${newAppointment.customer_name} • ${formattedDate}`,
            duration: 2500,
          });

          callbackRef.current?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `barber_id=eq.${barberId}`,
        },
        (payload) => {
          if (shouldHandleRef.current && !shouldHandleRef.current()) return;
          const updatedAppointment = payload.new as {
            status: string;
            customer_name: string;
          };
          const oldAppointment = payload.old as { status?: string };

          if (
            updatedAppointment.status === 'cancelled' &&
            oldAppointment?.status !== 'cancelled'
          ) {
            toast.info('Agendamento cancelado', {
              description: `O agendamento de ${updatedAppointment.customer_name} foi cancelado`,
              duration: 2200,
            });
          }

          // Always refetch so status changes (completed, comanda, edits) propagate
          callbackRef.current?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments',
          filter: `barber_id=eq.${barberId}`,
        },
        () => {
          if (shouldHandleRef.current && !shouldHandleRef.current()) return;
          callbackRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId]);
}
