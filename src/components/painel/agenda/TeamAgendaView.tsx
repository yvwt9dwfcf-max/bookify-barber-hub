import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase, Appointment, Barber, BlockedSlot, OpeningHours, Barbershop } from '@/lib/supabase';
import { startOfDay, addDays, format, setHours, setMinutes, isBefore, isAfter, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Coffee, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials } from './agendaUtils';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface TeamAgendaViewProps {
  barbers: Barber[];
  barbershop: Barbershop | null;
  currentBarber: Barber | null;
  canViewOthers: boolean;
  selectedDate: Date;
  onShiftDay: (offset: number) => void;
  onSlotClick: (time: string, barberId: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  refreshKey?: number;
}

const TIME_COL = 52;
const ROW_H = 56;         // per 30-min slot — generous spacing
const COL_DESKTOP = 200;
const COL_MOBILE = 156;

/* Status → subtle accent styles. Never fill the whole card. */
const statusStyles = (status: string) => {
  switch (status) {
    case 'completed':
      return { bar: 'bg-muted-foreground/40', dot: 'bg-muted-foreground/60', label: 'Finalizado', text: 'text-muted-foreground' };
    case 'cancelled':
      return { bar: 'bg-destructive/60', dot: 'bg-destructive', label: 'Cancelado', text: 'text-destructive' };
    case 'in_progress':
      return { bar: 'bg-sky-500/70', dot: 'bg-sky-500', label: 'Em atendimento', text: 'text-sky-600 dark:text-sky-400' };
    case 'pending':
      return { bar: 'bg-amber-500/70', dot: 'bg-amber-500', label: 'Pendente', text: 'text-amber-600 dark:text-amber-500' };
    case 'confirmed':
    default:
      return { bar: 'bg-primary', dot: 'bg-primary', label: 'Confirmado', text: 'text-primary' };
  }
};

const TeamAgendaView = ({
  barbers,
  barbershop,
  currentBarber,
  canViewOthers,
  selectedDate,
  onShiftDay,
  onSlotClick,
  onAppointmentClick,
  refreshKey = 0,
}: TeamAgendaViewProps) => {
  const isMobile = useIsMobile();
  const COL_W = isMobile ? COL_MOBILE : COL_DESKTOP;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const visibleBarbers = useMemo(() => {
    const active = barbers.filter(b => b.is_active);
    if (canViewOthers) return active;
    return active.filter(b => b.id === currentBarber?.id);
  }, [barbers, canViewOthers, currentBarber]);

  // Live clock — updates every 30s for the "now" indicator
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!barbershop?.id || visibleBarbers.length === 0) { setLoading(false); return; }
    setLoading(true);
    try {
      const dayStart = startOfDay(selectedDate);
      const dayEnd = addDays(dayStart, 1);
      const ids = visibleBarbers.map(b => b.id);

      const [aptsRes, blockedRes, hoursRes] = await Promise.all([
        supabase.from('appointments')
          .select('*, service:services(*), barber:barbers(*)')
          .eq('barbershop_id', barbershop.id)
          .in('barber_id', ids)
          .gte('start_time', dayStart.toISOString())
          .lt('start_time', dayEnd.toISOString())
          .order('start_time'),
        supabase.from('blocked_slots')
          .select('id, barber_id, barbershop_id, start_time, end_time, created_at')
          .in('barber_id', ids)
          .gte('end_time', dayStart.toISOString())
          .lt('start_time', dayEnd.toISOString()),
        supabase.from('opening_hours')
          .select('id, barber_id, barbershop_id, day_of_week, start_time, end_time, is_open, break_start, break_end')
          .in('barber_id', ids)
          .eq('day_of_week', selectedDate.getDay()),
      ]);
      if (aptsRes.error) throw aptsRes.error;
      if (blockedRes.error) throw blockedRes.error;
      if (hoursRes.error) throw hoursRes.error;

      setAppointments((aptsRes.data as Appointment[]) || []);
      setBlockedSlots((blockedRes.data || []) as unknown as BlockedSlot[]);
      setOpeningHours((hoursRes.data || []) as unknown as OpeningHours[]);
    } catch (err) {
      console.error('Team agenda error:', err);
      toast.error('Erro ao carregar agenda da equipe');
    } finally {
      setLoading(false);
    }
  }, [barbershop?.id, visibleBarbers, selectedDate]);

  useEffect(() => { fetchAll(); }, [fetchAll, refreshKey]);

  useEffect(() => {
    if (!barbershop?.id) return;
    const ch = supabase
      .channel(`team-agenda-${barbershop.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `barbershop_id=eq.${barbershop.id}` },
        () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [barbershop?.id, fetchAll]);

  const { slots, startMin, endMin } = useMemo(() => {
    if (openingHours.length === 0) return { slots: [] as { time: string; hour: number; minute: number }[], startMin: 0, endMin: 0 };
    let sMin = 24 * 60, eMin = 0;
    openingHours.forEach(h => {
      if (!h.is_open) return;
      const [sh, sm] = h.start_time.split(':').map(Number);
      const [eh, em] = h.end_time.split(':').map(Number);
      sMin = Math.min(sMin, sh * 60 + sm);
      eMin = Math.max(eMin, eh * 60 + em);
    });
    if (sMin >= eMin) return { slots: [], startMin: 0, endMin: 0 };
    const list: { time: string; hour: number; minute: number }[] = [];
    for (let m = sMin; m < eMin; m += 30) {
      list.push({
        time: `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`,
        hour: Math.floor(m / 60),
        minute: m % 60,
      });
    }
    return { slots: list, startMin: sMin, endMin: eMin };
  }, [openingHours]);

  const hoursByBarber = useMemo(() => {
    const m: Record<string, OpeningHours | undefined> = {};
    openingHours.forEach(h => { if (h.is_open) m[h.barber_id] = h; });
    return m;
  }, [openingHours]);

  const aptsByBarber = useMemo(() => {
    const m: Record<string, Appointment[]> = {};
    appointments.forEach(a => {
      if (a.status === 'cancelled') return;
      (m[a.barber_id] ||= []).push(a);
    });
    return m;
  }, [appointments]);

  const blockedByBarber = useMemo(() => {
    const m: Record<string, BlockedSlot[]> = {};
    blockedSlots.forEach(b => { (m[b.barber_id] ||= []).push(b); });
    return m;
  }, [blockedSlots]);

  const gridH = slots.length * ROW_H;

  const slotState = useCallback((barberId: string, time: string) => {
    const h = hoursByBarber[barberId];
    if (!h) return 'closed' as const;
    const [hh, mm] = time.split(':').map(Number);
    const s = setMinutes(setHours(selectedDate, hh), mm);
    const e = addMinutes(s, 30);
    const [sh, sm] = h.start_time.split(':').map(Number);
    const [eh, em] = h.end_time.split(':').map(Number);
    const bStart = setMinutes(setHours(selectedDate, sh), sm);
    const bEnd = setMinutes(setHours(selectedDate, eh), em);
    if (isBefore(s, bStart) || !isBefore(s, bEnd)) return 'closed' as const;
    if (h.break_start && h.break_end) {
      const [bsh, bsm] = h.break_start.split(':').map(Number);
      const [beh, bem] = h.break_end.split(':').map(Number);
      const brS = setMinutes(setHours(selectedDate, bsh), bsm);
      const brE = setMinutes(setHours(selectedDate, beh), bem);
      if (isBefore(s, brE) && isAfter(e, brS)) return 'break' as const;
    }
    const bs = blockedByBarber[barberId] || [];
    if (bs.some(b => isBefore(s, new Date(b.end_time)) && isAfter(e, new Date(b.start_time)))) return 'blocked' as const;
    if (isBefore(s, now)) return 'past' as const;
    return 'free' as const;
  }, [hoursByBarber, blockedByBarber, selectedDate, now]);

  const positionFor = (start: Date, end: Date) => {
    const st = start.getHours() * 60 + start.getMinutes();
    const en = end.getHours() * 60 + end.getMinutes();
    const top = ((st - startMin) / 30) * ROW_H;
    const height = Math.max(((en - st) / 30) * ROW_H - 4, 40);
    return { top, height };
  };

  const isToday =
    now.getFullYear() === selectedDate.getFullYear() &&
    now.getMonth() === selectedDate.getMonth() &&
    now.getDate() === selectedDate.getDate();

  const nowTop = useMemo(() => {
    if (!isToday || slots.length === 0) return null;
    const cur = now.getHours() * 60 + now.getMinutes();
    if (cur < startMin || cur > endMin) return null;
    return ((cur - startMin) / 30) * ROW_H;
  }, [isToday, now, startMin, endMin, slots.length]);

  // Auto-scroll to now on mount
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current || nowTop == null) return;
    const target = Math.max(nowTop - 160, 0);
    scrollRef.current.scrollTo({ top: target, behavior: 'smooth' });
  }, [nowTop != null, slots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-2 mt-3">
        <PremiumSkeleton className="h-14 rounded-2xl" />
        <PremiumSkeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (visibleBarbers.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground">
        Nenhum profissional ativo.
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Day pill header — elegant, minimal */}
      <div className="flex items-center justify-between gap-3 mb-3 px-0.5">
        <button
          type="button"
          onClick={() => onShiftDay(-1)}
          className="h-9 w-9 rounded-full border border-border/60 bg-card/60 flex items-center justify-center hover-scale active:scale-95 transition-all"
          aria-label="Dia anterior"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col items-center leading-tight">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium">
            {isToday ? 'Hoje' : format(selectedDate, 'EEEE', { locale: ptBR })}
          </span>
          <span className="text-sm font-semibold capitalize tabular-nums">
            {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onShiftDay(1)}
          className="h-9 w-9 rounded-full border border-border/60 bg-card/60 flex items-center justify-center hover-scale active:scale-95 transition-all"
          aria-label="Próximo dia"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-card/40 border border-dashed border-border/50">
          <p className="text-sm font-medium text-muted-foreground">Nenhum profissional atende neste dia</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
          <div
            ref={scrollRef}
            className="overflow-auto overscroll-contain"
            style={{ maxHeight: 'calc(100dvh - 260px)', scrollbarWidth: 'thin' }}
          >
            <div style={{ width: TIME_COL + visibleBarbers.length * COL_W, minWidth: '100%' }}>
              {/* Header row */}
              <div
                className="sticky top-0 z-20 flex bg-card/95 backdrop-blur-md border-b border-border/50"
                style={{ paddingLeft: TIME_COL }}
              >
                {visibleBarbers.map((b) => {
                  const count = (aptsByBarber[b.id] || []).length;
                  const isOpen = !!hoursByBarber[b.id];
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-2.5 px-3 py-3 border-l border-border/30"
                      style={{ width: COL_W }}
                    >
                      {b.photo_url ? (
                        <img
                          src={b.photo_url}
                          alt={b.name}
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-border/50 shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-foreground/70 shrink-0">
                          {getInitials(b.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold truncate leading-tight">{b.name}</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                          {isOpen ? `${count} ${count === 1 ? 'agendamento' : 'agendamentos'}` : 'Sem expediente'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Body */}
              <div className="relative flex" style={{ height: gridH }}>
                {/* Time column */}
                <div className="sticky left-0 z-10 bg-card/95 backdrop-blur-sm" style={{ width: TIME_COL }}>
                  {slots.map((s, i) => (
                    <div
                      key={s.time}
                      className="relative flex items-start justify-end pr-2"
                      style={{ height: ROW_H }}
                    >
                      {(s.minute === 0 || i === 0) && (
                        <span className="text-[10px] tabular-nums font-medium text-muted-foreground/60 -mt-1.5">
                          {s.time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Columns */}
                {visibleBarbers.map((b) => {
                  const apts = aptsByBarber[b.id] || [];
                  return (
                    <div
                      key={b.id}
                      className="relative border-l border-border/30"
                      style={{ width: COL_W }}
                    >
                      {/* Slot backgrounds — very discreet guides */}
                      {slots.map((s) => {
                        const st = slotState(b.id, s.time);
                        const isHour = s.minute === 0;
                        return (
                          <button
                            key={s.time}
                            type="button"
                            disabled={st !== 'free'}
                            onClick={() => onSlotClick(s.time, b.id)}
                            className={cn(
                              'block w-full text-left group border-b',
                              isHour ? 'border-border/25' : 'border-border/10',
                              st === 'free' && 'transition-colors md:hover:bg-primary/[0.04] active:bg-primary/[0.06] cursor-pointer',
                              st === 'closed' && 'bg-muted/[0.15]',
                              st === 'break' && 'bg-amber-500/[0.04]',
                              st === 'blocked' && 'bg-destructive/[0.05]',
                              st === 'past' && 'bg-muted/[0.08]',
                            )}
                            style={{ height: ROW_H }}
                          >
                            {st === 'free' && (
                              <div className="flex items-center gap-1.5 h-full pl-3 opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <Plus className="h-3 w-3 text-muted-foreground/50" strokeWidth={2.5} />
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                                  Disponível
                                </span>
                              </div>
                            )}
                            {st === 'break' && s.minute === 0 && (
                              <div className="flex items-center gap-1 pl-3 pt-1.5 text-[10px] text-amber-600/80 dark:text-amber-500/80">
                                <Coffee className="h-3 w-3" /> Intervalo
                              </div>
                            )}
                            {st === 'blocked' && s.minute === 0 && (
                              <div className="flex items-center gap-1 pl-3 pt-1.5 text-[10px] text-destructive/80">
                                <Ban className="h-3 w-3" /> Bloqueado
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {/* Appointment cards */}
                      {apts.map((apt) => {
                        const s = new Date(apt.start_time);
                        const e = new Date(apt.end_time);
                        const { top, height } = positionFor(s, e);
                        const st = statusStyles(apt.status);
                        const durMin = Math.round((e.getTime() - s.getTime()) / 60000);
                        const compact = height < 60;
                        return (
                          <button
                            key={apt.id}
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); onAppointmentClick(apt); }}
                            className={cn(
                              'absolute left-1.5 right-1.5 rounded-xl bg-card border border-border/60',
                              'text-left px-3 py-2 overflow-hidden',
                              'shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]',
                              'transition-all md:hover:border-border md:hover:shadow-md active:scale-[0.99]',
                            )}
                            style={{ top: top + 2, height }}
                          >
                            {/* Left accent bar */}
                            <span
                              className={cn('absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full', st.bar)}
                              aria-hidden
                            />
                            <div className="pl-1.5 flex flex-col h-full">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-[13px] font-semibold leading-tight truncate flex-1">
                                  {apt.customer_name}
                                </p>
                              </div>
                              {!compact && apt.service?.name && (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {apt.service.name}
                                </p>
                              )}
                              <div className="mt-auto flex items-center gap-1.5 pt-1">
                                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', st.dot)} aria-hidden />
                                <span className="text-[10px] tabular-nums text-muted-foreground/80">
                                  {format(s, 'HH:mm')} · {durMin}min
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Now indicator — spans all columns */}
                {nowTop != null && (
                  <div
                    className="pointer-events-none absolute z-[15]"
                    style={{ top: nowTop, left: TIME_COL - 6, right: 0 }}
                  >
                    <div className="relative flex items-center">
                      <span className="h-2 w-2 rounded-full bg-primary ring-2 ring-background shrink-0" />
                      <span className="h-px flex-1 bg-primary/50" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {visibleBarbers.length > 2 && (
        <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
          Arraste lateralmente para ver mais profissionais
        </p>
      )}
    </div>
  );
};

export default TeamAgendaView;
