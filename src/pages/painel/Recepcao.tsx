import { Suspense, useEffect, useMemo, useState } from 'react';
import { lazy } from '@/lib/chunkReload';
import { useOutletContext, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay, endOfDay, subDays, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, BellRing, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscriptionStatus } from '@/lib/clube';
import { checkoutState, reminderLabel, whatsappReminderUrl } from '@/lib/operationMode';

const ComandaSheet = lazy(() => import('@/components/painel/ComandaSheet'));

interface Ctx { barbershop: { id: string; name?: string } | null; isMaster: boolean }
interface Apt {
  id: string; customer_name: string; customer_phone: string; start_time: string; end_time: string;
  status: string; barber_id: string; barbershop_id: string | null;
  services: { name: string; price: number } | null; barbers: { name: string } | null;
}

const STATE_LABEL = { overdue: 'Finalizar', in_progress: 'Na cadeira', upcoming: 'A seguir', done: 'Fechado' } as const;

const Recepcao = () => {
  const { barbershop, isMaster } = useOutletContext<Ctx>();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [barberFilter, setBarberFilter] = useState<string | 'all'>('all');
  const [onlyPending, setOnlyPending] = useState(false);
  const [tab, setTab] = useState<'fila' | 'lembretes' | 'assinaturas'>('fila');
  const [selected, setSelected] = useState<Apt | null>(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const { data: apts = [] } = useQuery({
    queryKey: ['appointments', 'reception', barbershop?.id, format(now, 'yyyy-MM-dd')],
    enabled: !!barbershop?.id && isMaster,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from('appointments')
        .select('id, customer_name, customer_phone, start_time, end_time, status, barber_id, barbershop_id, services(name, price), barbers(name)')
        .eq('barbershop_id', barbershop!.id)
        .in('status', ['confirmed', 'completed'])
        .gte('start_time', startOfDay(now).toISOString()).lte('start_time', endOfDay(now).toISOString())
        .order('start_time');
      if (error) throw error;
      // Pending from previous days (confirmed, never closed) so no professional's service is left open.
      const { data: old } = await supabase.from('appointments')
        .select('id, customer_name, customer_phone, start_time, end_time, status, barber_id, barbershop_id, services(name, price), barbers(name)')
        .eq('barbershop_id', barbershop!.id).eq('status', 'confirmed')
        .gte('start_time', startOfDay(subDays(now, 14)).toISOString()).lt('start_time', startOfDay(now).toISOString())
        .order('start_time');
      return [...(old || []), ...(data || [])] as unknown as Apt[];
    },
  });

  const barbers = useMemo(() => {
    const m = new Map<string, string>();
    apts.forEach(a => m.set(a.barber_id, a.barbers?.name || 'Profissional'));
    return [...m.entries()];
  }, [apts]);

  const pending = apts.filter(a => checkoutState(a, now) === 'overdue');
  const { data: productTotal = 0 } = useQuery({
    queryKey: ['product-sales', 'reception', barbershop?.id, format(now, 'yyyy-MM-dd')],
    enabled: !!barbershop?.id && isMaster,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase.from('product_sales').select('total_amount')
        .eq('barbershop_id', barbershop!.id)
        .gte('sold_at', startOfDay(now).toISOString()).lte('sold_at', endOfDay(now).toISOString());
      return (data || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
    },
  });
  const { data: subTotal = 0 } = useQuery({
    queryKey: ['sub-payments', 'reception', barbershop?.id, format(now, 'yyyy-MM-dd')],
    enabled: !!barbershop?.id && isMaster,
    refetchInterval: 30000,
    queryFn: async () => {
      const range = [startOfDay(now).toISOString(), endOfDay(now).toISOString()];
      const [{ data }, { data: ex }] = await Promise.all([
        supabase.from('subscription_payments').select('amount').eq('barbershop_id', barbershop!.id).gte('paid_at', range[0]).lte('paid_at', range[1]),
        supabase.from('appointment_extras').select('price').eq('barbershop_id', barbershop!.id).gte('created_at', range[0]).lte('created_at', range[1]),
      ]);
      return (data || []).reduce((s, r) => s + Number(r.amount || 0), 0) + (ex || []).reduce((s, r) => s + Number(r.price || 0), 0);
    },
  });
  const { data: renewals = [] } = useQuery({
    queryKey: ['clube', 'renewals', barbershop?.id, format(now, 'yyyy-MM-dd')],
    enabled: !!barbershop?.id && isMaster,
    queryFn: async () => {
      const [{ data: subs }, { data: plans }] = await Promise.all([
        supabase.from('client_subscriptions').select('id, plan_id, customer_name, customer_phone, starts_at, expires_at, uses_count').eq('barbershop_id', barbershop!.id).order('expires_at'),
        supabase.from('client_plans').select('id, name, uses_limit').eq('barbershop_id', barbershop!.id),
      ]);
      const byId = Object.fromEntries((plans || []).map(p => [p.id, p]));
      const soon = format(new Date(now.getTime() + 3 * 86400000), 'yyyy-MM-dd');
      return (subs || []).map(s => ({ ...s, plan: byId[s.plan_id], status: subscriptionStatus(s, byId[s.plan_id]?.uses_limit ?? null) }))
        .filter(s => s.status !== 'active' || s.expires_at <= soon);
    },
  });
  const revenue = subTotal + apts.filter(a => a.status === 'completed').reduce((s, a) => s + Number(a.services?.price || 0), 0) + productTotal;
  const upcoming = apts.filter(a => checkoutState(a, now) === 'upcoming');
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const list = apts.filter(a => {
    if (barberFilter !== 'all' && a.barber_id !== barberFilter) return false;
    if (onlyPending && checkoutState(a, now) !== 'overdue') return false;
    const s = search.trim().toLowerCase();
    return !s || a.customer_name.toLowerCase().includes(s) || (a.barbers?.name || '').toLowerCase().includes(s);
  });

  if (!isMaster) return <Navigate to="/painel" replace />;

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold">Recepção</h1>
        <p className="text-xs text-muted-foreground">Feche as comandas do dia em um só lugar.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[['Faturado hoje', brl(revenue)], ['Atendimentos', String(apts.filter(a => isToday(new Date(a.start_time))).length)], ['Pendentes', String(pending.length)]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border/50 bg-card/60 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
            <p className="text-base font-bold tabular-nums truncate">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-full bg-muted/60 p-1">
        {([['fila', 'Fila'], ['lembretes', `Lembretes (${upcoming.length})`], ['assinaturas', `Renovar (${renewals.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={cn('h-9 rounded-full text-xs font-semibold transition', tab === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>{l}</button>
        ))}
      </div>

      {tab === 'assinaturas' ? (
        <div className="space-y-2">
          {renewals.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhuma assinatura vencendo.</p>}
          {renewals.map(s => {
            const label = s.status === 'exhausted' ? 'Usos esgotados' : s.status === 'expired' ? `Venceu ${s.expires_at.split('-').reverse().join('/')}` : `Vence ${s.expires_at.split('-').reverse().join('/')}`;
            const digits = s.customer_phone.replace(/\D/g, '');
            const msg = encodeURIComponent(`Olá ${s.customer_name.split(' ')[0]}! Sua assinatura ${s.plan?.name || ''} da ${barbershop?.name || 'nossa casa'} ${s.status === 'active' ? 'vence em breve' : 'venceu'}. Quer renovar na sua próxima visita?`);
            return (
              <div key={s.id} className="rounded-xl border border-border/50 bg-card/60 p-3.5 flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{s.customer_name}</span>
                  <span className={cn('block text-xs', s.status === 'active' ? 'text-muted-foreground' : 'text-destructive font-semibold')}>{s.plan?.name || 'Plano'} · {label}</span>
                </span>
                {digits.length >= 10 && (
                  <a href={`https://wa.me/55${digits}?text=${msg}`} target="_blank" rel="noreferrer" aria-label={`Cobrar renovação de ${s.customer_name} no WhatsApp`}
                    className="h-11 w-11 rounded-full bg-primary/15 text-primary flex items-center justify-center active:scale-95 transition">
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : tab === 'lembretes' ? (
        <div className="space-y-2">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhum cliente a seguir hoje.</p>}
          {upcoming.map(a => {
            const time = format(new Date(a.start_time), 'HH:mm');
            const mins = (new Date(a.start_time).getTime() - now.getTime()) / 60000;
            return (
              <div key={a.id} className="rounded-xl border border-border/50 bg-card/60 p-3.5 flex items-center gap-3">
                <span className="w-12 text-sm font-semibold tabular-nums">{time}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{a.customer_name}</span>
                  <span className={cn('block text-xs', mins <= 30 ? 'text-primary font-semibold' : 'text-muted-foreground')}>{reminderLabel(a.start_time, now)} · {a.barbers?.name}</span>
                </span>
                {a.customer_phone?.replace(/\D/g, '').length >= 10 && (
                  <a href={whatsappReminderUrl(a.customer_phone, a.customer_name, time, barbershop?.name || 'nosso espaço')} target="_blank" rel="noreferrer"
                    aria-label={`Lembrar ${a.customer_name} no WhatsApp`}
                    className="h-11 w-11 rounded-full bg-primary/15 text-primary flex items-center justify-center active:scale-95 transition">
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (<>
      <button type="button" onClick={() => setOnlyPending(v => !v)}
        className={cn('w-full rounded-xl border p-3.5 flex items-center gap-3 text-left transition active:scale-[0.98]',
          pending.length ? 'border-primary bg-primary/10' : 'border-border/50 bg-card/60')}>
        <BellRing className="h-5 w-5 text-primary" />
        <span className="flex-1">
          <span className="block text-sm font-semibold">
            {pending.length ? `${pending.length} ${pending.length === 1 ? 'atendimento para finalizar' : 'atendimentos para finalizar'}` : 'Nenhuma pendência'}
          </span>
          <span className="block text-xs text-muted-foreground">
            {onlyPending ? 'Mostrando só pendentes · toque para ver todos' : 'Horários que já acabaram e ainda não foram pagos'}
          </span>
        </span>
      </button>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou profissional" className="pl-9 h-11 rounded-xl" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[['all', 'Todos'] as const, ...barbers].map(([id, name]) => (
          <button key={id} type="button" onClick={() => setBarberFilter(id)}
            className={cn('shrink-0 h-9 px-3.5 rounded-full border text-xs font-medium',
              barberFilter === id ? 'border-primary bg-primary/10 text-foreground' : 'border-border/50 text-muted-foreground')}>
            {name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhum atendimento encontrado.</p>}
        {list.map(a => {
          const st = checkoutState(a, now);
          const closable = st !== 'done';
          return (
            <button key={a.id} type="button" disabled={!closable} onClick={() => setSelected(a)}
              className={cn('w-full rounded-xl border p-3.5 flex items-center gap-3 text-left transition active:scale-[0.98]',
                st === 'overdue' ? 'border-primary/60 bg-primary/5' : 'border-border/50 bg-card/60', !closable && 'opacity-60')}>
              <span className="w-12 text-sm font-semibold tabular-nums leading-tight">{format(new Date(a.start_time), 'HH:mm')}{!isToday(new Date(a.start_time)) && <span className="block text-[10px] font-medium text-muted-foreground">{format(new Date(a.start_time), 'dd/MM')}</span>}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{a.customer_name}</span>
                <span className="block text-xs text-muted-foreground truncate">{a.services?.name || 'Serviço'} · {a.barbers?.name}</span>
              </span>
              <span className={cn('text-[11px] font-semibold px-2 py-1 rounded-full',
                st === 'overdue' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {STATE_LABEL[st]}
              </span>
            </button>
          );
        })}
      </div>

      </>)}

      <Suspense fallback={null}>
        {selected && (
          <ComandaSheet open={!!selected} onOpenChange={o => !o && setSelected(null)}
            appointment={{ ...selected, barbershop_id: selected.barbershop_id ?? barbershop?.id ?? null,
              service: selected.services ? { name: selected.services.name, price: Number(selected.services.price || 0) } : null }}
            onCompleted={() => qc.invalidateQueries({ queryKey: ['appointments', 'reception'] })} />
        )}
      </Suspense>
    </div>
  );
};

export default Recepcao;
