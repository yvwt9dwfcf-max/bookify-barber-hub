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
