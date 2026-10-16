export type OperationMode = 'individual' | 'reception';

export const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number]['value'];

export const getOperationMode = (shop?: { operation_mode?: string | null } | null): OperationMode =>
  shop?.operation_mode === 'reception' ? 'reception' : 'individual';

/** With central reception, only the owner/reception closes comandas; barbers stay focused on the chair. */
export const canCloseComanda = (mode: OperationMode, isMaster: boolean) => isMaster || mode === 'individual';

interface CheckoutCandidate { status: string; start_time: string; end_time: string }

/** Pending at the counter: confirmed and already started (in progress or overdue), not yet closed. */
export const checkoutState = (apt: CheckoutCandidate, now: Date): 'overdue' | 'in_progress' | 'upcoming' | 'done' => {
  if (apt.status !== 'confirmed') return 'done';
  if (new Date(apt.end_time) <= now) return 'overdue';
  if (new Date(apt.start_time) <= now) return 'in_progress';
  return 'upcoming';
};
