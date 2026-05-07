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
import { Wallet, Package, Receipt, ChartPie, Target, TrendingUp, TrendingDown, Sparkles, ShoppingCart, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Caixa from './Caixa';
import Produtos from './Produtos';
import Despesas from './Despesas';
import Relatorios from './Relatorios';
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

  return (
    <div className="space-y-5 pt-4">
      <Card className="overflow-hidden border-0 shadow-card">
        <CardContent
          className="p-6"
          style={{
            background: profit >= 0
              ? 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.02))'
              : 'linear-gradient(135deg, hsl(var(--destructive) / 0.12), hsl(var(--destructive) / 0.02))',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
              Lucro de {monthLabel}
            </p>
            {prevProfit !== 0 && Math.abs(profitDelta) >= 1 && (
              <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${profitDelta >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {profitDelta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(profitDelta).toFixed(0)}%
              </div>
            )}
          </div>
          <p className={`text-4xl font-bold tabular-nums tracking-tight ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {isLoading ? '—' : formatCurrency(profit)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {prevProfit !== 0 ? `${prevMonthLabel}: ${formatCurrency(prevProfit)}` : 'Sem dados do mês anterior'}
          </p>
        </CardContent>
      </Card>

      {insights.length > 0 && !isLoading && (
        <div className="space-y-1.5">
          {insights.map((txt, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-muted/40">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80 leading-relaxed">{txt}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Faturamento</p>
            </div>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(total)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Serviços {formatCurrency(cur.services)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Custos</p>
            </div>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(cur.expenses + cur.cogs)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Despesas {formatCurrency(cur.expenses)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Detalhamento</p>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> Serviços</span>
            <span className="font-semibold tabular-nums">{formatCurrency(cur.services)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><ShoppingCart className="h-3.5 w-3.5 text-primary" /> Produtos</span>
            <span className="font-semibold tabular-nums">{formatCurrency(cur.products)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><Package className="h-3.5 w-3.5 text-amber-500" /> Custo de produtos</span>
            <span className="font-semibold tabular-nums">−{formatCurrency(cur.cogs)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><Receipt className="h-3.5 w-3.5 text-destructive" /> Despesas</span>
            <span className="font-semibold tabular-nums">−{formatCurrency(cur.expenses)}</span>
          </div>
        </CardContent>
      </Card>
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
          <TabsList className="inline-flex h-11 rounded-lg p-1 mx-3 md:mx-0 w-max md:w-full md:grid md:grid-cols-7">
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
