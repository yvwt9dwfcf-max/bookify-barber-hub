import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DEFAULT_SLOT_STEP, fetchSlotStep, SLOT_STEPS } from '@/lib/slotStep';

/** Shop-wide schedule grid: defines which start times exist in the agenda and online booking. */
export function SlotStepCard({ barbershopId, canEdit }: { barbershopId?: string; canEdit: boolean }) {
  const [step, setStep] = useState(DEFAULT_SLOT_STEP);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => { if (barbershopId) fetchSlotStep(barbershopId).then(setStep); }, [barbershopId]);

  const choose = async (value: number) => {
    if (!barbershopId || !canEdit || value === step) return;
    const previous = step;
    setStep(value); setSaving(true);
    const { error } = await supabase.from('barbershops').update({ slot_interval_minutes: value } as never).eq('id', barbershopId);
    setSaving(false);
    if (error) { setStep(previous); toast.error('Não foi possível salvar o intervalo'); return; }
    queryClient.invalidateQueries({ queryKey: ['slot-step', barbershopId] });
    toast.success('Intervalo da agenda atualizado');
  };

  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Timer className="h-4 w-4 text-primary" />
          Intervalo da grade de horários
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Define de quanto em quanto tempo os horários aparecem na agenda e no agendamento online.
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {SLOT_STEPS.map(value => (
            <Button key={value} type="button" variant="outline" disabled={!canEdit || saving}
              onClick={() => choose(value)}
              className={cn('h-14 flex-col gap-0.5 rounded-xl', step === value && 'border-primary bg-primary/10 text-foreground')}>
              <span className="text-sm font-semibold">{value === 60 ? '1 hora' : `${value} minutos`}</span>
              {value === 30 && <span className="text-[10px] font-medium text-primary">Recomendado</span>}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {step === 15 ? 'Use 15 minutos apenas se você tem serviços de 15 minutos.' : `Horários começam a cada ${step === 60 ? '1 hora' : `${step} minutos`} a partir da abertura.`}
          {!canEdit && ' Somente o dono da barbearia pode alterar.'}
        </p>
      </CardContent>
    </Card>
  );
}
