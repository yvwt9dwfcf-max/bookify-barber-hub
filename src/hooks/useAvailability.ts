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

export interface SlotAvailability {
  available: boolean;
  reason?: 'bloqueado' | 'intervalo' | 'ocupado' | 'fechado' | 'passado';
}

interface UseAvailabilityParams {
  barberId: string;
  selectedDate?: Date;
  serviceDuration?: number;
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
  barberId 
}: UseAvailabilityParams): UseAvailabilityReturn {
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!barberId) return;
    
    try {
      setLoading(true);
      
      // Fetch opening hours (all days)
      const hoursPromise = supabase
        .from('opening_hours')
        .select('*')
        .eq('barber_id', barberId);

      // Fetch blocked slots (only future)
      const blockedPromise = supabase
        .from('blocked_slots')
        .select('*')
        .eq('barber_id', barberId);

      // Fetch appointments (only future, not cancelled)
      const appointmentsPromise = supabase
        .from('appointments')
        .select('*')
        .eq('barber_id', barberId)
        .neq('status', 'cancelled')
        .gte('start_time', startOfDay(new Date()).toISOString());

      const [hoursRes, blockedRes, appointmentsRes] = await Promise.all([
        hoursPromise,
        blockedPromise,
        appointmentsPromise,
      ]);

      setOpeningHours(hoursRes.data || []);
      setBlockedSlots(blockedRes.data || []);
      setAppointments((appointmentsRes.data as Appointment[]) || []);
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
    durationMinutes: number
  ): SlotAvailability => {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotStart = setMinutes(setHours(date, hours), minutes);
    const slotEnd = addMinutes(slotStart, durationMinutes);
    const now = new Date();

    // 1. Check if slot is in the past
    if (isBefore(slotStart, now)) {
      return { available: false, reason: 'passado' };
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

    // 5. Check existing appointments
    const hasAppointment = appointments.some((apt) => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      
      // Check overlap
      return isBefore(slotStart, aptEnd) && isAfter(slotEnd, aptStart);
    });

    if (hasAppointment) {
      return { available: false, reason: 'ocupado' };
    }

    return { available: true };
  }, [openingHours, blockedSlots, appointments, getOpeningHoursForDay]);

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

    // Determine if we need 15min precision:
    // 1) The service itself is 15min
    // 2) Any existing appointment ends on a :15 or :45 boundary
    const needs15Min = durationMinutes === 15 || appointments.some((apt) => {
      const aptEnd = new Date(apt.end_time);
      const aptEndMin = aptEnd.getMinutes();
      return aptEndMin === 15 || aptEndMin === 45;
    });

    const interval = needs15Min ? 15 : 30;

    // Generate candidate slots at the chosen interval
    const candidateMinutes: number[] = [];
    for (let m = startTotal; m + durationMinutes <= endTotal; m += interval) {
      candidateMinutes.push(m);
    }

    // Also add slots right after each existing appointment ends (to fill gaps)
    appointments.forEach((apt) => {
      if (apt.status === 'cancelled') return;
      const aptEnd = new Date(apt.end_time);
      // Only consider appointments on the same date
      if (aptEnd.getFullYear() === date.getFullYear() &&
          aptEnd.getMonth() === date.getMonth() &&
          aptEnd.getDate() === date.getDate()) {
        const endMinutes = aptEnd.getHours() * 60 + aptEnd.getMinutes();
        if (endMinutes + durationMinutes <= endTotal && endMinutes >= startTotal) {
          candidateMinutes.push(endMinutes);
        }
      }
    });

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
