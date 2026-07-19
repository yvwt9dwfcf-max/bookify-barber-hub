import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase, Appointment, Barber, BlockedSlot, OpeningHours, Barbershop } from '@/lib/supabase';
import { startOfDay, addDays, format, setHours, setMinutes, isBefore, isAfter, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Coffee, Ban, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
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

const TIME_COL = 64;
const ROW_H = 68;        // per 30-min slot — generous, breathable
const COL_DESKTOP = 244;
const COL_MOBILE = 200;
const GUTTER = 10;

/* Status → soft, refined accent palette (Linear/Stripe inspired) */
const statusStyles = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        ring: 'ring-muted-foreground/15',
        bar: 'bg-muted-foreground/50',
        dot: 'bg-muted-foreground/60',
        chip: 'bg-muted/60 text-muted-foreground',
        label: 'Finalizado',
      };
    case 'cancelled':
      return {
        ring: 'ring-destructive/20',
        bar: 'bg-destructive/70',
        dot: 'bg-destructive',
        chip: 'bg-destructive/10 text-destructive',
        label: 'Cancelado',
      };
    case 'in_progress':
      return {
        ring: 'ring-sky-500/25',
        bar: 'bg-sky-500',
        dot: 'bg-sky-500',
        chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        label: 'Em atendimento',
      };
    case 'pending':
      return {
        ring: 'ring-amber-500/25',
        bar: 'bg-amber-500',
        dot: 'bg-amber-500',
        chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
        label: 'Pendente',
      };
    case 'confirmed':
    default:
      return {
        ring: 'ring-primary/25',
        bar: 'bg-primary',
        dot: 'bg-primary',
        chip: 'bg-primary/10 text-primary',
        label: 'Confirmado',
      };
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
    // sort each barber's list
    Object.values(m).forEach(list => list.sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
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
    const height = Math.max(((en - st) / 30) * ROW_H - 6, 52);
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

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current || nowTop == null) return;
    const target = Math.max(nowTop - 180, 0);
    scrollRef.current.scrollTo({ top: target, behavior: 'smooth' });
  }, [nowTop != null, slots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Next upcoming appointment per barber
  const nextByBarber = useMemo(() => {
    const m: Record<string, Appointment | undefined> = {};
    Object.entries(aptsByBarber).forEach(([bid, list]) => {
      m[bid] = list.find(a =>
        new Date(a.start_time).getTime() > now.getTime() &&
        a.status !== 'completed' && a.status !== 'cancelled'
      );
    });
    return m;
  }, [aptsByBarber, now]);

  if (loading) {
    return (
      <div className="space-y-3 mt-3">
        <PremiumSkeleton className="h-14 rounded-2xl" />
        <PremiumSkeleton className="h-[520px] rounded-3xl" />
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

  const totalToday = Object.values(aptsByBarber).reduce((n, l) => n + l.length, 0);
  const workingCount = visibleBarbers.filter(b => hoursByBarber[b.id]).length;

  return (
    <div className="animate-fade-in">
      {/* Command header — premium day switcher + live status */}
      <div className="flex items-center justify-between gap-3 mb-4 px-1">
        <button
          type="button"
          onClick={() => onShiftDay(-1)}
          className="h-10 w-10 rounded-full bg-card border border-border/60 flex items-center justify-center md:hover:bg-accent active:scale-95 transition-all shadow-sm"
          aria-label="Dia anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-3">
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold">
              {isToday ? 'Hoje' : format(selectedDate, 'EEEE', { locale: ptBR })}
            </span>
            <span className="text-[15px] font-semibold capitalize tabular-nums mt-0.5">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onShiftDay(1)}
          className="h-10 w-10 rounded-full bg-card border border-border/60 flex items-center justify-center md:hover:bg-accent active:scale-95 transition-all shadow-sm"
          aria-label="Próximo dia"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Live status strip */}
      <div className="flex items-center justify-center gap-4 mb-3 text-[11px] text-muted-foreground/80">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/60 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="tabular-nums font-medium">{format(now, 'HH:mm')}</span>
        </div>
        <span className="w-px h-3 bg-border" />
        <span><b className="text-foreground/80 font-semibold">{workingCount}</b> {workingCount === 1 ? 'trabalhando' : 'trabalhando'}</span>
        <span className="w-px h-3 bg-border" />
        <span><b className="text-foreground/80 font-semibold">{totalToday}</b> {totalToday === 1 ? 'agendamento' : 'agendamentos'}</span>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-20 rounded-3xl bg-card/40 border border-dashed border-border/50">
          <p className="text-sm font-medium text-muted-foreground">Nenhum profissional atende neste dia</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-card/70 to-card/30 backdrop-blur-md overflow-hidden shadow-[0_1px_2px_hsl(var(--foreground)/0.03),0_8px_32px_-12px_hsl(var(--foreground)/0.08)]">
          <div
            ref={scrollRef}
            className="overflow-auto overscroll-contain"
            style={{ maxHeight: 'calc(100dvh - 240px)', scrollbarWidth: 'thin' }}
          >
            <div style={{ width: TIME_COL + visibleBarbers.length * COL_W, minWidth: '100%' }}>
              {/* Header row — rich profile cards */}
              <div
                className="sticky top-0 z-20 flex bg-card/95 backdrop-blur-xl border-b border-border/50"
                style={{ paddingLeft: TIME_COL }}
              >
                {visibleBarbers.map((b) => {
                  const count = (aptsByBarber[b.id] || []).length;
                  const isOpen = !!hoursByBarber[b.id];
                  const next = nextByBarber[b.id];
                  const subtitle = !isOpen
                    ? 'Sem expediente'
                    : next
                      ? `Próximo · ${format(new Date(next.start_time), 'HH:mm')}`
                      : count > 0
                        ? `${count} ${count === 1 ? 'agendamento' : 'agendamentos'}`
                        : 'Livre hoje';
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 px-4 py-4 border-l border-border/25"
                      style={{ width: COL_W }}
                    >
                      <div className="relative shrink-0">
                        {b.photo_url ? (
                          <img
                            src={b.photo_url}
                            alt={b.name}
                            className="h-11 w-11 rounded-full object-cover ring-2 ring-background shadow-sm"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[13px] font-semibold text-primary ring-2 ring-background shadow-sm">
                            {getInitials(b.name)}
                          </div>
                        )}
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card',
                            isOpen ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                          )}
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold truncate leading-tight tracking-tight">{b.name}</p>
                        <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">
                          {subtitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Body */}
              <div className="relative flex" style={{ height: gridH }}>
                {/* Time column — clean, high-contrast, hour-anchored */}
                <div className="sticky left-0 z-10 bg-card/95 backdrop-blur-sm border-r border-border/40" style={{ width: TIME_COL }}>
                  {slots.map((s, i) => {
                    const isHour = s.minute === 0 || i === 0;
                    return (
                      <div
                        key={s.time}
                        className="relative flex items-start justify-end pr-3"
                        style={{ height: ROW_H }}
                      >
                        {isHour && (
                          <span className="text-[11px] tabular-nums font-semibold text-foreground/70 -mt-2 tracking-tight">
                            {s.time}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Columns */}
                {visibleBarbers.map((b, colIdx) => {
                  const apts = aptsByBarber[b.id] || [];
                  const isEven = colIdx % 2 === 0;
                  return (
                    <div
                      key={b.id}
                      className={cn(
                        'relative border-l border-border/20',
                        isEven ? 'bg-background/0' : 'bg-foreground/[0.012]'
                      )}
                      style={{ width: COL_W }}
                    >
                      {/* Slot backgrounds */}
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
                              'block w-full text-left group border-b relative',
                              isHour ? 'border-border/30' : 'border-border/10 border-dashed',
                              st === 'free' && 'transition-colors md:hover:bg-primary/[0.05] active:bg-primary/[0.07] cursor-pointer',
                              st === 'closed' && 'bg-muted/[0.25]',
                              st === 'past' && 'bg-muted/[0.08]',
                            )}
                            style={{ height: ROW_H }}
                          >
                            {st === 'free' && (
                              <div className="flex items-center gap-1.5 h-full pl-4 opacity-40 md:group-hover:opacity-100 transition-opacity">
                                <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/40 md:group-hover:border-primary md:group-hover:bg-primary/10 flex items-center justify-center transition-all">
                                  <Plus className="h-3 w-3 text-muted-foreground/60 md:group-hover:text-primary" strokeWidth={2.5} />
                                </div>
                                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 md:group-hover:text-primary font-medium transition-colors">
                                  Livre
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {/* Break overlays — elegant striped bands */}
                      {(() => {
                        const h = hoursByBarber[b.id];
                        if (!h?.break_start || !h?.break_end) return null;
                        const [bsh, bsm] = h.break_start.split(':').map(Number);
                        const [beh, bem] = h.break_end.split(':').map(Number);
                        const s = bsh * 60 + bsm;
                        const e = beh * 60 + bem;
                        if (e <= startMin || s >= endMin) return null;
                        const top = ((Math.max(s, startMin) - startMin) / 30) * ROW_H;
                        const height = ((Math.min(e, endMin) - Math.max(s, startMin)) / 30) * ROW_H;
                        return (
                          <div
                            className="absolute left-2 right-2 rounded-2xl pointer-events-none overflow-hidden"
                            style={{
                              top: top + 3,
                              height: height - 6,
                              background: 'repeating-linear-gradient(135deg, hsl(var(--muted) / 0.5) 0px, hsl(var(--muted) / 0.5) 6px, hsl(var(--muted) / 0.2) 6px, hsl(var(--muted) / 0.2) 12px)',
                            }}
                          >
                            <div className="flex items-center gap-1.5 px-3 pt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-semibold">
                              <Coffee className="h-3 w-3" /> Intervalo
                            </div>
                            <div className="px-3 pt-0.5 text-[11px] tabular-nums text-muted-foreground/70">
                              {h.break_start.slice(0,5)} – {h.break_end.slice(0,5)}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Blocked overlays */}
                      {(blockedByBarber[b.id] || []).map((blk) => {
                        const bs = new Date(blk.start_time);
                        const be = new Date(blk.end_time);
                        const sMin = bs.getHours() * 60 + bs.getMinutes();
                        const eMin2 = be.getHours() * 60 + be.getMinutes();
                        if (eMin2 <= startMin || sMin >= endMin) return null;
                        const top = ((Math.max(sMin, startMin) - startMin) / 30) * ROW_H;
                        const height = ((Math.min(eMin2, endMin) - Math.max(sMin, startMin)) / 30) * ROW_H;
                        return (
                          <div
                            key={blk.id}
                            className="absolute left-2 right-2 rounded-2xl pointer-events-none bg-destructive/[0.06] border border-destructive/20"
                            style={{ top: top + 3, height: height - 6 }}
                          >
                            <div className="flex items-center gap-1.5 px-3 pt-2 text-[10px] uppercase tracking-[0.14em] text-destructive/80 font-semibold">
                              <Ban className="h-3 w-3" /> Bloqueado
                            </div>
                          </div>
                        );
                      })}

                      {/* Appointment cards — refined premium */}
                      {apts.map((apt) => {
                        const s = new Date(apt.start_time);
                        const e = new Date(apt.end_time);
                        const { top, height } = positionFor(s, e);
                        const st = statusStyles(apt.status);
                        const durMin = Math.round((e.getTime() - s.getTime()) / 60000);
                        const compact = height < 74;
                        const isNext = nextByBarber[b.id]?.id === apt.id;
                        return (
                          <button
                            key={apt.id}
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); onAppointmentClick(apt); }}
                            className={cn(
                              'absolute rounded-2xl bg-card text-left overflow-hidden',
                              'ring-1 shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_2px_8px_-4px_hsl(var(--foreground)/0.08)]',
                              'transition-all md:hover:shadow-[0_2px_4px_hsl(var(--foreground)/0.05),0_12px_28px_-10px_hsl(var(--foreground)/0.18)] md:hover:-translate-y-[1px] active:scale-[0.99]',
                              st.ring,
                              isNext && 'ring-2',
                            )}
                            style={{ top: top + 3, height, left: GUTTER, right: GUTTER }}
                          >
                            {/* Accent bar */}
                            <span
                              className={cn('absolute left-0 top-0 bottom-0 w-[3px]', st.bar)}
                              aria-hidden
                            />
                            <div className="pl-3.5 pr-3 py-2.5 flex flex-col h-full gap-0.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[13.5px] font-semibold leading-tight truncate tracking-tight flex-1">
                                  {apt.customer_name}
                                </p>
                                <span className="text-[11px] tabular-nums font-medium text-foreground/60 shrink-0 mt-0.5">
                                  {format(s, 'HH:mm')}
                                </span>
                              </div>
                              {!compact && apt.service?.name && (
                                <p className="text-[11.5px] text-muted-foreground truncate leading-snug">
                                  {apt.service.name}
                                </p>
                              )}
                              <div className="mt-auto flex items-center gap-1.5 pt-1.5">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] uppercase tracking-[0.1em] font-semibold',
                                    st.chip
                                  )}
                                >
                                  <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
                                  {st.label}
                                </span>
                                <span className="text-[10px] tabular-nums text-muted-foreground/70 ml-auto">
                                  {durMin}min
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Now indicator */}
                {nowTop != null && (
                  <div
                    className="pointer-events-none absolute z-[15]"
                    style={{ top: nowTop, left: TIME_COL - 8, right: 0 }}
                  >
                    <div className="relative flex items-center">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute h-3 w-3 rounded-full bg-emerald-500/30 animate-ping" />
                        <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background shadow-[0_0_0_1px_hsl(var(--background))]" />
                      </div>
                      <span className="h-[1.5px] flex-1 bg-gradient-to-r from-emerald-500/70 via-emerald-500/40 to-transparent" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {visibleBarbers.length > 2 && (
        <p className="text-[10px] text-muted-foreground/50 text-center mt-3 flex items-center justify-center gap-1.5">
          <Circle className="h-1 w-1 fill-current" />
          Arraste lateralmente para ver mais profissionais
          <Circle className="h-1 w-1 fill-current" />
        </p>
      )}
    </div>
  );
};

export default TeamAgendaView;
