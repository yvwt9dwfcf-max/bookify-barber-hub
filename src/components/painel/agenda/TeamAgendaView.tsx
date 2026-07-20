import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase, Appointment, Barber, BlockedSlot, OpeningHours, Barbershop } from '@/lib/supabase';
import { startOfDay, addDays, format, setHours, setMinutes, isBefore, isAfter, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials } from './agendaUtils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * TeamAgendaView — Bookify Barber
 * Editorial, ultra-compact schedule surface. Designed from scratch
 * (not built on shadcn primitives) to feel like Linear/Apple Calendar,
 * not a generic admin dashboard.
 */

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

/* Sizing — mobile-first, dense */
const TIME_COL = 40;
const ROW_H = 44;               // per 30-min slot
const COL_MOBILE = 156;
const COL_DESKTOP = 224;
const HEADER_H = 52;            // ~10% of viewport, ultra-compact
const CARD_INSET_X = 4;

/* Status → tiny discrete accent (never blocks of colour) */
const statusAccent = (status: string) => {
  switch (status) {
    case 'completed':  return { dot: 'bg-foreground/25',  label: 'Finalizado' };
    case 'cancelled':  return { dot: 'bg-destructive/70', label: 'Cancelado'  };
    case 'in_progress':return { dot: 'bg-sky-500',        label: 'Em atendimento' };
    case 'pending':    return { dot: 'bg-amber-500',      label: 'Pendente' };
    default:           return { dot: 'bg-emerald-500',    label: 'Confirmado' };
  }
};

const TeamAgendaView = ({
  barbers, barbershop, currentBarber, canViewOthers,
  selectedDate, onShiftDay, onSlotClick, onAppointmentClick, refreshKey = 0,
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
    return canViewOthers ? active : active.filter(b => b.id === currentBarber?.id);
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
    const height = Math.max(((en - st) / 30) * ROW_H - 2, ROW_H - 2);
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
    scrollRef.current.scrollTo({ top: Math.max(nowTop - 140, 0), behavior: 'smooth' });
  }, [nowTop != null, slots.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="mt-2 h-[70dvh] rounded-none bg-gradient-to-b from-foreground/[0.02] to-transparent animate-pulse" />
    );
  }

  if (visibleBarbers.length === 0) {
    return <div className="text-center py-16 text-sm text-muted-foreground">Nenhum profissional ativo.</div>;
  }

  return (
    <div className="animate-fade-in -mx-3 md:-mx-5 lg:-mx-8">
      {/* Ultra-compact day switcher — pure typography, no chrome */}
      <div className="flex items-center justify-center gap-4 px-4 pt-1 pb-2">
        <button
          type="button"
          onClick={() => onShiftDay(-1)}
          className="h-8 w-8 -m-1 flex items-center justify-center text-foreground/40 md:hover:text-foreground active:scale-90 transition-all"
          aria-label="Dia anterior"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[11px] uppercase tracking-[0.22em] text-foreground/40 font-medium">
            {isToday ? 'Hoje' : format(selectedDate, 'EEE', { locale: ptBR }).replace('.', '')}
          </span>
          <span className="text-[15px] font-medium capitalize tabular-nums tracking-tight text-foreground/90">
            {format(selectedDate, "d 'de' MMM", { locale: ptBR }).replace('.', '')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onShiftDay(1)}
          className="h-8 w-8 -m-1 flex items-center justify-center text-foreground/40 md:hover:text-foreground active:scale-90 transition-all"
          aria-label="Próximo dia"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-20 text-sm text-muted-foreground">Nenhum profissional atende neste dia</div>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-auto overscroll-contain border-t border-foreground/[0.06]"
          style={{ height: 'calc(100dvh - 190px)', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{ width: TIME_COL + visibleBarbers.length * COL_W, minWidth: '100%' }}>
            {/* Barber header — 52px, sticky, minimal (foto · nome · próximo) */}
            <div
              className="sticky top-0 z-20 flex bg-background/85 backdrop-blur-xl border-b border-foreground/[0.08]"
              style={{ paddingLeft: TIME_COL, height: HEADER_H }}
            >
              {visibleBarbers.map((b) => {
                const isOpen = !!hoursByBarber[b.id];
                const next = nextByBarber[b.id];
                const meta = !isOpen
                  ? 'Sem expediente'
                  : next
                    ? `Próx. ${format(new Date(next.start_time), 'HH:mm')}`
                    : 'Livre';
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 px-3"
                    style={{ width: COL_W }}
                  >
                    <div className="relative shrink-0">
                      {b.photo_url ? (
                        <img
                          src={b.photo_url}
                          alt={b.name}
                          className="h-8 w-8 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] font-semibold text-foreground/70">
                          {getInitials(b.name)}
                        </div>
                      )}
                      {isOpen && (
                        <span className="absolute -bottom-0 -right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-[12.5px] font-semibold truncate tracking-tight text-foreground/95">
                        {b.name.split(' ')[0]}
                      </p>
                      <p className="text-[10px] text-foreground/45 truncate tabular-nums mt-0.5">
                        {meta}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Body */}
            <div className="relative flex" style={{ height: gridH }}>
              {/* Time gutter — hour marks only, tiny, right-aligned */}
              <div
                className="sticky left-0 z-10 bg-background/90 backdrop-blur-sm"
                style={{ width: TIME_COL }}
              >
                {slots.map((s) => {
                  const isHour = s.minute === 0;
                  return (
                    <div key={s.time} className="relative flex items-start justify-end pr-2" style={{ height: ROW_H }}>
                      {isHour && (
                        <span className="text-[10px] tabular-nums font-medium text-foreground/35 -mt-1.5 tracking-tight">
                          {s.time}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Columns */}
              {visibleBarbers.map((b) => {
                const apts = aptsByBarber[b.id] || [];
                return (
                  <div
                    key={b.id}
                    className="relative border-l border-foreground/[0.06]"
                    style={{ width: COL_W }}
                  >
                    {/* Slot cells — invisible tap targets, hairline hour rules */}
                    {slots.map((s) => {
                      const st = slotState(b.id, s.time);
                      const isHour = s.minute === 0;
                      return (
                        <button
                          key={s.time}
                          type="button"
                          disabled={st !== 'free'}
                          onClick={() => onSlotClick(s.time, b.id)}
                          aria-label={st === 'free' ? `Novo agendamento às ${s.time}` : undefined}
                          className={cn(
                            'block w-full text-left relative',
                            isHour && 'border-t border-foreground/[0.06]',
                            st === 'free' && 'cursor-pointer md:hover:bg-foreground/[0.02] active:bg-foreground/[0.035]',
                            st === 'closed' && 'bg-foreground/[0.015]',
                          )}
                          style={{ height: ROW_H }}
                        />
                      );
                    })}

                    {/* Break — thin discrete rule, not a filled block */}
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
                          className="absolute left-2 right-2 pointer-events-none flex items-center"
                          style={{ top, height }}
                        >
                          <div className="w-full flex items-center gap-2">
                            <span className="h-px flex-1 bg-foreground/[0.12]" />
                            <span className="text-[9px] uppercase tracking-[0.2em] text-foreground/35 font-medium">
                              Intervalo
                            </span>
                            <span className="h-px flex-1 bg-foreground/[0.12]" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Blocked — subtle diagonal fill, tiny label */}
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
                          className="absolute pointer-events-none flex items-center justify-center"
                          style={{
                            top, height, left: CARD_INSET_X, right: CARD_INSET_X,
                            background:
                              'repeating-linear-gradient(135deg, hsl(var(--foreground) / 0.04) 0px, hsl(var(--foreground) / 0.04) 4px, transparent 4px, transparent 9px)',
                          }}
                        >
                          <span className="text-[9px] uppercase tracking-[0.2em] text-foreground/40 font-medium bg-background/70 px-1.5 rounded">
                            Bloqueado
                          </span>
                        </div>
                      );
                    })}

                    {/* Appointment cards — editorial, client-first hierarchy */}
                    {apts.map((apt) => {
                      const s = new Date(apt.start_time);
                      const e = new Date(apt.end_time);
                      const { top, height } = positionFor(s, e);
                      const st = statusAccent(apt.status);
                      const compact = height < 56;
                      const isNext = nextByBarber[b.id]?.id === apt.id;
                      const dim = apt.status === 'completed' || apt.status === 'cancelled';
                      return (
                        <button
                          key={apt.id}
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); onAppointmentClick(apt); }}
                          className={cn(
                            'absolute rounded-[10px] text-left overflow-hidden group',
                            'bg-background border border-foreground/[0.08]',
                            'shadow-[0_1px_0_hsl(var(--foreground)/0.02)]',
                            'transition-all duration-150',
                            'md:hover:border-foreground/20 md:hover:shadow-[0_4px_16px_-6px_hsl(var(--foreground)/0.18)]',
                            'md:hover:-translate-y-px active:scale-[0.99]',
                            isNext && 'border-foreground/25 shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.15)]',
                            dim && 'opacity-55',
                          )}
                          style={{
                            top: top + 1,
                            height: height - 1,
                            left: CARD_INSET_X,
                            right: CARD_INSET_X,
                          }}
                        >
                          <div className={cn('h-full flex flex-col', compact ? 'px-2.5 py-1.5' : 'px-3 py-2')}>
                            {/* Row 1 — time (tiny, muted) */}
                            <div className="flex items-center gap-1.5 leading-none">
                              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', st.dot)} aria-hidden />
                              <span className="text-[10px] tabular-nums font-semibold text-foreground/50 tracking-wide">
                                {format(s, 'HH:mm')}
                              </span>
                            </div>
                            {/* Row 2 — CLIENT NAME, the hero */}
                            <p className={cn(
                              'font-semibold tracking-tight text-foreground truncate leading-tight',
                              compact ? 'text-[12.5px] mt-1' : 'text-[13.5px] mt-1.5'
                            )}>
                              {apt.customer_name}
                            </p>
                            {/* Row 3 — service, whisper */}
                            {!compact && apt.service?.name && (
                              <p className="text-[11px] text-foreground/45 truncate leading-snug mt-0.5">
                                {apt.service.name}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Now indicator — hairline + dot */}
              {nowTop != null && (
                <div
                  className="pointer-events-none absolute z-[15]"
                  style={{ top: nowTop, left: TIME_COL - 4, right: 0 }}
                >
                  <div className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    <span className="h-px flex-1 bg-emerald-500/70" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamAgendaView;
