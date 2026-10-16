import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getOperationMode, type OperationMode } from '@/lib/operationMode';

const OPTIONS: { value: OperationMode; title: string; text: string; icon: typeof Monitor; recommended?: boolean }[] = [
  { value: 'reception', title: 'Recepção centralizada', text: 'Um computador no balcão fecha todas as comandas. Os barbeiros não precisam pegar o celular.', icon: Monitor, recommended: true },
  { value: 'individual', title: 'Caixa individual', text: 'Cada barbeiro fecha as próprias comandas pelo celular.', icon: Smartphone },
];

export function OperationModeCard({ barbershop, onSaved }: { barbershop: { id: string; operation_mode?: string | null }; onSaved: () => void }) {
  const [mode, setMode] = useState<OperationMode>(getOperationMode(barbershop));
  const [saving, setSaving] = useState(false);

  const choose = async (value: OperationMode) => {
    if (value === mode || saving) return;
    const previous = mode;
    setMode(value); setSaving(true);
    const { error } = await supabase.from('barbershops').update({ operation_mode: value } as never).eq('id', barbershop.id);
    setSaving(false);
    if (error) { setMode(previous); toast.error('Não foi possível salvar o modo'); return; }
    toast.success(value === 'reception' ? 'Recepção ativada' : 'Caixa individual ativado');
    onSaved();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Como sua barbearia fecha as comandas?</p>
      {OPTIONS.map(o => (
        <button key={o.value} type="button" disabled={saving} onClick={() => choose(o.value)}
          className={cn('w-full text-left rounded-xl border p-3.5 flex gap-3 transition active:scale-[0.98]',
            mode === o.value ? 'border-primary bg-primary/10' : 'border-border/50 bg-card/60')}>
          <o.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold">
              {o.title}
              {o.recommended && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />Recomendado
                </span>
              )}
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">{o.text}</span>
            {o.recommended && <span className="block text-[10px] text-primary/80 mt-1">Recomendado para o melhor desempenho</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
