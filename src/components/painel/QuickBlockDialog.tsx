import { useState } from 'react';
import { format, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase, Barber } from '@/lib/supabase';
import { toast } from 'sonner';
import { Ban, Loader2, Clock, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const QUICK_REASONS = [
  { label: 'Almoço', value: 'Intervalo para almoço' },
  { label: 'Folga', value: 'Dia de folga' },
  { label: 'Consulta', value: 'Consulta médica' },
  { label: 'Pessoal', value: 'Compromisso pessoal' },
];

interface QuickBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: Barber;
  selectedDate: Date;
  preselectedTime?: string | null;
  onSuccess: () => void;
}

const QuickBlockDialog = ({
  open,
  onOpenChange,
  barber,
  selectedDate,
  preselectedTime,
  onSuccess,
}: QuickBlockDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState(preselectedTime || '09:00');
  const [endTime, setEndTime] = useState(() => {
    if (preselectedTime) {
      const [h, m] = preselectedTime.split(':').map(Number);
      const endH = m >= 30 ? h + 1 : h;
      const endM = m >= 30 ? 0 : 30;
      return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }
    return '10:00';
  });
  const [isFullDay, setIsFullDay] = useState(!preselectedTime);

  // Reset when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setReason('');
      setStartTime(preselectedTime || '09:00');
      setIsFullDay(!preselectedTime);
      if (preselectedTime) {
        const [h, m] = preselectedTime.split(':').map(Number);
        const endH = m >= 30 ? h + 1 : h;
        const endM = m >= 30 ? 0 : 30;
        setEndTime(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
      } else {
        setEndTime('10:00');
      }
    }
    onOpenChange(open);
  };

  const handleBlock = async () => {
    if (!isFullDay && startTime >= endTime) {
      toast.error('Horário final deve ser maior que o inicial');
      return;
    }

    setSaving(true);
    try {
      const startDateTime = isFullDay
        ? new Date(new Date(selectedDate).setHours(0, 0, 0, 0))
        : new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${startTime}:00`);

      const endDateTime = isFullDay
        ? new Date(new Date(selectedDate).setHours(23, 59, 59, 999))
        : new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${endTime}:00`);

      const { error } = await supabase.from('blocked_slots').insert({
        barber_id: barber.id,
        barbershop_id: barber.barbershop_id || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        reason: reason || null,
      });

      if (error) throw error;

      toast.success(isFullDay ? 'Dia bloqueado!' : 'Horário bloqueado!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao bloquear:', error);
      toast.error('Erro ao bloquear horário');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Bloquear Horário
          </DialogTitle>
          <DialogDescription className="sr-only">
            Bloquear horário na agenda
          </DialogDescription>
        </DialogHeader>

        {/* Context */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/30">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </span>
          {preselectedTime && (
            <div className="flex items-center gap-1 text-sm font-medium text-primary ml-auto">
              <Clock className="h-3.5 w-3.5" />
              {preselectedTime}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Full day toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={isFullDay}
              onChange={(e) => setIsFullDay(e.target.checked)}
              className="rounded border-input"
            />
            Bloquear dia inteiro
          </label>

          {/* Time inputs */}
          {!isFullDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Início</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fim</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          {/* Quick reasons */}
          <div className="space-y-2">
            <Label className="text-xs">Motivo (opcional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r) => (
                <Button
                  key={r.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReason(reason === r.value ? '' : r.value)}
                  className={cn(
                    'text-xs h-7',
                    reason === r.value && 'border-primary bg-primary/10 text-primary'
                  )}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ou digite um motivo..."
              className="text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleBlock}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Bloquear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickBlockDialog;
