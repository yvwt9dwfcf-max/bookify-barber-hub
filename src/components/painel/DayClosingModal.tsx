import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { awardLoyaltyPoints } from '@/lib/loyaltyUtils';
import { Button } from '@/components/ui/button';
import { Loader2, Moon, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface PendingAppointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  barbershop_id: string | null;
  start_time: string;
  service?: { name: string } | null;
}

interface GroupedAppointments {
  date: string;
  label: string;
  appointments: PendingAppointment[];
}

type AppointmentAction = 'completed' | 'no_show' | null;

interface DayClosingModalProps {
  open: boolean;
  onClose: () => void;
  pendingAppointments: PendingAppointment[];
  isPastDays: boolean;
  onCompleted: () => void;
}

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
];

const DayClosingModal = ({
  open,
  onClose,
  pendingAppointments,
  isPastDays,
  onCompleted,
}: DayClosingModalProps) => {
  // Track action per appointment: 'completed', 'no_show', or null (undecided)
  const [actions, setActions] = useState<Record<string, AppointmentAction>>(() => {
    const initial: Record<string, AppointmentAction> = {};
    pendingAppointments.forEach(a => { initial[a.id] = 'completed'; });
    return initial;
  });
  const [payments, setPayments] = useState<Record<string, string>>({});
  const [completing, setCompleting] = useState(false);

  const completedCount = Object.values(actions).filter(a => a === 'completed').length;
  const noShowCount = Object.values(actions).filter(a => a === 'no_show').length;
  const hasActions = completedCount > 0 || noShowCount > 0;

  const setAction = (id: string, action: AppointmentAction) => {
    setActions(prev => ({
      ...prev,
      [id]: prev[id] === action ? null : action,
    }));
  };

  const markAllCompleted = () => {
    const allCompleted = Object.values(actions).every(a => a === 'completed');
    const updated: Record<string, AppointmentAction> = {};
    pendingAppointments.forEach(a => {
      updated[a.id] = allCompleted ? null : 'completed';
    });
    setActions(updated);
  };

  // Group by date for past days view
  const grouped: GroupedAppointments[] = useMemo(() => {
    const groups: Record<string, PendingAppointment[]> = {};
    for (const a of pendingAppointments) {
      const dateKey = format(new Date(a.start_time), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(a);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, appointments]) => ({
        date: dateKey,
        label: format(new Date(dateKey + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR }),
        appointments: appointments.sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ),
      }));
  }, [pendingAppointments]);

  const handleComplete = async () => {
    if (!hasActions) {
      toast.error('Marque ao menos um atendimento');
      return;
    }

    setCompleting(true);
    try {
      const completedIds = Object.entries(actions)
        .filter(([, a]) => a === 'completed')
        .map(([id]) => id);
      const noShowIds = Object.entries(actions)
        .filter(([, a]) => a === 'no_show')
        .map(([id]) => id);

      // Update completed (one by one to apply payment_method)
      if (completedIds.length > 0) {
        await Promise.all(
          completedIds.map(id =>
            supabase
              .from('appointments')
              .update({
                status: 'completed',
                payment_method: payments[id] || null,
                paid_at: payments[id] ? new Date().toISOString() : null,
              })
              .eq('id', id)
          )
        );

        // Award loyalty points for completed appointments
        const completedApts = pendingAppointments.filter(a => completedIds.includes(a.id));
        await Promise.allSettled(
          completedApts.map(apt =>
            awardLoyaltyPoints({
              id: apt.id,
              customer_name: apt.customer_name,
              customer_phone: apt.customer_phone,
              barbershop_id: apt.barbershop_id,
            })
          )
        );
      }

      // Update no-shows as cancelled
      if (noShowIds.length > 0) {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .in('id', noShowIds);
        if (error) throw error;
      }

      const parts: string[] = [];
      if (completedIds.length > 0) parts.push(`${completedIds.length} concluído${completedIds.length > 1 ? 's' : ''}`);
      if (noShowIds.length > 0) parts.push(`${noShowIds.length} falta${noShowIds.length > 1 ? 's' : ''}`);
      toast.success(parts.join(' • '));

      onCompleted();
    } catch (error) {
      console.error('Erro ao processar atendimentos:', error);
      toast.error('Erro ao processar atendimentos');
    } finally {
      setCompleting(false);
    }
  };

  if (!open) return null;

  const renderAppointmentItem = (a: PendingAppointment) => {
    const action = actions[a.id];
    return (
      <div
        key={a.id}
        className={cn(
          'p-3 rounded-xl border border-border/50 bg-card/60',
          'shadow-sm transition-all duration-150',
          action === 'completed' && 'ring-1 ring-primary/40 bg-primary/5',
          action === 'no_show' && 'ring-1 ring-destructive/40 bg-destructive/5 opacity-75'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              action === 'no_show' && 'line-through text-muted-foreground'
            )}>
              {a.customer_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {format(new Date(a.start_time), 'HH:mm')}
              </span>
              {a.service?.name && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xs text-primary font-medium truncate">
                    {a.service.name}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAction(a.id, 'completed')}
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                action === 'completed'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary'
              )}
              title="Compareceu"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAction(a.id, 'no_show')}
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                action === 'no_show'
                  ? 'bg-destructive text-destructive-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              )}
              title="Faltou"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {action === 'completed' && (
          <div className="flex flex-wrap gap-1 mt-2 pl-1">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPayments(p => ({ ...p, [a.id]: p[a.id] === m.value ? '' : m.value }))}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all',
                  payments[a.id] === m.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        style={{ animationDuration: '150ms' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'fixed z-50 inset-x-4 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-full sm:max-w-md',
          'bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl',
          'flex flex-col max-h-[90vh]'
        )}
        style={{
          animation: 'day-closing-slide-up 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Moon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isPastDays ? 'Você possui dias pendentes' : 'Fechar o dia?'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPastDays
                  ? 'Existem atendimentos de dias anteriores que não foram concluídos.'
                  : 'Marque quem compareceu e quem faltou.'}
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 px-1">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Compareceu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
                <X className="h-3 w-3 text-destructive-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Faltou</span>
            </div>
            <button
              type="button"
              onClick={markAllCompleted}
              className="text-xs text-primary font-medium ml-auto hover:underline"
            >
              {Object.values(actions).every(a => a === 'completed') ? 'Desmarcar todos' : 'Todos compareceram'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isPastDays ? (
            grouped.map((group) => (
              <div key={group.date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.appointments.map(renderAppointmentItem)}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-2">
              {pendingAppointments
                .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                .map(renderAppointmentItem)}
            </div>
          )}
        </div>

        {/* Footer with summary */}
        <div className="p-4 pt-3 border-t border-border/50 bg-card rounded-b-2xl">
          {(completedCount > 0 || noShowCount > 0) && (
            <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground px-1">
              {completedCount > 0 && (
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-primary" />
                  {completedCount} compareceu{completedCount > 1 ? 'ram' : ''}
                </span>
              )}
              {noShowCount > 0 && (
                <span className="flex items-center gap-1">
                  <X className="h-3 w-3 text-destructive" />
                  {noShowCount} falta{noShowCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={onClose}
            >
              Depois
            </Button>
            <Button
              className="flex-1 active:scale-[0.98]"
              onClick={handleComplete}
              disabled={completing || !hasActions}
            >
              {completing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes day-closing-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (min-width: 640px) {
          @keyframes day-closing-slide-up {
            from {
              opacity: 0;
              transform: translate(-50%, calc(-50% + 20px));
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%);
            }
          }
        }
      `}</style>
    </>
  );
};

export default DayClosingModal;
