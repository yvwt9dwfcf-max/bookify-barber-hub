import { supabase } from '@/lib/supabase';

/** Allowed grid steps for the shop's schedule. 30 is the recommended default. */
export const SLOT_STEPS = [15, 30, 45, 60] as const;
export const DEFAULT_SLOT_STEP = 30;

export function normalizeSlotStep(value: unknown): number {
  const n = Number(value);
  return (SLOT_STEPS as readonly number[]).includes(n) ? n : DEFAULT_SLOT_STEP;
}

/** Fixed grid marks from the opening time: start, start+step, ... while the service still fits. */
export function gridMinutes(start: number, end: number, step: number, duration: number): number[] {
  const list: number[] = [];
  for (let m = start; m + duration <= end; m += step) list.push(m);
  return list;
}

export async function fetchSlotStep(barbershopId?: string | null): Promise<number> {
  if (!barbershopId) return DEFAULT_SLOT_STEP;
  const { data } = await supabase.from('barbershops').select('slot_interval_minutes').eq('id', barbershopId).maybeSingle();
  return normalizeSlotStep((data as { slot_interval_minutes?: number } | null)?.slot_interval_minutes);
}

/** Closing at 00:00 (or before opening) means end of day, not start. Capped at 24:00 (same calendar day). */
export function closingMinutes(start: number, end: number): number {
  return end <= start ? 1440 : end;
}

const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Panel time options: shop grid inside working hours, plus a kept time (e.g. old :15 booking) if off-grid. */
export function buildDaySlots(startTime: string | undefined, endTime: string | undefined, step: number, keep?: string): string[] {
  const set = new Set<string>();
  if (startTime && endTime) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = closingMinutes(start, eh * 60 + em);
    for (let m = start; m < end && m < 1440; m += step) set.add(fmt(m));
  }
  if (keep && /^\d{2}:\d{2}$/.test(keep)) set.add(keep);
  return [...set].sort();
}
