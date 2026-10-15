import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserRound as User, Phone, Timer as Clock, Sparkles as Scissors, CalendarDays as Calendar, PenLine as Pencil, Check, Trash2, Loader2, MessageCircle, MousePointerClick } from 'lucide-react';
import { Appointment } from '@/lib/supabase';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface AppointmentDetailsSheetProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (appointment: Appointment) => void;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenComanda?: (appointment: Appointment) => void;
  canEdit?: boolean;
}

const AppointmentDetailsSheet = ({
  appointment,
  open,
  onOpenChange,
  onEdit,
  onComplete,
  onDelete,
  onOpenComanda,
  canEdit = true,
}: AppointmentDetailsSheetProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [loading, setLoading] = useState<'complete' | 'delete' | null>(null);

  if (!appointment) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary/10 text-primary';
      case 'completed':
        return 'bg-success/10 text-success';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const handleComplete = async () => {
    setLoading('complete');
    try {
      await onComplete(appointment.id);
      setShowCompleteConfirm(false);
      onOpenChange(false);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading('delete');
    try {
      await onDelete(appointment.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } finally {
      setLoading(null);
    }
  };

  const handleEdit = () => {
    onEdit(appointment);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] flex flex-col p-0">
          <SheetHeader className="text-left px-5 pt-5 pr-12 pb-3 flex-shrink-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide', getStatusColor(appointment.status))}>
                {getStatusLabel(appointment.status)}
              </span>
              {appointment.origin && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border border-border text-muted-foreground">
                  {appointment.origin === 'online' ? 'Online' : 'Manual'}
                </span>
              )}
            </div>
            <SheetTitle className="text-2xl font-semibold leading-tight truncate">
              {appointment.customer_name}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground capitalize">
              {format(new Date(appointment.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })}
              {' · '}
              {format(new Date(appointment.start_time), 'HH:mm')}–{format(new Date(appointment.end_time), 'HH:mm')}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 pb-3">
            <div className="space-y-3">
              <div className="rounded-2xl bg-muted/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Serviço</p>
                    <p className="font-semibold text-base truncate">
                      {appointment.service?.name || 'Serviço não especificado'}
                    </p>
                    {appointment.service && (
                      <p className="text-sm text-muted-foreground">{appointment.service.duration_minutes} min</p>
                    )}
                  </div>
                  {appointment.service && (
                    <p className="text-lg font-semibold whitespace-nowrap">
                      {Number(appointment.service.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-muted/50 divide-y divide-border/60">
                {appointment.barber && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-muted-foreground">Profissional</span>
                    <span className="font-medium truncate">{appointment.barber.name}</span>
                  </div>
                )}
                {appointment.customer_phone && (
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <span className="block text-sm text-muted-foreground">Telefone</span>
                      <span className="font-medium truncate">{appointment.customer_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={`tel:+55${appointment.customer_phone.replace(/\D/g, '')}`}
                        className="h-10 px-3 rounded-full border border-border text-sm font-medium flex items-center"
                      >
                        Ligar
                      </a>
                      <a
                        href={`https://wa.me/55${appointment.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 px-3 rounded-full bg-success/15 text-success text-sm font-semibold flex items-center"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {appointment.notes && (
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{appointment.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Ações fixas no rodapé */}
          {canEdit && <div className="flex-shrink-0 border-t bg-background p-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-11"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4" />
              Editar agendamento
            </Button>

            {appointment.status === 'confirmed' && (
              <Button
                className="w-full justify-start gap-2 h-11 btn-primary-gradient"
                onClick={() => {
                  if (onOpenComanda) {
                    onOpenComanda(appointment);
                    onOpenChange(false);
                  } else {
                    setShowCompleteConfirm(true);
                  }
                }}
              >
                <Check className="h-4 w-4" />
                Fechar comanda
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir agendamento
            </Button>
          </div>}
        </SheetContent>
      </Sheet>

      {/* Confirmação de conclusão */}
      <AlertDialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              O agendamento de <strong>{appointment.customer_name}</strong> será marcado como concluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading === 'complete'}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              disabled={loading === 'complete'}
              className="bg-success hover:bg-success/90"
            >
              {loading === 'complete' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agendamento de <strong>{appointment.customer_name}</strong> será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading === 'delete'}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading === 'delete'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading === 'delete' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppointmentDetailsSheet;
