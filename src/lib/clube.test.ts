import { describe, it, expect } from 'vitest';
import { subscriptionStatus } from './clube';

const today = new Date('2026-11-04T12:00:00Z');

describe('subscriptionStatus', () => {
  it('ativo dentro da validade com usos restantes', () => {
    expect(subscriptionStatus({ expires_at: '2026-11-30', uses_count: 3 }, 4, today)).toBe('active');
  });
  it('esgotado quando usou o limite', () => {
    expect(subscriptionStatus({ expires_at: '2026-11-30', uses_count: 4 }, 4, today)).toBe('exhausted');
  });
  it('ilimitado nunca esgota', () => {
    expect(subscriptionStatus({ expires_at: '2026-11-30', uses_count: 99 }, null, today)).toBe('active');
  });
  it('vencido após a data de validade', () => {
    expect(subscriptionStatus({ expires_at: '2026-11-03', uses_count: 0 }, 4, today)).toBe('expired');
  });
});
