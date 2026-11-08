import { describe, it, expect } from 'vitest';
import { publicBookingPath } from './segments';

describe('publicBookingPath', () => {
  it('mantém /barbearia para barbearias', () => {
    expect(publicBookingPath('barbershop', 'joao')).toBe('/barbearia/joao');
  });
  it('usa /p para outros segmentos', () => {
    expect(publicBookingPath('nails', 'ana')).toBe('/p/ana');
    expect(publicBookingPath('automotive', 'brilho')).toBe('/p/brilho');
  });
  it('usa /p quando o segmento não foi definido', () => {
    expect(publicBookingPath(null, 'loja')).toBe('/p/loja');
  });
});
