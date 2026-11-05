import { useUserRole } from './useUserRole';
import { getVocab } from '@/lib/segments';

export function useVocab() {
  const { barbershop } = useUserRole();
  return getVocab((barbershop as { business_segment?: string } | null)?.business_segment);
}
