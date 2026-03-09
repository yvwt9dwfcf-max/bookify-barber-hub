import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UseRealtimeAppointmentsOptions {
  barberId: string | undefined;
  onNewAppointment?: () => void;
}

export function useRealtimeAppointments({ barberId, onNewAppointment }: UseRealtimeAppointmentsOptions) {
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!barberId || isSubscribedRef.current) return;

    isSubscribedRef.current = true;

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
        async (payload) => {
          const newAppointment = payload.new as {
            id: string;
            customer_name: string;
            start_time: string;
            service_id: string | null;
          };

          // Fetch service name if available
          let serviceName = 'Serviço';
          if (newAppointment.service_id) {
            const { data: service } = await supabase
              .from('services')
              .select('name')
              .eq('id', newAppointment.service_id)
              .maybeSingle();
            
            if (service) {
              serviceName = service.name;
            }
          }

          const appointmentDate = new Date(newAppointment.start_time);
          const formattedDate = format(appointmentDate, "d 'de' MMMM 'às' HH:mm", { locale: ptBR });

          // Show toast notification
          toast.success('Novo agendamento!', {
            description: `${newAppointment.customer_name} • ${serviceName} • ${formattedDate}`,
            duration: 2500,
          });

          // Callback for additional actions
          onNewAppointment?.();
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
          const updatedAppointment = payload.new as {
            status: string;
            customer_name: string;
          };

          if (updatedAppointment.status === 'cancelled') {
            toast.info('Agendamento cancelado', {
              description: `O agendamento de ${updatedAppointment.customer_name} foi cancelado`,
              duration: 2200,
            });
            onNewAppointment?.();
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [barberId, onNewAppointment]);
}
