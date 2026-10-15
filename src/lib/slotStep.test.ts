import { describe, it, expect } from 'vitest';
import { gridMinutes, normalizeSlotStep } from './slotStep';
describe('grade de horários', () => {
  it('30 min: 09:00, 09:30, 10:00 (nunca :15/:45)', () => { expect(gridMinutes(540, 630, 30, 30)).toEqual([540, 570, 600]); });
  it('15 min libera :15 e :45', () => { expect(gridMinutes(540, 600, 15, 15)).toEqual([540, 555, 570, 585]); });
  it('valor inválido volta para 30 recomendado', () => { expect(normalizeSlotStep(20)).toBe(30); expect(normalizeSlotStep(null)).toBe(30); });
});
