import { describe, it, expect } from 'vitest';
import { gridMinutes, normalizeSlotStep } from './slotStep';
describe('grade de horários', () => {
  it('30 min: 09:00, 09:30, 10:00 (nunca :15/:45)', () => { expect(gridMinutes(540, 630, 30, 30)).toEqual([540, 570, 600]); });
  it('15 min libera :15 e :45', () => { expect(gridMinutes(540, 600, 15, 15)).toEqual([540, 555, 570, 585]); });
  it('valor inválido volta para 30 recomendado', () => { expect(normalizeSlotStep(20)).toBe(30); expect(normalizeSlotStep(null)).toBe(30); });
});

import { buildDaySlots as _b } from './slotStep';
describe('buildDaySlots', () => {
  it('respeita expediente e intervalo de 30', () => {
    expect(_b('09:00', '11:00', 30)).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });
  it('mantém horário antigo fora da grade', () => {
    expect(_b('09:00', '10:00', 30, '09:15')).toEqual(['09:00', '09:15', '09:30']);
  });
  it('fechamento 00:00 vai até o fim do dia', () => {
    expect(_b('22:00', '00:00', 60)).toEqual(['22:00', '23:00']);
  });
});
