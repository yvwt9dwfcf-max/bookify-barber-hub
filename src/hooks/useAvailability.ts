import { useState, useEffect, useCallback } from 'react';
import { supabase, OpeningHours, BlockedSlot, Appointment } from '@/lib/supabase';
import { 
  isBefore, 
  isAfter, 
  addMinutes, 
  setHours, 
  setMinutes,
  startOfDay
} from 'date-fns';
import { DEFAULT_SLOT_STEP, fetchSlotStep, gridMinutes } from '@/lib/slotStep';

/** How far back a running slot may still be booked as encaixe (manual only). */
export const ENCAIXE_WINDOW_MINUTES = 30;

export interface SlotAvailability {
  available: boolean;
  reason?: 'bloqueado' | 'intervalo' | 'ocupado' | 'fechado' | 'passado';
}

interface UseAvailabilityParams {
  barberId: string;
  selectedDate?: Date;
  serviceDuration?: number;
  /** Manual (balcão) only: allow an encaixe in the slot that is already running. Public booking must never set this. */
  allowOngoing?: boolean;
}

interface UseAvailabilityReturn {
  openingHours: OpeningHours[];
  blockedSlots: BlockedSlot[];
  appointments: Appointment[];
  loading: boolean;
  checkSlotAvailability: (timeSlot: string, date: Date, durationMinutes: number, excludeAppointmentId?: string) => SlotAvailability;
  getAvailableSlotsForDate: (date: Date, durationMinutes: number) => string[];
  getOpeningHoursForDay: (dayOfWeek: number) => OpeningHours | undefined;
  refetch: () => Promise<void>;
}

export function useAvailability({ 
  barberId,
  allowOngoing = false,
}: UseAvailabilityParams): UseAvailabilityReturn {
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotStep, setSlotStep] = useState(DEFAULT_SLOT_STEP);

  const fetchData = useCallback(async () => {
    if (!barberId) return;
    
    try {
      setLoading(true);
      
      // Fetch opening hours (all days)
      const hoursPromise = supabase
        .from('opening_hours')
        .select('id, barber_id, barbershop_id, day_of_week, start_time, end_time, is_open, break_start, break_end')
        .eq('barber_id', barberId);

      // Fetch blocked slots (only future)
      const blockedPromise = supabase
        .from('blocked_slots')
        .select('id, barber_id, barbershop_id, start_time, end_time, created_at')
        .eq('barber_id', barberId);

      // Fetch appointments (only future, not cancelled)
      const appointmentsPromise = supabase
        .from('appointments')
        .select('id, barber_id, service_id, start_time, end_time, status, barbershop_id')
        .eq('barber_id', barberId)
        .neq('status', 'cancelled')
        .gte('start_time', startOfDay(new Date()).toISOString());

      const [hoursRes, blockedRes, appointmentsRes] = await Promise.all([
        hoursPromise,
        blockedPromise,
        appointmentsPromise,
      ]);

      setOpeningHours((hoursRes.data || []) as unknown as OpeningHours[]);
      setBlockedSlots((blockedRes.data || []) as unknown as BlockedSlot[]);
      setAppointments((appointmentsRes.data as unknown as Appointment[]) || []);
      const shopId = (hoursRes.data || [])[0]?.barbershop_id;
      setSlotStep(await fetchSlotStep(shopId));
    } catch (error) {
      console.error('Erro ao buscar dados de disponibilidade:', error);
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getOpeningHoursForDay = useCallback((dayOfWeek: number): OpeningHours | undefined => {
    return openingHours.find(h => h.day_of_week === dayOfWeek && h.is_open);
  }, [openingHours]);

  /**
   * Unified slot availability check - used by both public and internal booking
   */
  const checkSlotAvailability = useCallback((
    timeSlot: string, 
    date: Date, 
    durationMinutes: number,
    excludeAppointmentId?: string
  ): SlotAvailability => {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotStart = setMinutes(setHours(date, hours), minutes);
    const slotEnd = addMinutes(slotStart, durationMinutes);
    const now = new Date();

    // 1. Check if slot is in the past
    if (isBefore(slotStart, now)) {
      const ongoingEncaixe = allowOngoing && !isBefore(slotStart, addMinutes(now, -ENCAIXE_WINDOW_MINUTES)) && isAfter(slotEnd, now);
      if (!ongoingEncaixe) return { available: false, reason: 'passado' };
    }

    // 2. Check if day is open
    const dayOfWeek = date.getDay();
    const dayHours = getOpeningHoursForDay(dayOfWeek);
    
    if (!dayHours) {
      return { available: false, reason: 'fechado' };
    }

    // 3. Check break time (lunch/pause)
    if (dayHours.break_start && dayHours.break_end) {
      const [bsHour, bsMin] = dayHours.break_start.split(':').map(Number);
      const [beHour, beMin] = dayHours.break_end.split(':').map(Number);
      const breakStart = setMinutes(setHours(date, bsHour), bsMin);
      const breakEnd = setMinutes(setHours(date, beHour), beMin);
      
      // Check if slot overlaps with break
      if (isBefore(slotStart, breakEnd) && isAfter(slotEnd, breakStart)) {
        return { available: false, reason: 'intervalo' };
      }
    }

    // 4. Check blocked slots
    const isBlocked = blockedSlots.some((blocked) => {
      const blockedStart = new Date(blocked.start_time);
      const blockedEnd = new Date(blocked.end_time);
      
      // Check if blocked slot overlaps with the requested slot
      return isBefore(slotStart, blockedEnd) && isAfter(slotEnd, blockedStart);
    });

    if (isBlocked) {
      return { available: false, reason: 'bloqueado' };
    }

    // 5. Check existing appointments (ignoring the appointment being edited, if any)
    const hasAppointment = appointments.some((apt) => {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      
      // Check overlap
      return isBefore(slotStart, aptEnd) && isAfter(slotEnd, aptStart);
    });

    if (hasAppointment) {
      return { available: false, reason: 'ocupado' };
    }

    return { available: true };
  }, [openingHours, blockedSlots, appointments, getOpeningHoursForDay, allowOngoing]);

  /**
   * Get all available time slots for a given date.
   * Uses 30min intervals by default; switches to 15min when:
   * - The selected service duration is 15min, OR
   * - There are existing appointments that create 15min gaps
   */
  const getAvailableSlotsForDate = useCallback((
    date: Date, 
    durationMinutes: number
  ): string[] => {
    const dayOfWeek = date.getDay();
    const dayHours = getOpeningHoursForDay(dayOfWeek);
    
    if (!dayHours) return [];

    const [startHour, startMin] = dayHours.start_time.split(':').map(Number);
    const [endHour, endMin] = dayHours.end_time.split(':').map(Number);

    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;

    // Fixed grid chosen by the shop (default 30 min). Never derived from existing bookings,
    // so a stray :15 appointment can't shift the whole day off the ruler.
    const candidateMinutes = gridMinutes(startTotal, endTotal, slotStep, durationMinutes);

    // Deduplicate and sort
    const uniqueMinutes = [...new Set(candidateMinutes)].sort((a, b) => a - b);

    const slots: string[] = [];
    for (const totalMin of uniqueMinutes) {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const timeSlot = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      const availability = checkSlotAvailability(timeSlot, date, durationMinutes);
      
      if (availability.available) {
        slots.push(timeSlot);
      }
    }

    return slots;
  }, [getOpeningHoursForDay, checkSlotAvailability, appointments]);

  return {
    openingHours,
    blockedSlots,
    appointments,
    loading,
    checkSlotAvailability,
    getAvailableSlotsForDate,
    getOpeningHoursForDay,
    refetch: fetchData,
  };
}
