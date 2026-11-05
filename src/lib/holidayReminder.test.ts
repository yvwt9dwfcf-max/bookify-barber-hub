import { describe, it, expect } from 'vitest';
import { nextHolidayToRemind } from './holidayReminder';

const now = new Date(2026, 10, 10, 9); // 10/11
const name = (d: Date) => (d.getMonth() === 10 && d.getDate() === 15 ? 'Proclamação' : null);

describe('holiday reminder', () => {
  it('shows a holiday 5 days ahead', () => {
    expect(nextHolidayToRemind(now, {}, name)?.date).toBe('2026-11-15');
  });
  it('does not show holidays more than 5 days ahead', () => {
    expect(nextHolidayToRemind(new Date(2026, 10, 9, 9), {}, name)).toBeNull();
  });
  it('"Não" and "Sim" hide it for good', () => {
    expect(nextHolidayToRemind(now, { '2026-11-15': 'open' }, name)).toBeNull();
    expect(nextHolidayToRemind(now, { '2026-11-15': 'closed' }, name)).toBeNull();
  });
  it('"Lembrar depois" comes back the next day', () => {
    const c = { '2026-11-15': 'later:2026-11-11' as const };
    expect(nextHolidayToRemind(now, c, name)).toBeNull();
    expect(nextHolidayToRemind(new Date(2026, 10, 11, 9), c, name)?.date).toBe('2026-11-15');
  });
});
