import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import type { PendingAppointment } from '@/components/painel/DayClosingModal';

interface UseDayClosingProps {
  barbershopId: string | undefined;
  barberId: string | undefined;
}

export function useDayClosing({ barbershopId, barberId }: UseDayClosingProps) {
  const [showModal, setShowModal] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [isPastDays, setIsPastDays] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkPendingAppointments = useCallback(async () => {
    if (!barberId || !barbershopId) return;

    try {
      // Fetch barbershop closing_time
      const { data: shop, error: shopError } = await supabase
        .from('barbershops')
        .select('closing_time')
        .eq('id', barbershopId)
        .maybeSingle();

      if (shopError) throw shopError;

      const closingTime = (shop as any)?.closing_time as string | null;
      const now = new Date();
      const today = startOfDay(now);

      // 1. Check past days first (always, regardless of closing_time)
      const pastStart = subDays(today, 30); // look back up to 30 days
      const { data: pastAppts, error: pastError } = await supabase
        .from('appointments')
        .select('id, customer_name, customer_phone, barbershop_id, start_time, service:services(name)')
        .eq('barber_id', barberId)
        .eq('status', 'confirmed')
        .gte('start_time', pastStart.toISOString())
        .lt('start_time', today.toISOString())
        .order('start_time');

      if (pastError) throw pastError;

      if (pastAppts && pastAppts.length > 0) {
        setPendingAppointments(
          pastAppts.map((a: any) => ({
            id: a.id,
            customer_name: a.customer_name,
            customer_phone: a.customer_phone,
            barbershop_id: a.barbershop_id,
            start_time: a.start_time,
            service: a.service,
          }))
        );
        setIsPastDays(true);
        setShowModal(true);
        return;
      }

      // 2. Check today's appointments if closing_time is set and current time >= closing_time
      if (!closingTime) return;

      const [h, m] = closingTime.split(':').map(Number);
      const closingDate = new Date(today);
      closingDate.setHours(h, m, 0, 0);

      if (now < closingDate) return;

      const { data: todayAppts, error: todayError } = await supabase
        .from('appointments')
        .select('id, customer_name, customer_phone, barbershop_id, start_time, service:services(name)')
        .eq('barber_id', barberId)
        .eq('status', 'confirmed')
        .gte('start_time', today.toISOString())
        .lte('start_time', endOfDay(today).toISOString())
        .order('start_time');

      if (todayError) throw todayError;

      if (todayAppts && todayAppts.length > 0) {
        setPendingAppointments(
          todayAppts.map((a: any) => ({
            id: a.id,
            customer_name: a.customer_name,
            customer_phone: a.customer_phone,
            barbershop_id: a.barbershop_id,
            start_time: a.start_time,
            service: a.service,
          }))
        );
        setIsPastDays(false);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Erro ao verificar atendimentos pendentes:', error);
    }
  }, [barberId, barbershopId]);

  // Check once when the panel loads
  useEffect(() => {
    if (!checked && barberId && barbershopId) {
      setChecked(true);
      checkPendingAppointments();
    }
  }, [barberId, barbershopId, checked, checkPendingAppointments]);

  const handleClose = () => setShowModal(false);

  const handleCompleted = () => {
    setShowModal(false);
    setPendingAppointments([]);
    // Re-check in case there are more pending
    setTimeout(() => checkPendingAppointments(), 500);
  };

  return {
    showModal,
    pendingAppointments,
    isPastDays,
    handleClose,
    handleCompleted,
  };
}
