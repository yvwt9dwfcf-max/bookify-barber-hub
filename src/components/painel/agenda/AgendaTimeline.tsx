import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Coffee, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Appointment } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AgendaAvatar } from './AgendaToolbar';
import {
  appointmentLanes, appointmentMatches, canPlaceSlot, currency, dayMinute, freeIntervals,
  minuteLabel, positionInterval, slotInterval, timeMinute, timelineRange,
  type AgendaFilter, type Interval, type AgendaMode, type TimelineColumn,
} from './timelineUtils';

interface Props {
  columns: TimelineColumn[]; mode: AgendaMode; filter: AgendaFilter; compact: boolean;
  canEditBarber: (id: string) => boolean;
  onSlot: (time: string, barberId: string, date: Date) => void;
  onBlock: (time: string, barberId: string, date: Date) => void;
  onAppointment: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}
function TimelineAppointment({ appointment: a, column, range, ppm, lane, count, canEdit, p }: {
  appointment: Appointment; column: TimelineColumn; range: { start: number; end: number }; ppm: number;
  lane: number; count: number; canEdit: boolean; p: Props;
}) {
  const [actions, setActions] = useState(false);
  const startTouch = useRef<{ x: number; y: number }>();
  const position = positionInterval({ start: dayMinute(a.start_time, column.date), end: dayMinute(a.end_time, column.date) }, range, ppm);
  const short = position.height < 65;
  const stripe = a.status === 'completed' ? 'completed' : a.status === 'cancelled' ? 'cancelled' : a.origin === 'online' ? 'online' : 'confirmed';
  if (position.height <= 0) return null;
  return <div className={cn('agenda-appointment', `stripe-${stripe}`, a.status === 'cancelled' && 'is-cancelled', short && 'is-short', position.height < 36 && 'is-tiny')}
    style={{ top: position.top + 2, height: Math.max(position.height - 4, 0), left: `calc(${lane / count * 100}% + 5px)`, width: `calc(${100 / count}% - 10px)` }}
    onTouchStart={e => { const t = e.touches[0]; startTouch.current = { x: t.clientX, y: t.clientY }; }}
    onTouchEnd={e => { const t = e.changedTouches[0], start = startTouch.current; if (p.mode === 'individual' && canEdit && start && start.x - t.clientX > 40 && Math.abs(start.y - t.clientY) < 30) { e.preventDefault(); setActions(true); } }}>
    <Button variant="ghost" className="agenda-appointment-main" aria-label={`${a.customer_name}, ${format(new Date(a.start_time), 'HH:mm')}, ${a.service?.name || 'Atendimento'}`} onClick={() => actions ? setActions(false) : p.onAppointment(a)}>
      <span className="agenda-client">{a.customer_name}</span>
      <span className="agenda-service">{a.service?.name || 'Atendimento'}{p.mode === 'individual' && a.service && <span> · {currency(Number(a.service.price || 0))}</span>}</span>
      {!short && <span className="agenda-card-time">{format(new Date(a.start_time), 'HH:mm')} – {format(new Date(a.end_time), 'HH:mm')}</span>}
      {!short && <span className={cn('agenda-card-badge', `badge-${stripe}`)}>{a.status === 'completed' ? 'Concluído' : a.status === 'cancelled' ? 'Cancelado' : a.origin === 'online' ? 'Online' : 'Confirmado'}</span>}
    </Button>
    {actions && <div className="agenda-card-actions">
      <Button variant="ghost" size="icon" aria-label={`Editar ${a.customer_name}`} onClick={() => { setActions(false); p.onEdit(a); }}><Pencil /></Button>
      {a.status === 'confirmed' && <Button variant="ghost" size="icon" aria-label={`Concluir ${a.customer_name}`} onClick={() => { setActions(false); p.onComplete(a.id); }}><Check /></Button>}
      <Button variant="ghost" size="icon" aria-label={`Excluir ${a.customer_name}`} onClick={() => { setActions(false); p.onAppointment(a); }}><Trash2 /></Button>
      <Button variant="ghost" size="icon" aria-label="Fechar ações" onClick={() => setActions(false)}><X /></Button>
    </div>}
  </div>;
}
/** Marks the slot that is already running (today) as an encaixe: bookable only by staff, never online. */
function withEncaixe(column: TimelineColumn, free: Interval[], now: Date): (Interval & { encaixe?: boolean })[] {
  if (!isSameDay(column.date, now) || !column.hours?.is_open) return free;
  const minute = dayMinute(now, column.date);
  const slotStart = Math.floor(minute / 15) * 15;
  if (slotStart === minute || slotStart < timeMinute(column.hours.start_time) || minute >= timeMinute(column.hours.end_time)) return free;
  const busy = [...column.blocks, ...column.appointments.filter(a => a.status !== 'cancelled').map(a => ({ start: dayMinute(a.start_time, column.date), end: dayMinute(a.end_time, column.date) }))]
    .some(i => i.start < minute && i.end > slotStart);
  if (busy) return free;
  const next = Math.ceil(minute / 15) * 15;
  const rest = free.filter(g => g.start !== next);
  const joined = free.find(g => g.start === next);
  return [{ start: slotStart, end: joined ? joined.end : next, encaixe: true }, ...rest];
}

export default function AgendaTimeline(p: Props) {
  const isMobile = useIsMobile();
  const [now, setNow] = useState(new Date());
  const scroll = useRef<HTMLDivElement>(null);
  const initialScroll = useRef('');
  useEffect(() => {
    // Tick on the exact minute boundary so the "now" line never lags behind the phone clock.
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => { const d = new Date(); setNow(d); timeout = setTimeout(tick, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50); };
    tick();
    const onVisible = () => { if (document.visibilityState === 'visible') { clearTimeout(timeout); tick(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(timeout); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  const range = useMemo(() => timelineRange(p.columns), [p.columns]);
  const ppm = isMobile ? (p.compact ? 1.3 : 1.8) : (p.compact ? 1.6 : 2.2);
  const totalWidth = p.mode === 'individual' ? '100%' : `${p.columns.length * (p.mode === 'team' ? 230 : 190) + 56}px`;
  const todayColumn = p.columns.findIndex(c => isSameDay(c.date, now));
  const nowMinute = todayColumn >= 0 ? dayMinute(now, p.columns[todayColumn].date) : -1;
  const nowTop = range && nowMinute >= range.start && nowMinute < range.end ? (nowMinute - range.start) * ppm : null;
  const signature = p.columns.map(c => c.id).join(',');
  useEffect(() => {
    if (initialScroll.current === signature || !scroll.current || !range) return;
    initialScroll.current = signature;
    scroll.current.scrollTop = nowTop == null ? 0 : Math.max(0, nowTop - 160);
  }, [signature, range, nowTop]);
  if (!p.columns.length) return <div className="agenda-empty"><p>Nenhum profissional ativo</p></div>;
  if (!range) return <div className="agenda-empty"><CalendarEmpty /><h2>Sem expediente neste período</h2><p>Escolha outro dia para consultar a agenda.</p></div>;
  const slots = Array.from({ length: Math.ceil((range.end - range.start) / 30) + 1 }, (_, i) => range.start + i * 30);
  return <div ref={scroll} className="agenda-scroll" aria-label="Linha do tempo da agenda">
    <div className={cn('agenda-grid', p.mode === 'individual' && 'is-individual')} style={{ width: totalWidth, minWidth: '100%', '--agenda-column-count': p.columns.length } as React.CSSProperties}>
      {p.mode !== 'individual' && <div className="agenda-column-heads">
        <div className="agenda-head-gutter" />
        {p.columns.map(c => <div key={c.id} className={cn('agenda-column-head', isSameDay(c.date, now) && p.mode === 'week' && 'is-today')}>
          {p.mode === 'team' ? <><AgendaAvatar barber={c.barber} size="small" /><div className="min-w-0"><p className="truncate">{c.barber.name}</p><span>{c.hours?.is_open ? `${c.appointments.filter(a => a.status !== 'cancelled').length} clientes` : 'Sem expediente'}</span></div></> : <><span className="agenda-week-day">{format(c.date, 'EEE', { locale: ptBR })}</span><strong>{format(c.date, 'dd')}</strong></>}
        </div>)}
      </div>}
      <div className="agenda-grid-body" style={{ height: (range.end - range.start) * ppm + 20 }}>
        <div className="agenda-time-gutter">{slots.map(m => <span key={m} className={cn('agenda-time', m % 60 === 0 && 'is-hour')} style={{ top: (m - range.start) * ppm }}>{minuteLabel(m)}</span>)}</div>
        {p.columns.map(c => {
          const displayed = c.appointments.filter(a => appointmentMatches(a, p.filter));
          const lanes = appointmentLanes(displayed);
          const free = withEncaixe(c, freeIntervals(c, now), now);
          const interval = slotInterval(c);
          const targets = free.flatMap(gap => {
            const start = Math.ceil(gap.start / 15) * 15;
            const list: number[] = [];
            for (let m = start; m + 15 <= gap.end; m += interval) list.push(m);
            return list;
          });
          return <div key={c.id} className={cn('agenda-column', !c.hours?.is_open && 'is-closed')}>
            {slots.slice(0, -1).map(m => <div key={m} className={cn('agenda-rule', m % 60 === 0 && 'is-hour')} style={{ top: (m - range.start) * ppm }} />)}
            {targets.map(m => <Button key={m} variant="ghost" className="agenda-slot-target" style={{ top: (m - range.start) * ppm, height: Math.min(interval, free.find(g => m >= g.start && m < g.end)?.end ? (free.find(g => m >= g.start && m < g.end)?.end || m) - m : interval) * ppm }}
              disabled={!p.canEditBarber(c.barber.id)} aria-label={`Agendar ${c.barber.name} em ${format(c.date, 'dd/MM')} às ${minuteLabel(m)}`}
              onClick={() => { if (canPlaceSlot(c, m, now)) p.onSlot(minuteLabel(m), c.barber.id, c.date); }} />)}
            {free.map(gap => {
              const position = positionInterval(gap, range, ppm);
              if (position.height <= 0) return null;
              return <Popover key={gap.start}>
                <PopoverTrigger asChild><Button variant="ghost" className="agenda-free" style={{ top: position.top + 5, height: Math.min(48, position.height - 6) }} disabled={!p.canEditBarber(c.barber.id)} aria-label={`${gap.encaixe ? 'Encaixe' : 'Agendar'} ${c.barber.name} às ${minuteLabel(gap.start)}`}>
                  {p.mode === 'individual' ? <><span>{gap.encaixe ? 'Em andamento' : 'Disponível'}</span><span className="agenda-encaixe"><Plus />{gap.encaixe ? 'Encaixe' : 'Agendar'}</span></> : <Plus />}
                </Button></PopoverTrigger>
                <PopoverContent className="w-60 space-y-2"><p className="text-sm font-semibold">{minuteLabel(gap.start)} · {c.barber.name.split(' ')[0]}</p>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => p.onSlot(minuteLabel(gap.start), c.barber.id, c.date)}><Plus />{gap.encaixe ? 'Encaixe agora' : 'Novo agendamento'}</Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => p.onBlock(minuteLabel(gap.start), c.barber.id, c.date)}><Lock />Bloquear horário</Button>
                </PopoverContent>
              </Popover>;
            })}
            {c.blocks.map(b => { const position = positionInterval(b, range, ppm); if (!position.height) return null; return <div key={b.id} className="agenda-block" style={{ top: position.top + 3, height: Math.max(0, position.height - 6) }}>
              {b.kind === 'break' ? <Coffee /> : <Lock />}<div><p>{b.label}</p>{position.height >= 60 && <span>{minuteLabel(b.start)} – {minuteLabel(b.end)}</span>}</div>
            </div>; })}
            {displayed.map(a => { const lane = lanes.get(a.id); return <TimelineAppointment key={a.id} appointment={a} column={c} range={range} ppm={ppm} lane={lane?.lane || 0} count={lane?.count || 1} canEdit={p.canEditBarber(c.barber.id)} p={p} />; })}
            {p.mode === 'week' && isSameDay(c.date, now) && nowTop != null && <div className="agenda-now column-now" style={{ top: nowTop }}><span className="agenda-now-dot" /><span>{format(now, 'HH:mm')}</span></div>}
          </div>;
        })}
        {p.mode !== 'week' && nowTop != null && <div className="agenda-now" style={{ top: nowTop }}><span className="agenda-now-clock">{format(now, 'HH:mm')}</span><span className="agenda-now-dot" /></div>}
      </div>
    </div>
  </div>;
}
function CalendarEmpty() { return <Coffee className="mx-auto mb-3 h-8 w-8" />; }
