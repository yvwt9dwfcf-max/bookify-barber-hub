export type SubscriptionStatus = 'active' | 'expired' | 'exhausted';

/** Status do assinante: vencido tem prioridade sobre esgotado. usesLimit null = ilimitado. */
export function subscriptionStatus(
  sub: { expires_at: string; uses_count: number },
  usesLimit: number | null,
  today = new Date(),
): SubscriptionStatus {
  const todayStr = today.toISOString().slice(0, 10);
  if (sub.expires_at < todayStr) return 'expired';
  if (usesLimit != null && sub.uses_count >= usesLimit) return 'exhausted';
  return 'active';
}
