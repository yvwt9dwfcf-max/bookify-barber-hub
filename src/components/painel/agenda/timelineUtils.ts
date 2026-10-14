import { addDays, differenceInCalendarDays, startOfDay, startOfWeek } from 'date-fns';
import type { Appointment, Barber, BlockedSlot, OpeningHours } from '@/lib/supabase';

export type AgendaMode = 'individual' | 'team' | 'week';
export type AgendaPalette = 'original' | 'ocean' | 'warm';
export type AgendaDensity = 'comfortable' | 'compact';
export type AgendaFilter = 'active' | 'all' | 'confirmed' | 'completed' | 'cancelled' | 'online' | 'manual';
export interface AgendaPreferences { palette: AgendaPalette; density: AgendaDensity; }
export const DEFAULT_AGENDA_PREFERENCES: AgendaPreferences = { palette: 'original', density: 'comfortable' };
export const currency = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
export const minuteLabel = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export const timeMinute = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
export const dayMinute = (value: string | Date, day: Date) => {
  const date = new Date(value);
  return differenceInCalendarDays(date, day) * 1440 + date.getHours() * 60 + date.getMinutes();
};
export const dateAtMinute = (day: Date, minute: number) => { const value = startOfDay(day); value.setMinutes(minute); return value; };
export const overlaps = (a: Interval, b: Interval) => a.start < b.end && a.end > b.start;
export interface Interval { start: number; end: number; }
export interface TimelineBlock extends Interval { id: string; label: string; kind: 'break' | 'blocked'; }
export interface TimelineColumn {
  id: string;
  date: Date;
  barber: Barber;
  hours?: OpeningHours;
  appointments: Appointment[];
  blocks: TimelineBlock[];
}
export function allowedBarbers(barbers: Barber[], current: Barber | null, canViewOthers: boolean): Barber[] {
  const active = barbers.filter(b => b.is_active);
  if (!canViewOthers) return current?.is_active ? [current] : [];
  return active.some(b => b.id === current?.id) || !current?.is_active ? active : [current, ...active];
}
export function canEditAgenda(barberId: string, current: Barber | null, isMaster: boolean) {
  if (isMaster) return true;
  if (!current) return false;
  return barberId === current.id ? current.permissions?.can_edit_own_schedule !== false : current.permissions?.can_edit_others_schedule === true;
}
export function agendaDates(date: Date, mode: AgendaMode): Date[] {
  const first = mode === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : startOfDay(date);
  return Array.from({ length: mode === 'week' ? 7 : 1 }, (_, i) => addDays(first, i));
}
export function appointmentMatches(appointment: Appointment, filter: AgendaFilter) {
  if (filter === 'all') return true;
  if (filter === 'active') return appointment.status !== 'cancelled';
  if (filter === 'online' || filter === 'manual') return appointment.origin === filter && appointment.status !== 'cancelled';
  return appointment.status === filter;
}
export function columnBlocks(date: Date, barberId: string, hours: OpeningHours | undefined, blocked: BlockedSlot[]): TimelineBlock[] {
  const result: TimelineBlock[] = blocked.filter(b => b.barber_id === barberId)
    .map(b => ({ id: b.id, start: Math.max(0, dayMinute(b.start_time, date)), end: Math.min(1440, dayMinute(b.end_time, date)), label: b.reason || 'Bloqueado', kind: 'blocked' as const }))
    .filter(b => b.start < b.end);
  if (hours?.is_open && hours.break_start && hours.break_end) result.push({ id: `break-${barberId}`, start: timeMinute(hours.break_start), end: timeMinute(hours.break_end), label: 'Intervalo', kind: 'break' });
  return result;
}
export function timelineRange(columns: TimelineColumn[]): Interval | null {
  const intervals = columns.flatMap(c => [
    ...(c.hours?.is_open ? [{ start: timeMinute(c.hours.start_time), end: timeMinute(c.hours.end_time) }] : []),
    ...c.appointments.map(a => ({ start: Math.max(0, dayMinute(a.start_time, c.date)), end: Math.min(1440, dayMinute(a.end_time, c.date)) })),
  ]).filter(i => i.end > i.start);
  if (!intervals.length) return null;
  return { start: Math.floor(Math.min(...intervals.map(i => i.start)) / 30) * 30, end: Math.ceil(Math.max(...intervals.map(i => i.end)) / 30) * 30 };
}
export function positionInterval(interval: Interval, range: Interval, pixelsPerMinute: number) {
  const start = Math.max(interval.start, range.start);
  const end = Math.min(interval.end, range.end);
  return { top: (start - range.start) * pixelsPerMinute, height: Math.max(0, (end - start) * pixelsPerMinute) };
}
export function freeIntervals(column: TimelineColumn, now: Date): Interval[] {
  if (!column.hours?.is_open) return [];
  const start = Math.max(timeMinute(column.hours.start_time), Math.ceil(dayMinute(now, column.date) / 15) * 15);
  const end = timeMinute(column.hours.end_time);
  if (start >= end) return [];
  const occupied: Interval[] = [
    ...column.blocks,
    ...column.appointments.filter(a => a.status !== 'cancelled').map(a => ({ start: dayMinute(a.start_time, column.date), end: dayMinute(a.end_time, column.date) })),
  ].filter(i => i.end > start && i.start < end).sort((a, b) => a.start - b.start);
  const result: Interval[] = [];
  let cursor = start;
  for (const item of occupied) {
    if (item.start > cursor) result.push({ start: cursor, end: Math.min(item.start, end) });
    cursor = Math.max(cursor, item.end);
  }
  if (cursor < end) result.push({ start: cursor, end });
  return result.filter(i => i.end - i.start >= 15);
}
export function canPlaceSlot(column: TimelineColumn, minute: number, now: Date, duration = 15) {
  return freeIntervals(column, now).some(i => minute >= i.start && minute + duration <= i.end);
}
export function slotInterval(column: TimelineColumn): number {
  return column.appointments.some(a => {
    const start = new Date(a.start_time), end = new Date(a.end_time);
    return start.getMinutes() % 30 !== 0 || end.getMinutes() % 30 !== 0 || (end.getTime() - start.getTime()) / 60000 < 30;
  }) ? 15 : 30;
}
export function appointmentLanes(appointments: Appointment[]) {
  const sorted = [...appointments].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const result = new Map<string, { lane: number; count: number }>();
  let group: Appointment[] = [], groupEnd = 0;
  const flush = () => {
    const ends: number[] = [];
    for (const a of group) {
      const start = new Date(a.start_time).getTime();
      let lane = ends.findIndex(end => end <= start);
      if (lane < 0) lane = ends.length;
      ends[lane] = new Date(a.end_time).getTime();
      result.set(a.id, { lane, count: 1 });
    }
    for (const a of group) { const pos = result.get(a.id); if (pos) pos.count = ends.length; }
  };
  for (const a of sorted) {
    const start = new Date(a.start_time).getTime();
    if (group.length && start >= groupEnd) { flush(); group = []; groupEnd = 0; }
    group.push(a); groupEnd = Math.max(groupEnd, new Date(a.end_time).getTime());
  }
  flush();
  return result;
}
