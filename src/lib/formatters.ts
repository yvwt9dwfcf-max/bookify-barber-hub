/**
 * Centralized formatters used across the app.
 * Avoids duplicating Intl.NumberFormat instances and keeps locale consistent.
 */

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const formatCurrency = (value: number | null | undefined): string =>
  BRL_FORMATTER.format(Number(value ?? 0));
