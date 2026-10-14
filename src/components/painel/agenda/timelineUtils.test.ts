import { describe, expect, it } from 'vitest';
import type { Appointment, Barber, OpeningHours } from '@/lib/supabase';
import { agendaDates, allowedBarbers, appointmentLanes, appointmentMatches, canEditAgenda, canPlaceSlot, columnBlocks, dayMinute, freeIntervals, positionInterval, slotInterval, type TimelineColumn } from './timelineUtils';

const day = new Date(2026, 9, 14);
const at = (h: number, m = 0) => new Date(2026, 9, 14, h, m).toISOString();
const barber = { id: 'own', is_active: true } as Barber;
const other = { id: 'other', is_active: true } as Barber;
const hours = { is_open: true, start_time: '09:00', end_time: '18:00', break_start: '12:00', break_end: '13:00' } as OpeningHours;
const apt = (id: string, start: number, end: number, status: Appointment['status'] = 'confirmed') => ({ id, barber_id: 'own', start_time: at(start), end_time: at(end), status, origin: 'online' } as Appointment);
const column: TimelineColumn = { id: 'own-day', barber, date: day, hours, blocks: columnBlocks(day, 'own', hours, []), appointments: [apt('one', 10, 11)] };

describe('Agenda compartilhada', () => {
  it('ver a equipe não dá permissão para alterar seus atendimentos', () => {
    const readOnly = { ...barber, permissions: { can_view_others_schedule: true, can_edit_others_schedule: false, can_edit_own_schedule: false } } as Barber;
    expect(canEditAgenda('other', readOnly, false)).toBe(false);
    expect(canEditAgenda('own', readOnly, false)).toBe(false);
    expect(canEditAgenda('other', readOnly, true)).toBe(true);
  });
  it('restringe visualização à própria agenda quando não permitida', () => {
    expect(allowedBarbers([barber, other], barber, false).map(b => b.id)).toEqual(['own']);
    expect(allowedBarbers([barber, other], barber, true).map(b => b.id)).toEqual(['own', 'other']);
  });
  it('a semana tem sete dias e começa na segunda-feira', () => {
    const dates = agendaDates(day, 'week');
    expect(dates).toHaveLength(7); expect(dates[0].getDay()).toBe(1); expect(dates[6].getDay()).toBe(0);
  });
  it('duração de 60 minutos ocupa o dobro de 30 minutos', () => {
    expect(positionInterval({ start: 540, end: 600 }, { start: 540, end: 1080 }, 2).height).toBe(120);
    expect(positionInterval({ start: 540, end: 570 }, { start: 540, end: 1080 }, 2).height).toBe(60);
  });
  it('vagas excluem atendimento e intervalo de almoço', () => {
    expect(freeIntervals(column, new Date(2026, 9, 14, 8))).toEqual([{ start: 540, end: 600 }, { start: 660, end: 720 }, { start: 780, end: 1080 }]);
    expect(canPlaceSlot(column, 600, new Date(2026, 9, 14, 8))).toBe(false);
    expect(canPlaceSlot(column, 720, new Date(2026, 9, 14, 8))).toBe(false);
  });
  it('vagas passadas não podem ser selecionadas e seguem grade de 15 minutos', () => {
    expect(freeIntervals(column, new Date(2026, 9, 14, 9, 7))[0]).toEqual({ start: 555, end: 600 });
    expect(freeIntervals(column, new Date(2026, 9, 15, 8))).toEqual([]);
  });
  it('cancelamento libera espaço sem filtros alterarem a ocupação', () => {
    const cancelled = apt('cancel', 10, 11, 'cancelled');
    expect(canPlaceSlot({ ...column, appointments: [cancelled] }, 600, new Date(2026, 9, 14, 8))).toBe(true);
    expect(appointmentMatches(column.appointments[0], 'completed')).toBe(false);
    expect(canPlaceSlot(column, 600, new Date(2026, 9, 14, 8))).toBe(false);
  });
  it('agendamento de 15 minutos ativa grade de 15 minutos', () => {
    expect(slotInterval({ ...column, appointments: [{ ...apt('short', 9, 10), end_time: at(9, 15) }] })).toBe(15);
    expect(slotInterval(column)).toBe(30);
  });
  it('sobreposições usam colunas diferentes', () => {
    const lanes = appointmentLanes([apt('a', 9, 11), apt('b', 10, 12), apt('c', 12, 13)]);
    expect(lanes.get('a')).toEqual({ lane: 0, count: 2 }); expect(lanes.get('b')).toEqual({ lane: 1, count: 2 }); expect(lanes.get('c')).toEqual({ lane: 0, count: 1 });
  });
  it('bloqueio cruzando meia-noite é limitado ao dia visível', () => {
    const blocks = columnBlocks(day, 'own', undefined, [{ id: 'block', barber_id: 'own', start_time: new Date(2026, 9, 13, 22).toISOString(), end_time: at(10), reason: null } as never]);
    expect(blocks[0].start).toBe(0); expect(blocks[0].end).toBe(600);
  });
  it('posicionamento usa o horário local de relógio', () => { expect(dayMinute(at(9, 15), day)).toBe(555); });
});