import { describe, it, expect } from 'vitest';
import { paymentFee, reminderLabel, whatsappReminderUrl } from './operationMode';

const fees = { debit_pct: 1.5, credit_pct: 3, pix_pct: 0 };
describe('reception helpers', () => {
  it('charges credit fee', () => expect(paymentFee('credito', 100, fees)).toBe(3));
  it('cash has no fee', () => expect(paymentFee('dinheiro', 100, fees)).toBe(0));
  it('countdown', () => {
    const now = new Date('2026-01-01T12:00:00');
    expect(reminderLabel('2026-01-01T12:30:00', now)).toBe('Faltam 30 min');
    expect(reminderLabel('2026-01-01T14:15:00', now)).toBe('Faltam 2h15');
    expect(reminderLabel('2026-01-01T11:00:00', now)).toBe('Na hora');
  });
  it('whatsapp adds country code', () => expect(whatsappReminderUrl('(11) 99999-9999', 'Davi Lima', '14:00', 'X')).toContain('wa.me/5511999999999'));
});
