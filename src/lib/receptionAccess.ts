export type ReceptionFinance = 'none' | 'day' | 'full';

export const RECEPTION_FINANCE_OPTIONS: { value: ReceptionFinance; label: string; hint: string }[] = [
  { value: 'none', label: 'Sem financeiro', hint: 'Fecha comandas, mas não vê valores do caixa' },
  { value: 'day', label: 'Só o caixa do dia', hint: 'Vê entradas do dia e formas de pagamento' },
  { value: 'full', label: 'Financeiro completo', hint: 'Vê relatórios, despesas e metas' },
];

export const getReceptionFinance = (shop?: { reception_finance?: string | null } | null): ReceptionFinance =>
  shop?.reception_finance === 'none' || shop?.reception_finance === 'full' ? shop.reception_finance : 'day';

/** Routes a receptionist may open; everything else (team, plan, public profile, settings) stays with the owner. */
export const receptionRoutes = (finance: ReceptionFinance) => {
  const base = ['/painel', '/painel/recepcao', '/painel/clientes', '/painel/clube', '/painel/produtos', '/painel/bloqueios'];
  if (finance === 'day') base.push('/painel/caixa');
  if (finance === 'full') base.push('/painel/caixa', '/painel/financeiro');
  return base;
};

export const canReceptionOpen = (path: string, finance: ReceptionFinance) =>
  receptionRoutes(finance).includes(path.replace(/\/$/, '') || '/painel');
