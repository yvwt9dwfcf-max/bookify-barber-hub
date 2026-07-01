import { Barbershop } from '@/lib/supabase';

interface AgendaEmptyStateProps {
  isToday: boolean;
  barbershop: Barbershop | null;
  onDismiss: () => void;
}

const AgendaEmptyState = (_props: AgendaEmptyStateProps) => {
  return null;
};

export default AgendaEmptyState;
