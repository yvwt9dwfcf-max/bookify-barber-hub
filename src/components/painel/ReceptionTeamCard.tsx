import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Trash2, Headset } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RECEPTION_FINANCE_OPTIONS, getReceptionFinance, type ReceptionFinance } from '@/lib/receptionAccess';

interface Receptionist { user_id: string; name: string; email: string }

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('manage-receptionist', { body });
  if (error || data?.error) throw new Error(data?.error || 'Não foi possível concluir');
  return data;
};

export function ReceptionTeamCard({ barbershop, onSaved }: { barbershop: { id: string; reception_finance?: string | null }; onSaved: () => void }) {
  const qc = useQueryClient();
  const key = ['receptionists', barbershop.id];
  const { data: list = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => ((await call({ action: 'list', barbershop_id: barbershop.id })).receptionists ?? []) as Receptionist[],
  });
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [finance, setFinance] = useState<ReceptionFinance>(getReceptionFinance(barbershop));

  const create = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) { toast.error('Preencha nome, email e senha (mín. 6)'); return; }
    setBusy(true);
    try {
      await call({ action: 'create', barbershop_id: barbershop.id, ...form });
      toast.success('Recepção liberada');
      setForm({ name: '', email: '', password: '' });
      qc.invalidateQueries({ queryKey: key });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  const remove = async (r: Receptionist) => {
    if (!confirm(`Remover o acesso de ${r.name}?`)) return;
    try { await call({ action: 'remove', barbershop_id: barbershop.id, user_id: r.user_id }); toast.success('Acesso removido'); qc.invalidateQueries({ queryKey: key }); }
    catch (e) { toast.error((e as Error).message); }
  };

  const chooseFinance = async (v: ReceptionFinance) => {
    if (v === finance) return;
    const prev = finance; setFinance(v);
    const { error } = await supabase.from('barbershops').update({ reception_finance: v } as never).eq('id', barbershop.id);
    if (error) { setFinance(prev); toast.error('Não foi possível salvar'); return; }
    toast.success('Acesso ao financeiro atualizado'); onSaved();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <Headset className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold">Conta da recepção</p>
          <p className="text-xs text-muted-foreground">Não ocupa vaga de profissional do seu plano.</p>
        </div>
      </div>

      {isLoading ? <div className="h-12 rounded-xl bg-muted/30 animate-pulse" /> : list.length > 0 && (
        <div className="space-y-2">
          {list.map(r => (
            <div key={r.user_id} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.email}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Remover acesso" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-2">
        <div><Label className="text-xs">Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Ana" /></div>
        <div><Label className="text-xs">Email de acesso</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="recepcao@email.com" /></div>
        <div><Label className="text-xs">Senha</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" /></div>
        <Button className="btn-primary-solid mt-1" disabled={busy} onClick={create}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-2" />Criar acesso da recepção</>}
        </Button>
      </div>

      <div className="space-y-2 pt-1">
        <p className="text-sm font-semibold">O que a recepção vê do financeiro?</p>
        {RECEPTION_FINANCE_OPTIONS.map(o => (
          <button key={o.value} type="button" onClick={() => chooseFinance(o.value)}
            className={cn('w-full text-left rounded-xl border p-3 transition active:scale-[0.98]',
              finance === o.value ? 'border-primary bg-primary/10' : 'border-border/50 bg-card/60')}>
            <span className="block text-sm font-medium">{o.label}</span>
            <span className="block text-xs text-muted-foreground">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
