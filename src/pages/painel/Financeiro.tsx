import { useState, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Package, Receipt, ChartPie, Target, TrendingUp, Sparkles, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Caixa from './Caixa';
import Produtos from './Produtos';
import Despesas from './Despesas';
import Relatorios from './Relatorios';

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
  { value: 'metas', label: 'Metas', icon: Target },
];

const ResumoTab = ({ barbershop, isMaster }: { barbershop: any; isMaster: boolean }) => {
  const monthStart = startOfMonth(new Date()).toISOString();
  const monthEnd = endOfMonth(new Date()).toISOString();
  const dateStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const endDateStr = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['financeiro-resumo', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;
      const [{ data: apts }, { data: sales }, { data: exps }] = await Promise.all([
        supabase
          .from('appointments')
          .select('services(price)')
          .eq('barbershop_id', barbershop.id)
          .eq('status', 'completed')
          .gte('start_time', monthStart)
          .lte('start_time', monthEnd),
        supabase
          .from('product_sales')
          .select('total_amount, unit_cost, quantity')
          .eq('barbershop_id', barbershop.id)
          .gte('sold_at', monthStart)
          .lte('sold_at', monthEnd),
        supabase
          .from('expenses')
          .select('amount')
          .eq('barbershop_id', barbershop.id)
          .gte('expense_date', dateStr)
          .lte('expense_date', endDateStr),
      ]);
      const services = (apts || []).reduce((s, a: any) => s + Number(a.services?.price || 0), 0);
      const products = (sales || []).reduce((s, x: any) => s + Number(x.total_amount || 0), 0);
      const cogs = (sales || []).reduce((s, x: any) => s + Number(x.unit_cost || 0) * Number(x.quantity || 0), 0);
      const expenses = (exps || []).reduce((s, e: any) => s + Number(e.amount || 0), 0);
      return { services, products, cogs, expenses };
    },
    enabled: !!barbershop?.id,
  });

  const total = (data?.services || 0) + (data?.products || 0);
  const profit = total - (data?.expenses || 0) - (data?.cogs || 0);
  const monthLabel = format(new Date(), 'MMMM', { locale: ptBR });

  return (
    <div className="space-y-4 pt-4">
      <Card className="overflow-hidden">
        <CardContent
          className="p-5"
          style={{
            background: profit >= 0
              ? 'linear-gradient(135deg, hsl(var(--primary) / 0.08), transparent)'
              : 'linear-gradient(135deg, hsl(var(--destructive) / 0.08), transparent)',
          }}
        >
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            Lucro de {monthLabel}
          </p>
          <p className={`text-3xl font-bold tabular-nums ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {isLoading ? '—' : formatCurrency(profit)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Faturamento {formatCurrency(total)} − custos {formatCurrency((data?.expenses || 0) + (data?.cogs || 0))}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <Sparkles className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Serviços</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(data?.services || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <ShoppingCart className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Produtos</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(data?.products || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <Package className="h-4 w-4 text-amber-500 mb-1.5" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Custo produtos</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(data?.cogs || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <Receipt className="h-4 w-4 text-destructive mb-1.5" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Despesas</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(data?.expenses || 0)}</p>
          </CardContent>
        </Card>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('tab') || 'resumo';
  const [tab, setTab] = useState(initial);

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
          <TabsList className="inline-flex h-11 rounded-lg p-1 mx-3 md:mx-0 w-max md:w-full md:grid md:grid-cols-6">
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
        <TabsContent value="metas"><MetasTab barbershop={ctx.barbershop} isMaster={ctx.isMaster} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Financeiro;
