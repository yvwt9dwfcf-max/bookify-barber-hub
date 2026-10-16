import { describe, expect, it } from 'vitest';
import { canCloseComanda, checkoutState, getOperationMode } from './operationMode';

const now = new Date('2026-10-16T13:00:00Z');
const apt = (start: string, end: string, status = 'confirmed') => ({ status, start_time: start, end_time: end });

describe('operation mode', () => {
  it('defaults to individual cashier', () => {
    expect(getOperationMode(null)).toBe('individual');
    expect(getOperationMode({ operation_mode: 'reception' })).toBe('reception');
  });
  it('barbers cannot close comandas when the shop has a reception', () => {
    expect(canCloseComanda('reception', false)).toBe(false);
    expect(canCloseComanda('reception', true)).toBe(true);
    expect(canCloseComanda('individual', false)).toBe(true);
  });
  it('flags finished but unclosed appointments as overdue', () => {
    expect(checkoutState(apt('2026-10-16T12:00:00Z', '2026-10-16T12:30:00Z'), now)).toBe('overdue');
    expect(checkoutState(apt('2026-10-16T12:45:00Z', '2026-10-16T13:15:00Z'), now)).toBe('in_progress');
    expect(checkoutState(apt('2026-10-16T14:00:00Z', '2026-10-16T14:30:00Z'), now)).toBe('upcoming');
    expect(checkoutState(apt('2026-10-16T12:00:00Z', '2026-10-16T12:30:00Z', 'completed'), now)).toBe('done');
  });
});
