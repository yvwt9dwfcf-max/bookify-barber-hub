import { useMemo, useState } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { Crown, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { subscriptionStatus } from '@/lib/clube';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/operationMode';

interface Ctx { barbershop: { id: string } | null; isMaster: boolean }
interface Plan { id: string; name: string; price: number; uses_limit: number | null; is_active: boolean }
interface Sub { id: string; plan_id: string; customer_name: string; customer_phone: string; starts_at: string; expires_at: string; uses_count: number }

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const br = (d: string) => d.split('-').reverse().join('/');

const STATUS = {
  active: { label: 'Ativo', cls: 'bg-primary/15 text-primary' },
  expired: { label: 'Vencido', cls: 'bg-destructive/15 text-destructive' },
  exhausted: { label: 'Esgotado', cls: 'bg-muted text-muted-foreground' },
} as const;

export default function Clube() {
  const { barbershop, isMaster } = useOutletContext<Ctx>();
  const shopId = barbershop?.id;
  const qc = useQueryClient();
  const [tab, setTab] = useState<'subs' | 'plans'>('subs');
  const [q, setQ] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [pForm, setPForm] = useState({ name: '', price: '', limit: '' });
  const [sForm, setSForm] = useState({ name: '', phone: '', planId: '' });
  const [payMethod, setPayMethod] = useState<PaymentMethod | null>(null);
  const [renewing, setRenewing] = useState<Sub | null>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ['clube', 'plans', shopId], enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase.from('client_plans').select('*').eq('barbershop_id', shopId!).order('created_at');
      if (error) throw error; return data as Plan[];
    },
  });
  const { data: subs = [] } = useQuery({
    queryKey: ['clube', 'subs', shopId], enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase.from('client_subscriptions').select('*').eq('barbershop_id', shopId!).order('expires_at');
      if (error) throw error; return data as Sub[];
    },
  });

  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);
  const filtered = subs.filter((s) => {
    const t = q.trim().toLowerCase();
    return !t || s.customer_name.toLowerCase().includes(t) || s.customer_phone.replace(/\D/g, '').includes(t.replace(/\D/g, '') || '§');
  });
  const activeCount = subs.filter((s) => subscriptionStatus(s, planById[s.plan_id]?.uses_limit ?? null) === 'active').length;
  const mrr = subs.reduce((sum, s) => subscriptionStatus(s, planById[s.plan_id]?.uses_limit ?? null) === 'active' ? sum + Number(planById[s.plan_id]?.price || 0) : sum, 0);

  const refresh = () => qc.invalidateQueries({ queryKey: ['clube'] });
  const onErr = (e: any) => toast.error(e?.message || 'Não foi possível salvar');

  const recordPayment = async (subId: string, name: string, amount: number, method: PaymentMethod) => {
    const { error } = await supabase.from('subscription_payments').insert({ barbershop_id: shopId!, subscription_id: subId, customer_name: name, amount, payment_method: method });
    if (error) throw error;
  };

  const savePlan = useMutation({
    mutationFn: async () => {
      if (!pForm.name.trim()) throw new Error('Informe o nome do plano');
      const price = Number(pForm.price.replace(',', '.'));
      if (!(price >= 0)) throw new Error('Valor inválido');
      const limit = pForm.limit.trim() ? Math.max(1, parseInt(pForm.limit, 10)) : null;
      const { error } = await supabase.from('client_plans').insert({ barbershop_id: shopId!, name: pForm.name.trim(), price, uses_limit: limit });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Plano criado'); setPlanOpen(false); setPForm({ name: '', price: '', limit: '' }); refresh(); },
    onError: onErr,
  });
  const togglePlan = useMutation({
    mutationFn: async (p: Plan) => {
      const { error } = await supabase.from('client_plans').update({ is_active: !p.is_active }).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: refresh, onError: onErr,
  });
  const saveSub = useMutation({
    mutationFn: async () => {
      const phone = sForm.phone.replace(/\D/g, '');
      if (!sForm.name.trim() || phone.length < 10) throw new Error('Informe nome e WhatsApp válidos');
      if (!sForm.planId) throw new Error('Escolha um plano');
      if (!payMethod) throw new Error('Escolha a forma de pagamento');
      const today = new Date();
      const { data, error } = await supabase.from('client_subscriptions').insert({
        barbershop_id: shopId!, plan_id: sForm.planId, customer_name: sForm.name.trim(), customer_phone: sForm.phone,
        starts_at: format(today, 'yyyy-MM-dd'), expires_at: format(addDays(today, 30), 'yyyy-MM-dd'),
      }).select('id').single();
      if (error) throw error;
      await recordPayment(data.id, sForm.name.trim(), Number(planById[sForm.planId]?.price || 0), payMethod);
    },
    onSuccess: () => { toast.success('Assinante cadastrado'); setSubOpen(false); setSForm({ name: '', phone: '', planId: '' }); setPayMethod(null); refresh(); },
    onError: onErr,
  });
  const renew = useMutation({
    mutationFn: async (s: Sub) => {
      if (!payMethod) throw new Error('Escolha a forma de pagamento');
      const today = new Date();
      const { error } = await supabase.from('client_subscriptions').update({
        starts_at: format(today, 'yyyy-MM-dd'), expires_at: format(addDays(today, 30), 'yyyy-MM-dd'), uses_count: 0,
      }).eq('id', s.id);
      if (error) throw error;
      await recordPayment(s.id, s.customer_name, Number(planById[s.plan_id]?.price || 0), payMethod);
    },
    onSuccess: () => { toast.success('Assinatura renovada por 30 dias'); setRenewing(null); setPayMethod(null); refresh(); }, onError: onErr,
  });
  const removeSub = useMutation({
    mutationFn: async (s: Sub) => {
      const { error } = await supabase.from('client_subscriptions').delete().eq('id', s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Assinante removido'); refresh(); }, onError: onErr,
  });

  if (!isMaster) return <Navigate to="/painel" replace />;
  const activePlans = plans.filter((p) => p.is_active);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Crown className="h-5 w-5 text-primary" /> Clube de Assinaturas</h1>
          <p className="text-sm text-muted-foreground">Planos mensais, renovação no balcão.</p>
        </div>
        <Button className="btn-primary-solid h-11 rounded-full px-4" onClick={() => (tab === 'plans' ? setPlanOpen(true) : setSubOpen(true))}>
          <Plus className="h-4 w-4" /> {tab === 'plans' ? 'Plano' : 'Assinante'}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4"><p className="text-[11px] uppercase tracking-widest text-muted-foreground">Ativos</p><p className="text-2xl font-bold tabular-nums">{activeCount}</p></div>
        <div className="rounded-2xl border bg-card p-4"><p className="text-[11px] uppercase tracking-widest text-muted-foreground">Receita mensal</p><p className="text-2xl font-bold tabular-nums text-primary">{brl(mrr)}</p></div>
      </div>

      <div className="grid grid-cols-2 rounded-full bg-muted p-1">
        {([['subs', 'Assinantes'], ['plans', 'Planos']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('h-10 rounded-full text-sm font-semibold transition-all', tab === k ? 'bg-card shadow-sm' : 'text-muted-foreground')}>{l}</button>
        ))}
      </div>

      {tab === 'subs' ? (
        <section className="space-y-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou WhatsApp" className="h-12 pl-9" /></div>
          {filtered.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{plans.length === 0 ? 'Crie um plano primeiro na aba Planos.' : 'Nenhum assinante ainda.'}</p>}
          {filtered.map((s) => {
            const plan = planById[s.plan_id];
            const st = STATUS[subscriptionStatus(s, plan?.uses_limit ?? null)];
            return (
              <article key={s.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{s.customer_phone} · {plan?.name || 'Plano'}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', st.cls)}>{st.label}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{plan?.uses_limit ? `${s.uses_count}/${plan.uses_limit} usos` : `${s.uses_count} usos · ilimitado`} · vence {br(s.expires_at)}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={() => { setPayMethod(null); setRenewing(s); }}><RefreshCw className="h-3.5 w-3.5" /> Renovar</Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label="Remover" onClick={() => confirm(`Remover ${s.customer_name}?`) && removeSub.mutate(s)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="space-y-3">
          {plans.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Ex.: “4 atendimentos/mês” ou “Ilimitado”.</p>}
          {plans.map((p) => (
            <article key={p.id} className={cn('flex items-center justify-between rounded-2xl border bg-card p-4', !p.is_active && 'opacity-60')}>
              <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{brl(Number(p.price))}/mês · {p.uses_limit ? `${p.uses_limit} usos` : 'Ilimitado'}</p></div>
              <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={() => togglePlan.mutate(p)}>{p.is_active ? 'Pausar' : 'Ativar'}</Button>
            </article>
          ))}
        </section>
      )}

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo plano</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder={`Nome (ex.: ${v.segment.suggestedServices[0]?.name ?? 'Atendimento'} ilimitado)`} value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} className="h-12" />
            <Input inputMode="decimal" placeholder="Valor mensal (R$)" value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} className="h-12" />
            <Input inputMode="numeric" placeholder="Usos por mês (vazio = ilimitado)" value={pForm.limit} onChange={(e) => setPForm({ ...pForm, limit: e.target.value.replace(/\D/g, '') })} className="h-12" />
            <Button className="btn-primary-solid h-12 w-full" disabled={savePlan.isPending} onClick={() => savePlan.mutate()}>Salvar plano</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo assinante</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do cliente" value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} className="h-12" />
            <Input inputMode="tel" placeholder="(11) 99999-9999" value={sForm.phone} onChange={(e) => setSForm({ ...sForm, phone: maskPhone(e.target.value) })} className="h-12" />
            <div className="grid gap-2">
              {activePlans.length === 0 && <p className="text-sm text-muted-foreground">Nenhum plano ativo. Crie um na aba Planos.</p>}
              {activePlans.map((p) => (
                <button key={p.id} type="button" onClick={() => setSForm({ ...sForm, planId: p.id })}
                  className={cn('flex h-12 items-center justify-between rounded-xl border px-3 text-sm transition-transform active:scale-[0.97]', sForm.planId === p.id && 'border-primary bg-primary/10')}>
                  <span className="font-medium">{p.name}</span><span className="text-muted-foreground">{brl(Number(p.price))}</span>
                </button>
              ))}
            </div>
            <PayPicker value={payMethod} onChange={setPayMethod} />
            <p className="text-xs text-muted-foreground">Validade de 30 dias a partir de hoje. O telefone precisa ser o mesmo usado no agendamento.</p>
            <Button className="btn-primary-solid h-12 w-full" disabled={saveSub.isPending} onClick={() => saveSub.mutate()}>Cadastrar assinante</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renewing} onOpenChange={(o) => !o && setRenewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renovar {renewing?.customer_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{renewing && planById[renewing.plan_id]?.name} · {renewing && brl(Number(planById[renewing.plan_id]?.price || 0))} · mais 30 dias</p>
            <PayPicker value={payMethod} onChange={setPayMethod} />
            <Button className="btn-primary-solid h-12 w-full" disabled={renew.isPending} onClick={() => renewing && renew.mutate(renewing)}>Confirmar pagamento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayPicker({ value, onChange }: { value: PaymentMethod | null; onChange: (m: PaymentMethod) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Forma de pagamento</p>
      <div className="grid grid-cols-4 gap-2">
        {PAYMENT_METHODS.map((m) => (
          <button key={m.value} type="button" onClick={() => onChange(m.value)}
            className={cn('h-11 rounded-xl border text-xs font-semibold transition-transform active:scale-[0.97]', value === m.value ? 'border-primary bg-primary/10 text-foreground' : 'text-muted-foreground')}>{m.label}</button>
        ))}
      </div>
    </div>
  );
}
