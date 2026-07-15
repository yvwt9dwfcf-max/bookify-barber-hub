import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase, Appointment, Barber, BlockedSlot, OpeningHours, Barbershop } from '@/lib/supabase';
import { startOfDay, addDays, format, setHours, setMinutes, isBefore, isAfter, addMinutes } from 'date-fns';
import { CalendarPlus, Ban, Clock, CircleSlash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusConfig, getInitials } from './agendaUtils';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { toast } from 'sonner';

interface AllBarbersGridProps {
  barbers: Barber[];
  barbershop: Barbershop | null;
  selectedDate: Date;
  onSlotClick: (time: string, barberId: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  refreshKey?: number;
}

const COLUMN_WIDTH = 138; // px per barber column
const TIME_COL_WIDTH = 44; // px
const ROW_HEIGHT = 44; // px per 30-min slot

const AllBarbersGrid = ({
  barbers,
  barbershop,
  selectedDate,
  onSlotClick,
  onAppointmentClick,
  refreshKey = 0,
}: AllBarbersGridProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [loading, setLoading] = useState(true);

  const activeBarbers = useMemo(
    () => barbers.filter(b => b.is_active),
    [barbers]
  );

  const fetchAll = useCallback(async () => {
    if (!barbershop?.id || activeBarbers.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const dayStart = startOfDay(selectedDate);
      const dayEnd = addDays(dayStart, 1);
      const barberIds = activeBarbers.map(b => b.id);

      const [aptsRes, blockedRes, hoursRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, service:services(*), barber:barbers(*)')
          .eq('barbershop_id', barbershop.id)
          .in('barber_id', barberIds)
          .gte('start_time', dayStart.toISOString())
          .lt('start_time', dayEnd.toISOString())
          .order('start_time'),
        supabase
          .from('blocked_slots')
          .select('id, barber_id, barbershop_id, start_time, end_time, created_at')
          .in('barber_id', barberIds)
          .gte('end_time', dayStart.toISOString())
          .lt('start_time', dayEnd.toISOString()),
        supabase
          .from('opening_hours')
          .select('id, barber_id, barbershop_id, day_of_week, start_time, end_time, is_open, break_start, break_end')
          .in('barber_id', barberIds)
          .eq('day_of_week', selectedDate.getDay()),
      ]);

      if (aptsRes.error) throw aptsRes.error;
      if (blockedRes.error) throw blockedRes.error;
      if (hoursRes.error) throw hoursRes.error;

      setAppointments((aptsRes.data as Appointment[]) || []);
      setBlockedSlots((blockedRes.data || []) as unknown as BlockedSlot[]);
      setOpeningHours((hoursRes.data || []) as unknown as OpeningHours[]);
    } catch (err) {
      console.error('Erro ao carregar agenda geral:', err);
      toast.error('Erro ao carregar agenda de todos');
    } finally {
      setLoading(false);
    }
  }, [barbershop?.id, activeBarbers, selectedDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshKey]);

  // Realtime: refetch on any appointment change in this barbershop
  useEffect(() => {
    if (!barbershop?.id) return;
    const channel = supabase
      .channel(`all-barbers-agenda-${barbershop.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `barbershop_id=eq.${barbershop.id}` },
        () => fetchAll()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [barbershop?.id, fetchAll]);

  // Compute grid time range: earliest opening -> latest closing across all barbers
  const { slots, startHour, startMin } = useMemo(() => {
    if (openingHours.length === 0) {
      return { slots: [] as { time: string; hour: number; minute: number }[], startHour: 0, startMin: 0 };
    }
    let minStart = 24 * 60;
    let maxEnd = 0;
    openingHours.forEach(h => {
      if (!h.is_open) return;
      const [sh, sm] = h.start_time.split(':').map(Number);
      const [eh, em] = h.end_time.split(':').map(Number);
      const s = sh * 60 + sm;
      const e = eh * 60 + em;
      if (s < minStart) minStart = s;
      if (e > maxEnd) maxEnd = e;
    });
    if (minStart >= maxEnd) return { slots: [], startHour: 0, startMin: 0 };
    const list: { time: string; hour: number; minute: number }[] = [];
    for (let m = minStart; m < maxEnd; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      list.push({
        time: `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
        hour: h,
        minute: min,
      });
    }
    return { slots: list, startHour: Math.floor(minStart / 60), startMin: minStart % 60 };
  }, [openingHours]);

  const hoursByBarber = useMemo(() => {
    const map: Record<string, OpeningHours | undefined> = {};
    openingHours.forEach(h => {
      if (h.is_open) map[h.barber_id] = h;
    });
    return map;
  }, [openingHours]);

  const appointmentsByBarber = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach(a => {
      if (a.status === 'cancelled') return;
      if (!map[a.barber_id]) map[a.barber_id] = [];
      map[a.barber_id].push(a);
    });
    return map;
  }, [appointments]);

  const blockedByBarber = useMemo(() => {
    const map: Record<string, BlockedSlot[]> = {};
    blockedSlots.forEach(b => {
      if (!map[b.barber_id]) map[b.barber_id] = [];
      map[b.barber_id].push(b);
    });
    return map;
  }, [blockedSlots]);

  // Grid total height for a given barber column
  const gridHeight = slots.length * ROW_HEIGHT;

  const now = new Date();

  const getSlotState = useCallback((barberId: string, slotTime: string) => {
    const hours = hoursByBarber[barberId];
    if (!hours) return 'closed' as const;
    const [h, m] = slotTime.split(':').map(Number);
    const slotStart = setMinutes(setHours(selectedDate, h), m);
    const slotEnd = addMinutes(slotStart, 30);

    // Outside barber's hours
    const [sh, sm] = hours.start_time.split(':').map(Number);
    const [eh, em] = hours.end_time.split(':').map(Number);
    const barberStart = setMinutes(setHours(selectedDate, sh), sm);
    const barberEnd = setMinutes(setHours(selectedDate, eh), em);
    if (isBefore(slotStart, barberStart) || !isBefore(slotStart, barberEnd)) return 'closed' as const;

    // Break
    if (hours.break_start && hours.break_end) {
      const [bsh, bsm] = hours.break_start.split(':').map(Number);
      const [beh, bem] = hours.break_end.split(':').map(Number);
      const bStart = setMinutes(setHours(selectedDate, bsh), bsm);
      const bEnd = setMinutes(setHours(selectedDate, beh), bem);
      if (isBefore(slotStart, bEnd) && isAfter(slotEnd, bStart)) return 'break' as const;
    }

    // Blocked
    const bs = blockedByBarber[barberId] || [];
    if (bs.some(b => {
      const bst = new Date(b.start_time);
      const ben = new Date(b.end_time);
      return isBefore(slotStart, ben) && isAfter(slotEnd, bst);
    })) return 'blocked' as const;

    // Past
    if (isBefore(slotStart, now)) return 'past' as const;

    return 'free' as const;
  }, [hoursByBarber, blockedByBarber, selectedDate, now]);

  // Position of an appointment card in the column
  const positionFor = (apt: Appointment) => {
    const st = new Date(apt.start_time);
    const et = new Date(apt.end_time);
    const startTotal = st.getHours() * 60 + st.getMinutes();
    const endTotal = et.getHours() * 60 + et.getMinutes();
    const gridStart = startHour * 60 + startMin;
    const top = ((startTotal - gridStart) / 30) * ROW_HEIGHT;
    const height = Math.max(((endTotal - startTotal) / 30) * ROW_HEIGHT - 2, 24);
    return { top, height };
  };

  if (loading) {
    return (
      <div className="space-y-2 mt-2">
        <PremiumSkeleton className="h-16 rounded-xl" />
        <PremiumSkeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (activeBarbers.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Nenhum profissional ativo.
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl bg-card/60 border border-dashed border-border/40">
        <CircleSlash className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Dia fechado para todos</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Nenhum profissional atende neste dia</p>
      </div>
    );
  }

  return (
    <div className="relative -mx-3 md:-mx-5 lg:-mx-8 animate-fade-in">
      <div
        className="overflow-x-auto overflow-y-visible overscroll-x-contain"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div style={{ width: TIME_COL_WIDTH + activeBarbers.length * COLUMN_WIDTH, minWidth: '100%' }}>
          {/* Sticky header row: barber names */}
          <div
            className="sticky top-14 lg:top-0 z-10 flex bg-background/95 backdrop-blur-md border-b border-border/40"
            style={{ paddingLeft: TIME_COL_WIDTH }}
          >
            {activeBarbers.map(b => (
              <div
                key={b.id}
                className="flex items-center gap-2 px-2 py-2 border-l border-border/30"
                style={{ width: COLUMN_WIDTH }}
              >
                {b.photo_url ? (
                  <img
                    src={b.photo_url}
                    alt={b.name}
                    className="h-7 w-7 rounded-full object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                    {getInitials(b.name)}
                  </div>
                )}
                <p className="text-xs font-semibold truncate">{b.name}</p>
              </div>
            ))}
          </div>

          {/* Body: time column + barber columns */}
          <div className="relative flex" style={{ height: gridHeight }}>
            {/* Time labels column (sticky left) */}
            <div
              className="sticky left-0 z-[5] bg-background"
              style={{ width: TIME_COL_WIDTH }}
            >
              {slots.map((s, idx) => (
                <div
                  key={s.time}
                  className="relative flex items-start justify-end pr-1.5"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span
                    className={cn(
                      'text-[10px] tabular-nums -mt-1.5',
                      s.minute === 0 ? 'text-muted-foreground/80 font-medium' : 'text-muted-foreground/40'
                    )}
                  >
                    {s.minute === 0 || idx === 0 ? s.time : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Barber columns */}
            {activeBarbers.map(b => {
              const apts = appointmentsByBarber[b.id] || [];
              return (
                <div
                  key={b.id}
                  className="relative border-l border-border/30"
                  style={{ width: COLUMN_WIDTH }}
                >
                  {/* Slot cells background */}
                  {slots.map((s) => {
                    const state = getSlotState(b.id, s.time);
                    const isHour = s.minute === 0;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        disabled={state !== 'free'}
                        onClick={() => onSlotClick(s.time, b.id)}
                        className={cn(
                          'block w-full text-left group',
                          'border-b',
                          isHour ? 'border-border/40' : 'border-border/15',
                          state === 'free' && 'hover:bg-primary/5 active:bg-primary/10 transition-colors cursor-pointer',
                          state === 'closed' && 'bg-muted/20',
                          state === 'break' && 'bg-warning/5',
                          state === 'blocked' && 'bg-destructive/5',
                          state === 'past' && 'bg-muted/10'
                        )}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {state === 'free' && (
                          <span className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <CalendarPlus className="h-3 w-3 text-muted-foreground/50" />
                          </span>
                        )}
                        {state === 'break' && s.minute === 0 && (
                          <span className="flex items-center gap-1 pl-1.5 pt-1 text-[9px] text-warning/70">
                            <Clock className="h-2.5 w-2.5" /> Intervalo
                          </span>
                        )}
                        {state === 'blocked' && s.minute === 0 && (
                          <span className="flex items-center gap-1 pl-1.5 pt-1 text-[9px] text-destructive/70">
                            <Ban className="h-2.5 w-2.5" /> Bloqueado
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Appointment overlay cards */}
                  {apts.map(apt => {
                    const { top, height } = positionFor(apt);
                    const status = getStatusConfig(apt.status);
                    return (
                      <button
                        key={apt.id}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAppointmentClick(apt); }}
                        className={cn(
                          'absolute left-1 right-1 rounded-lg border-l-[3px] px-1.5 py-1 text-left shadow-sm',
                          'transition-transform active:scale-[0.98]',
                          status.borderColor,
                          status.bg,
                          'bg-card border border-border/40'
                        )}
                        style={{ top: top + 1, height }}
                      >
                        <p className="text-[11px] font-semibold leading-tight truncate">
                          {apt.customer_name}
                        </p>
                        {apt.service?.name && height > 30 && (
                          <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                            {apt.service.name}
                          </p>
                        )}
                        <p className="text-[9px] text-muted-foreground/70 tabular-nums mt-0.5">
                          {format(new Date(apt.start_time), 'HH:mm')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center mt-2 px-3">
        Arraste para o lado para ver mais profissionais
      </p>
    </div>
  );
};

export default AllBarbersGrid;
