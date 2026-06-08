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

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const TABS = [
  { value: 'resumo', label: 'Resumo', icon: TrendingUp },
  { value: 'caixa', label: 'Caixa', icon: Wallet },
  { value: 'produtos', label: 'Produtos', icon: Package },
  { value: 'despesas', label: 'Despesas', icon: Receipt },
  { value: 'comissoes', label: 'Comissões', icon: Percent },
  { value: 'relatorios', label: 'Relatórios', icon: ChartPie },
  { value: 'barbeiros', label: 'Barbeiros', icon: Users },
  { value: 'metas', label: 'Metas', icon: Target },
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
    { label: 'Serviços', value: cur.services, sign: '+' as const },
    { label: 'Produtos', value: cur.products, sign: '+' as const },
    { label: 'Custo de produtos', value: cur.cogs, sign: '−' as const },
    { label: 'Despesas', value: cur.expenses, sign: '−' as const },
  ];
  const maxBar = Math.max(...breakdown.map(b => b.value), 1);

  return (
    <div className="space-y-8 pt-5">
      {/* Lucro — número em destaque, sem cartão pesado */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium">
            Lucro · {monthLabel}
          </p>
          {prevProfit !== 0 && Math.abs(profitDelta) >= 1 && (
            <span className={`text-[11px] font-medium tabular-nums ${profitDelta >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {profitDelta >= 0 ? '+' : '−'}{Math.abs(profitDelta).toFixed(0)}%
            </span>
          )}
        </div>
        <p className={`text-[40px] leading-none font-semibold tabular-nums tracking-tight ${profit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
          {isLoading ? '—' : formatCurrency(profit)}
        </p>
        <p className="text-[11px] text-muted-foreground/80 pt-1">
          {prevProfit !== 0 ? `${prevMonthLabel}: ${formatCurrency(prevProfit)}` : 'Sem dados do mês anterior'}
        </p>
      </div>

      {insights.length > 0 && !isLoading && (
        <div className="space-y-2 border-t border-border/30 pt-4">
          {insights.map((txt, i) => (
            <p key={i} className="text-[12px] text-muted-foreground leading-relaxed">
              {txt}
            </p>
          ))}
        </div>
      )}

      {/* Métricas — blocos limpos com hierarchy tipográfica */}
      <div className="grid grid-cols-3 gap-4 border-y border-border/30 py-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium">Faturamento</p>
          <p className="text-lg font-semibold tabular-nums tracking-tight mt-1.5">{formatCurrency(total)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium">Serviços</p>
          <p className="text-lg font-semibold tabular-nums tracking-tight mt-1.5">{formatCurrency(cur.services)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium">Ticket médio</p>
          <p className="text-lg font-semibold tabular-nums tracking-tight mt-1.5">
            {formatCurrency(avgPerDay)}
          </p>
        </div>
      </div>

      {/* Detalhamento como gráfico de barras minimalista */}
      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium">
          Detalhamento
        </p>
        <div className="space-y-3.5">
          {breakdown.map((b) => {
            const pct = (b.value / maxBar) * 100;
            const isNeg = b.sign === '−';
            return (
              <div key={b.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-foreground/80">{b.label}</span>
                  <span className={`text-[13px] font-semibold tabular-nums ${isNeg ? 'text-destructive/90' : 'text-foreground'}`}>
                    {isNeg ? '−' : ''}{formatCurrency(b.value)}
                  </span>
                </div>
                <div className="relative h-[6px] w-full rounded-full bg-border/40 overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${isNeg ? 'bg-destructive/60' : 'bg-primary'}`}
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
  const [tab, setTab] = useState(initial);

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
    setTab(v);
    setSearchParams({ tab: v }, { replace: true });
  };

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
          <TabsList className="inline-flex h-11 rounded-lg p-1 mx-3 md:mx-0 w-max md:w-full md:grid md:grid-cols-8">
            {TABS.map((t) => (
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
