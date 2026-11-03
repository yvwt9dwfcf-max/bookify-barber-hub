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

export interface PaymentFees { debit_pct: number; credit_pct: number; pix_pct: number }

/** Card-machine / Pix fee charged on a payment; cash has no fee. */
export const paymentFee = (method: PaymentMethod | null, amount: number, fees?: PaymentFees | null) => {
  if (!method || !fees) return 0;
  const pct = method === 'debito' ? fees.debit_pct : method === 'credito' ? fees.credit_pct : method === 'pix' ? fees.pix_pct : 0;
  return Math.round(amount * Number(pct || 0)) / 100;
};

/** Human countdown for the reception reminders list. */
export const reminderLabel = (start: string, now: Date) => {
  const mins = Math.round((new Date(start).getTime() - now.getTime()) / 60000);
  if (mins <= 0) return 'Na hora';
  if (mins < 60) return `Faltam ${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `Faltam ${h}h${String(m).padStart(2, '0')}` : `Faltam ${h}h`;
};

export const whatsappReminderUrl = (phone: string, name: string, time: string, shop: string) => {
  const digits = phone.replace(/\D/g, '');
  const full = digits.startsWith('55') ? digits : `55${digits}`;
  const msg = `Olá ${name.split(' ')[0]}! Passando para lembrar do seu horário hoje às ${time} na ${shop}. Tudo certo por aí? Te esperamos!`;
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
};
