import { describe, it, expect } from 'vitest';
import { canReceptionOpen, getReceptionFinance } from './receptionAccess';
import { canCloseComanda } from './operationMode';

describe('acesso da recepcionista', () => {
  it('nunca abre equipe, assinatura ou configurações', () => {
    for (const p of ['/painel/barbeiros', '/painel/assinatura', '/painel/configuracoes', '/painel/excluir-conta'])
      expect(canReceptionOpen(p, 'full')).toBe(false);
  });
  it('abre agenda, recepção, clientes, clube e produtos', () => {
    for (const p of ['/painel', '/painel/recepcao', '/painel/clientes', '/painel/clube', '/painel/produtos'])
      expect(canReceptionOpen(p, 'none')).toBe(true);
  });
  it('financeiro segue a escolha do dono', () => {
    expect(canReceptionOpen('/painel/caixa', 'none')).toBe(false);
    expect(canReceptionOpen('/painel/caixa', 'day')).toBe(true);
    expect(canReceptionOpen('/painel/financeiro', 'day')).toBe(false);
    expect(canReceptionOpen('/painel/financeiro', 'full')).toBe(true);
  });
  it('padrão é só o caixa do dia', () => {
    expect(getReceptionFinance({})).toBe('day');
  });
  it('com recepção, profissional não fecha comanda; recepcionista fecha', () => {
    expect(canCloseComanda('reception', false)).toBe(false);
    expect(canCloseComanda('reception', true)).toBe(true);
    expect(canCloseComanda('individual', false)).toBe(true);
  });
});
