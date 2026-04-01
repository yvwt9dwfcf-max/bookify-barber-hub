import { Barber, Barbershop } from '@/lib/supabase';

export interface AgendaContextType {
  barber: (Barber & { permissions?: { can_view_others_schedule?: boolean; can_edit_others_schedule?: boolean } }) | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

export type ViewMode = 'daily' | 'monthly';

export const getStatusConfig = (status: string) => {
  switch (status) {
    case 'confirmed':
      return {
        borderColor: 'border-l-primary/70',
        bg: 'bg-card/90',
        dot: 'bg-primary',
        label: 'Confirmado',
        labelColor: 'text-primary',
        avatarBg: 'bg-primary/15',
        avatarText: 'text-primary',
      };
    case 'completed':
      return {
        borderColor: 'border-l-success/70',
        bg: 'bg-card/90',
        dot: 'bg-success',
        label: 'Concluído',
        labelColor: 'text-success',
        avatarBg: 'bg-success/15',
        avatarText: 'text-success',
      };
    case 'cancelled':
      return {
        borderColor: 'border-l-destructive/50',
        bg: 'bg-card/60',
        dot: 'bg-destructive',
        label: 'Cancelado',
        labelColor: 'text-destructive',
        avatarBg: 'bg-muted/30',
        avatarText: 'text-muted-foreground',
      };
    default:
      return {
        borderColor: 'border-l-amber-500/60',
        bg: 'bg-card/90',
        dot: 'bg-amber-500',
        label: 'Pendente',
        labelColor: 'text-amber-500',
        avatarBg: 'bg-amber-500/15',
        avatarText: 'text-amber-500',
      };
  }
};

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export const toLocalDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const getTodayLocalDate = () => toLocalDate(new Date());

export const shiftMonthToStart = (date: Date, monthOffset: number) => {
  const targetMonth = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
  return new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
};
