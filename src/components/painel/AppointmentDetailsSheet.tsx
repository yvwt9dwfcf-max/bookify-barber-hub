import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Phone, Clock, Scissors, Calendar, Pencil, Check, Trash2, Loader2 } from 'lucide-react';
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
}

const AppointmentDetailsSheet = ({
  appointment,
  open,
  onOpenChange,
  onEdit,
  onComplete,
  onDelete,
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
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
          <SheetHeader className="text-left pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Detalhes do Agendamento</SheetTitle>
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  getStatusColor(appointment.status)
                )}
              >
                {getStatusLabel(appointment.status)}
              </span>
            </div>
            <SheetDescription className="sr-only">
              Informações completas do agendamento
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            {/* Informações do cliente */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{appointment.customer_name}</p>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{appointment.customer_phone || 'Não informado'}</p>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Scissors className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {appointment.service?.name || 'Serviço não especificado'}
                  </p>
                  {appointment.service && (
                    <p className="text-sm text-muted-foreground">
                      R$ {Number(appointment.service.price).toFixed(2)} • {appointment.service.duration_minutes}min
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {format(new Date(appointment.start_time), 'HH:mm')} - {format(new Date(appointment.end_time), 'HH:mm')}
                  </p>
                  <p className="text-sm text-muted-foreground">Horário</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {format(new Date(appointment.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">Data</p>
                </div>
              </div>

              {appointment.barber && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{appointment.barber.name}</p>
                    <p className="text-sm text-muted-foreground">Profissional</p>
                  </div>
                </div>
              )}

              {appointment.notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{appointment.notes}</p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-2 pt-2 pb-4">
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
                  variant="outline"
                  className="w-full justify-start gap-2 h-11 text-success hover:text-success hover:bg-success/10"
                  onClick={() => setShowCompleteConfirm(true)}
                >
                  <Check className="h-4 w-4" />
                  Concluir atendimento
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
            </div>
          </div>
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
