import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Package, Receipt, ChartPie, Target, TrendingUp, TrendingDown, Sparkles, ShoppingCart, Users, ArrowUp, ArrowDown, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Caixa from './Caixa';
import Produtos from './Produtos';
import Despesas from './Despesas';
import Relatorios from './Relatorios';
import Comissoes from './Comissoes';
import BarbersReport from '@/components/painel/BarbersReport';

interface ContextType {
  barber: any;
  barbershop: any;
  isMaster: boolean;
}

import { formatCurrency } from '@/lib/formatters';

const TABS = [
  { value: 'resumo', label: 'Resumo', icon: TrendingUp, masterOnly: false },
  { value: 'caixa', label: 'Caixa', icon: Wallet, masterOnly: false },
  { value: 'produtos', label: 'Produtos', icon: Package, masterOnly: false },
  { value: 'relatorios', label: 'Relatórios', icon: ChartPie, masterOnly: false },
  { value: 'despesas', label: 'Despesas', icon: Receipt, masterOnly: true },
  { value: 'comissoes', label: 'Comissões', icon: Percent, masterOnly: true },
  { value: 'barbeiros', label: 'Barbeiros', icon: Users, masterOnly: true },
  { value: 'metas', label: 'Metas', icon: Target, masterOnly: true },
];

const ResumoTab = ({ barbershop, isMaster }: { barbershop: any; isMaster: boolean }) => {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();
  const dateStr = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDateStr = format(endOfMonth(now), 'yyyy-MM-dd');

  const prevMonthDate = subMonths(now, 1);
  const prevStart = startOfMonth(prevMonthDate).toISOString();
  const prevEnd = endOfMonth(prevMonthDate).toISOString();
  const prevDateStr = format(startOfMonth(prevMonthDate), 'yyyy-MM-dd');
  const prevEndDateStr = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd');

  const fetchPeriod = async (startISO: string, endISO: string, startDate: string, endDate: string) => {
    const [{ data: apts }, { data: sales }, { data: exps }] = await Promise.all([
      supabase
        .from('appointments').select('services(price)')
        .eq('barbershop_id', barbershop.id).eq('status', 'completed')
        .gte('start_time', startISO).lte('start_time', endISO),
      supabase
        .from('product_sales').select('total_amount, unit_cost, quantity')
        .eq('barbershop_id', barbershop.id)
        .gte('sold_at', startISO).lte('sold_at', endISO),
      supabase
        .from('expenses').select('amount')
        .eq('barbershop_id', barbershop.id)
        .gte('expense_date', startDate).lte('expense_date', endDate),
    ]);
    const services = (apts || []).reduce((s, a: any) => s + Number(a.services?.price || 0), 0);
    const products = (sales || []).reduce((s, x: any) => s + Number(x.total_amount || 0), 0);
    const cogs = (sales || []).reduce((s, x: any) => s + Number(x.unit_cost || 0) * Number(x.quantity || 0), 0);
    const expenses = (exps || []).reduce((s, e: any) => s + Number(e.amount || 0), 0);
    return { services, products, cogs, expenses };
  };

  const { data, isLoading } = useQuery({
    queryKey: ['financeiro-resumo', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;
      const [current, previous] = await Promise.all([
        fetchPeriod(monthStart, monthEnd, dateStr, endDateStr),
        fetchPeriod(prevStart, prevEnd, prevDateStr, prevEndDateStr),
      ]);
      return { current, previous };
    },
    enabled: !!barbershop?.id,
  });

  const cur = data?.current || { services: 0, products: 0, cogs: 0, expenses: 0 };
  const prev = data?.previous || { services: 0, products: 0, cogs: 0, expenses: 0 };

  const total = cur.services + cur.products;
  const profit = total - cur.expenses - cur.cogs;
  const prevTotal = prev.services + prev.products;
  const prevProfit = prevTotal - prev.expenses - prev.cogs;

  const profitDelta = prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : (profit > 0 ? 100 : 0);
  const dayOfMonth = getDate(now);
  const avgPerDay = dayOfMonth > 0 ? total / dayOfMonth : 0;
  const monthLabel = format(now, 'MMMM', { locale: ptBR });
  const prevMonthLabel = format(prevMonthDate, 'MMMM', { locale: ptBR });

  const insights: string[] = [];
  if (prevProfit !== 0 && Math.abs(profitDelta) >= 1) {
    insights.push(
      profitDelta >= 0
        ? `Seu lucro aumentou ${profitDelta.toFixed(0)}% em relação a ${prevMonthLabel}`
        : `Seu lucro caiu ${Math.abs(profitDelta).toFixed(0)}% em relação a ${prevMonthLabel}`
    );
  }
  if (avgPerDay > 0) {
    insights.push(`Você está faturando em média ${formatCurrency(avgPerDay)} por dia`);
  }
  if (cur.products > 0 && total > 0) {
    const productsPct = (cur.products / total) * 100;
    if (productsPct >= 15) insights.push(`Produtos representam ${productsPct.toFixed(0)}% do faturamento`);
  }

  const breakdown = [
    { label: 'Serviços', value: cur.services, sign: '+' as const, icon: Sparkles },
    { label: 'Produtos', value: cur.products, sign: '+' as const, icon: ShoppingCart },
    { label: 'Custo de produtos', value: cur.cogs, sign: '−' as const, icon: Package },
    { label: 'Despesas', value: cur.expenses, sign: '−' as const, icon: Receipt },
  ];
  const maxBar = Math.max(...breakdown.map(b => b.value), 1);

  return (
    <div className="space-y-7 pt-5">
      {/* Lucro hero — destaque com gradiente sutil */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-primary/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${profit >= 0 ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
              {profit >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            </div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 font-semibold">
              Lucro · {monthLabel}
            </p>
          </div>
          {prevProfit !== 0 && Math.abs(profitDelta) >= 1 && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${profitDelta >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              {profitDelta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(profitDelta).toFixed(0)}%
            </span>
          )}
        </div>
        <p className={`text-[38px] leading-none font-bold tabular-nums tracking-tight ${profit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
          {isLoading ? '—' : formatCurrency(profit)}
        </p>
        <p className="text-[11px] text-muted-foreground/80 mt-2">
          {prevProfit !== 0 ? `${prevMonthLabel}: ${formatCurrency(prevProfit)}` : 'Sem dados do mês anterior'}
        </p>
      </div>

      {insights.length > 0 && !isLoading && (
        <div className="space-y-1.5">
          {insights.map((txt, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed">
              <span className="mt-1 h-1 w-1 rounded-full bg-primary/60 shrink-0" />
              <span>{txt}</span>
            </div>
          ))}
        </div>
      )}

      {/* Métricas — blocos limpos com hierarchy tipográfica */}
      <div className="grid grid-cols-3 gap-3 border-y border-border/30 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">Faturamento</p>
          <p className="text-base font-semibold tabular-nums tracking-tight mt-1.5">{formatCurrency(total)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">Serviços</p>
          <p className="text-base font-semibold tabular-nums tracking-tight mt-1.5">{formatCurrency(cur.services)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">Ticket médio</p>
          <p className="text-base font-semibold tabular-nums tracking-tight mt-1.5">
            {formatCurrency(avgPerDay)}
          </p>
        </div>
      </div>

      {/* Detalhamento — barras minimalistas com ícone-chip */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 font-semibold">
          Detalhamento
        </p>
        <div className="space-y-3">
          {breakdown.map((b) => {
            const pct = (b.value / maxBar) * 100;
            const isNeg = b.sign === '−';
            const Icon = b.icon;
            return (
              <div key={b.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isNeg ? 'bg-destructive/10 text-destructive/80' : 'bg-primary/10 text-primary'}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <span className="text-[12px] text-foreground/85 truncate">{b.label}</span>
                  </div>
                  <span className={`text-[13px] font-semibold tabular-nums shrink-0 ${isNeg ? 'text-destructive/90' : 'text-foreground'}`}>
                    {isNeg ? '−' : ''}{formatCurrency(b.value)}
                  </span>
                </div>
                <div className="relative h-[5px] w-full rounded-full bg-border/30 overflow-hidden ml-8" style={{ width: 'calc(100% - 2rem)' }}>
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isNeg ? 'bg-gradient-to-r from-destructive/50 to-destructive/70' : 'bg-gradient-to-r from-primary/80 to-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MetasTab = ({ barbershop, isMaster }: { barbershop: any; isMaster: boolean }) => {
  const qc = useQueryClient();
  const [shopGoalOpen, setShopGoalOpen] = useState(false);
  const [productsGoalOpen, setProductsGoalOpen] = useState(false);
  const [shopGoal, setShopGoal] = useState('');
  const [productsGoal, setProductsGoal] = useState('');

  const { data: shop } = useQuery({
    queryKey: ['metas-shop', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;
      const { data } = await supabase
        .from('barbershops')
        .select('monthly_goal, products_monthly_goal')
        .eq('id', barbershop.id)
        .maybeSingle();
      return data;
    },
    enabled: !!barbershop?.id && isMaster,
  });

  const monthStart = startOfMonth(new Date()).toISOString();
  const monthEnd = endOfMonth(new Date()).toISOString();

  const { data: progress } = useQuery({
    queryKey: ['metas-progress', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return { services: 0, products: 0 };
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase
          .from('appointments')
          .select('services(price)')
          .eq('barbershop_id', barbershop.id)
          .eq('status', 'completed')
          .gte('start_time', monthStart)
          .lte('start_time', monthEnd),
        supabase
          .from('product_sales')
          .select('total_amount')
          .eq('barbershop_id', barbershop.id)
          .gte('sold_at', monthStart)
          .lte('sold_at', monthEnd),
      ]);
      return {
        services: (a || []).reduce((sum, x: any) => sum + Number(x.services?.price || 0), 0),
        products: (s || []).reduce((sum, x: any) => sum + Number(x.total_amount || 0), 0),
      };
    },
    enabled: !!barbershop?.id,
  });

  const update = useMutation({
    mutationFn: async (payload: { field: 'monthly_goal' | 'products_monthly_goal'; value: number | null }) => {
      const { error } = await supabase
        .from('barbershops')
        .update({ [payload.field]: payload.value })
        .eq('id', barbershop.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metas-shop'] });
      toast.success('Meta atualizada!');
      setShopGoalOpen(false);
      setProductsGoalOpen(false);
    },
    onError: () => toast.error('Erro ao salvar meta'),
  });

  const totalRev = (progress?.services || 0) + (progress?.products || 0);
  const shopMeta = Number(shop?.monthly_goal || 0);
  const prodMeta = Number(shop?.products_monthly_goal || 0);
  const shopPct = shopMeta > 0 ? Math.min(100, (totalRev / shopMeta) * 100) : 0;
  const prodPct = prodMeta > 0 ? Math.min(100, ((progress?.products || 0) / prodMeta) * 100) : 0;

  if (!isMaster) {
    return <div className="pt-8 text-center text-sm text-muted-foreground">Apenas administradores podem definir metas da barbearia.</div>;
  }

  return (
    <div className="space-y-3 pt-4">
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Meta total mensal</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">
                {shopMeta > 0 ? formatCurrency(shopMeta) : '—'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setShopGoal(shopMeta ? String(shopMeta) : ''); setShopGoalOpen(true); }}>
              {shopMeta > 0 ? 'Editar' : 'Definir'}
            </Button>
          </div>
          {shopMeta > 0 && (
            <>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all" style={{ width: `${shopPct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formatCurrency(totalRev)} de {formatCurrency(shopMeta)} ({shopPct.toFixed(0)}%)
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Meta de produtos</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">
                {prodMeta > 0 ? formatCurrency(prodMeta) : '—'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setProductsGoal(prodMeta ? String(prodMeta) : ''); setProductsGoalOpen(true); }}>
              {prodMeta > 0 ? 'Editar' : 'Definir'}
            </Button>
          </div>
          {prodMeta > 0 && (
            <>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all" style={{ width: `${prodPct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formatCurrency(progress?.products || 0)} de {formatCurrency(prodMeta)} ({prodPct.toFixed(0)}%)
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground px-1">
        Para metas individuais por barbeiro, acesse a aba <strong>Relatórios</strong>.
      </p>

      {/* Shop goal dialog */}
      <Dialog open={shopGoalOpen} onOpenChange={setShopGoalOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader><DialogTitle>Meta total mensal</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="text" inputMode="decimal" value={shopGoal} onChange={(e) => setShopGoal(e.target.value)} placeholder="Ex: 10000" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShopGoalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                const v = parseFloat(shopGoal.replace(',', '.'));
                if (isNaN(v) || v < 0) { toast.error('Valor inválido'); return; }
                update.mutate({ field: 'monthly_goal', value: v > 0 ? v : null });
              }}
              disabled={update.isPending}
              className="btn-primary-gradient"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Products goal dialog */}
      <Dialog open={productsGoalOpen} onOpenChange={setProductsGoalOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader><DialogTitle>Meta de produtos</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="text" inputMode="decimal" value={productsGoal} onChange={(e) => setProductsGoal(e.target.value)} placeholder="Ex: 2000" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProductsGoalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                const v = parseFloat(productsGoal.replace(',', '.'));
                if (isNaN(v) || v < 0) { toast.error('Valor inválido'); return; }
                update.mutate({ field: 'products_monthly_goal', value: v > 0 ? v : null });
              }}
              disabled={update.isPending}
              className="btn-primary-gradient"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Financeiro = () => {
  const ctx = useOutletContext<ContextType>();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('tab') || 'resumo';
  const visibleTabs = useMemo(() => TABS.filter((t) => ctx.isMaster || !t.masterOnly), [ctx.isMaster]);
  const isAllowedTab = useCallback((value: string) => visibleTabs.some((t) => t.value === value), [visibleTabs]);
  const [tab, setTab] = useState(() => (visibleTabs.some((t) => t.value === initial) ? initial : 'resumo'));

  // Auto-materialize recurring expenses for the current month on mount
  useEffect(() => {
    if (!ctx.barbershop?.id || !ctx.isMaster) return;
    (supabase.rpc as any)('materialize_recurring_expenses', { _barbershop_id: ctx.barbershop.id })
      .then(({ data }: any) => {
        if (data && Number(data) > 0) {
          qc.invalidateQueries({ queryKey: ['expenses'] });
          qc.invalidateQueries({ queryKey: ['cash-flow'] });
          qc.invalidateQueries({ queryKey: ['financeiro-resumo'] });
        }
      })
      .catch(() => {});
  }, [ctx.barbershop?.id, ctx.isMaster, qc]);

  const handleTab = (v: string) => {
    if (!isAllowedTab(v)) return;
    setTab(v);
    setSearchParams({ tab: v }, { replace: true });
  };

  useEffect(() => {
    const requested = searchParams.get('tab') || 'resumo';
    const next = isAllowedTab(requested) ? requested : 'resumo';
    if (tab !== next) setTab(next);
    if (requested !== next) setSearchParams({ tab: next }, { replace: true });
  }, [searchParams, setSearchParams, isAllowedTab, tab]);

  return (
    <div className="space-y-4 animate-page-enter pb-20">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Financeiro
        </h1>
        <p className="text-sm text-muted-foreground">Caixa, produtos, despesas, relatórios e metas em um só lugar</p>
      </div>

      <Tabs value={tab} onValueChange={handleTab}>
        <div className="-mx-3 md:mx-0 overflow-x-auto scrollbar-hide">
          <TabsList
            className="inline-flex h-11 rounded-lg p-1 mx-3 md:mx-0 w-max md:w-full md:grid"
            style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
          >
            {visibleTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="rounded-md h-full px-3 text-xs gap-1.5 whitespace-nowrap">
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="resumo"><ResumoTab barbershop={ctx.barbershop} isMaster={ctx.isMaster} /></TabsContent>
        <TabsContent value="caixa"><Caixa /></TabsContent>
        <TabsContent value="produtos"><Produtos /></TabsContent>
        <TabsContent value="despesas"><Despesas /></TabsContent>
        <TabsContent value="comissoes"><Comissoes /></TabsContent>
        <TabsContent value="relatorios"><Relatorios /></TabsContent>
        <TabsContent value="barbeiros">
          {ctx.isMaster && ctx.barbershop?.id ? (
            <BarbersReport barbershopId={ctx.barbershop.id} />
          ) : (
            <div className="pt-12 text-center text-sm text-muted-foreground">
              Apenas administradores podem ver os relatórios por barbeiro.
            </div>
          )}
        </TabsContent>
        <TabsContent value="metas"><MetasTab barbershop={ctx.barbershop} isMaster={ctx.isMaster} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Financeiro;
