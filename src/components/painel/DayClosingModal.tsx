import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { awardLoyaltyPoints } from '@/lib/loyaltyUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Moon } from 'lucide-react';
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

interface DayClosingModalProps {
  open: boolean;
  onClose: () => void;
  pendingAppointments: PendingAppointment[];
  isPastDays: boolean;
  onCompleted: () => void;
}

const DayClosingModal = ({
  open,
  onClose,
  pendingAppointments,
  isPastDays,
  onCompleted,
}: DayClosingModalProps) => {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(pendingAppointments.map((a) => a.id))
  );
  const [completing, setCompleting] = useState(false);

  const allSelected = selected.size === pendingAppointments.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingAppointments.map((a) => a.id)));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
    if (selected.size === 0) {
      toast.error('Selecione ao menos um atendimento');
      return;
    }

    setCompleting(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .in('id', ids);

      if (error) throw error;

      // Award loyalty points for each completed appointment
      const selectedApts = pendingAppointments.filter(a => ids.includes(a.id));
      await Promise.allSettled(
        selectedApts.map(apt =>
          awardLoyaltyPoints({
            id: apt.id,
            customer_name: apt.customer_name,
            customer_phone: apt.customer_phone,
            barbershop_id: apt.barbershop_id,
          })
        )
      );

      toast.success(
        `${ids.length} ${ids.length === 1 ? 'atendimento concluído' : 'atendimentos concluídos'}!`
      );
      onCompleted();
    } catch (error) {
      console.error('Erro ao concluir atendimentos:', error);
      toast.error('Erro ao concluir atendimentos');
    } finally {
      setCompleting(false);
    }
  };

  if (!open) return null;

  const renderAppointmentItem = (a: PendingAppointment) => (
    <label
      key={a.id}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/60',
        'shadow-sm cursor-pointer transition-all duration-150',
        'hover:bg-accent/30 active:scale-[0.985]',
        selected.has(a.id) && 'ring-1 ring-primary/40 bg-primary/5'
      )}
    >
      <Checkbox
        checked={selected.has(a.id)}
        onCheckedChange={() => toggle(a.id)}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{a.customer_name}</p>
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
    </label>
  );

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
                  : 'Você ainda possui atendimentos não concluídos hoje.'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Select all */}
          <label className="flex items-center gap-3 px-1 cursor-pointer">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium">Selecionar todos</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {selected.size}/{pendingAppointments.length}
            </span>
          </label>

          {/* Appointments */}
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

        {/* Footer - sticky */}
        <div className="p-4 pt-3 border-t border-border/50 flex gap-3 bg-card rounded-b-2xl">
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
            disabled={completing || selected.size === 0}
          >
            {completing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Concluindo...
              </>
            ) : (
              `Concluir selecionados (${selected.size})`
            )}
          </Button>
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
