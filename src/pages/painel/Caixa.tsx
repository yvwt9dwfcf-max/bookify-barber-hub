import { useMemo, useState } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Banknote, Smartphone, CreditCard, Sparkles, Package, Receipt,
  ChevronLeft, ChevronRight, Target, Plus, ShoppingCart,
} from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContextType {
  barber: Barber | null;
  barbershop: (Barbershop & { monthly_goal?: number | null; products_monthly_goal?: number | null }) | null;
  isMaster: boolean;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PAYMENT_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  dinheiro: { label: 'Dinheiro', icon: Banknote, color: '#22C55E' },
  pix: { label: 'Pix', icon: Smartphone, color: '#3B82F6' },
  debito: { label: 'Débito', icon: CreditCard, color: '#A855F7' },
  credito: { label: 'Crédito', icon: CreditCard, color: '#F59E0B' },
};

const Caixa = () => {
  const { barbershop, isMaster } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const location = useLocation();
  const inFin = location.pathname.includes('/painel/financeiro');
  const goTab = (tab: string) => navigate(`/painel/financeiro?tab=${tab}`);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dayStart = startOfDay(selectedDate).toISOString();
  const dayEnd = endOfDay(selectedDate).toISOString();
  const monthStart = startOfMonth(selectedDate).toISOString();
  const monthEnd = endOfMonth(selectedDate).toISOString();

  // === Day data ===
  const { data: appointments, isLoading: l1 } = useQuery({
    queryKey: ['cash-flow', 'apps', barbershop?.id, dayStart],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, customer_name, status, payment_method, start_time, services(name, price)')
        .eq('barbershop_id', barbershop.id)
        .eq('status', 'completed')
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const { data: sales, isLoading: l2 } = useQuery({
    queryKey: ['cash-flow', 'sales', barbershop?.id, dayStart],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from('product_sales')
        .select('id, total_amount, quantity, payment_method, sold_at, customer_name, products(name)')
        .eq('barbershop_id', barbershop.id)
        .gte('sold_at', dayStart)
        .lte('sold_at', dayEnd)
        .order('sold_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const { data: expenses, isLoading: l3 } = useQuery({
    queryKey: ['cash-flow', 'exp', barbershop?.id, dayStart],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('id, name, amount, category, expense_date')
        .eq('barbershop_id', barbershop.id)
        .eq('expense_date', format(selectedDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  // === Month data for goals/projection ===
  const { data: monthData } = useQuery({
    queryKey: ['cash-flow', 'month', barbershop?.id, monthStart],
    queryFn: async () => {
      if (!barbershop?.id) return { servicesRevenue: 0, productsRevenue: 0 };
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
        servicesRevenue: (a || []).reduce((sum, x: any) => sum + Number(x.services?.price || 0), 0),
        productsRevenue: (s || []).reduce((sum, x: any) => sum + Number(x.total_amount || 0), 0),
      };
    },
    enabled: !!barbershop?.id,
  });

  // === Calculations ===
  const servicesIncome = useMemo(
    () => (appointments || []).reduce((s, a: any) => s + Number(a.services?.price || 0), 0),
    [appointments]
  );
  const productsIncome = useMemo(
    () => (sales || []).reduce((s, x: any) => s + Number(x.total_amount || 0), 0),
    [sales]
  );
  const totalIncome = servicesIncome + productsIncome;
  const totalExpenses = useMemo(
    () => (expenses || []).reduce((s, e: any) => s + Number(e.amount || 0), 0),
    [expenses]
  );
  const balance = totalIncome - totalExpenses;

  // Payment method breakdown
  const byPayment = useMemo(() => {
    const map: Record<string, number> = {};
    (appointments || []).forEach((a: any) => {
      const k = a.payment_method || 'sem_metodo';
      map[k] = (map[k] || 0) + Number(a.services?.price || 0);
    });
    (sales || []).forEach((s: any) => {
      const k = s.payment_method || 'sem_metodo';
      map[k] = (map[k] || 0) + Number(s.total_amount || 0);
    });
    return Object.entries(map).filter(([k]) => k !== 'sem_metodo');
  }, [appointments, sales]);

  // Monthly goal projection
  const monthlyGoal = Number(barbershop?.monthly_goal || 0);
  const productsGoal = Number(barbershop?.products_monthly_goal || 0);
  const monthRevenue = (monthData?.servicesRevenue || 0) + (monthData?.productsRevenue || 0);
  const dayOfMonth = selectedDate.getDate();
  const daysInMonth = endOfMonth(selectedDate).getDate();
  const projection = dayOfMonth > 0 ? (monthRevenue / dayOfMonth) * daysInMonth : 0;
  const goalPct = monthlyGoal > 0 ? Math.min(100, (monthRevenue / monthlyGoal) * 100) : 0;
  const productsPct = productsGoal > 0 ? Math.min(100, ((monthData?.productsRevenue || 0) / productsGoal) * 100) : 0;

  const isLoading = l1 || l2 || l3;

  return (
    <div className="space-y-5 animate-page-enter pb-20">
      {/* Header */}
      {!inFin && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Caixa
            </h1>
            <p className="text-xs text-muted-foreground">Movimentação financeira da barbearia</p>
          </div>
          <Button size="sm" onClick={() => goTab('produtos')} className="btn-primary-gradient">
            <ShoppingCart className="h-4 w-4 mr-1" />
            Vender
          </Button>
        </div>
      )}

      {/* Date navigator */}
      <Card>
        <CardContent className="p-2 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelectedDate((d) => addDays(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="flex flex-col items-center min-w-0 px-2"
          >
            <p className="text-sm font-bold">
              {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {format(selectedDate, 'EEEE', { locale: ptBR })}
            </p>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            disabled={isToday(selectedDate)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Balance hero */}
      <Card className="overflow-hidden">
        <CardContent
          className="p-5 relative"
          style={{
            background: balance >= 0
              ? 'linear-gradient(135deg, hsl(var(--primary) / 0.08), transparent)'
              : 'linear-gradient(135deg, hsl(var(--destructive) / 0.08), transparent)',
          }}
        >
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            Saldo do dia
          </p>
          {isLoading ? (
            <PremiumSkeleton className="h-9 w-40" />
          ) : (
            <p className={`text-3xl font-bold tabular-nums ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(balance)}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/40">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <ArrowUpRight className="h-3 w-3 text-primary" />
                Entradas
              </div>
              <p className="text-base font-bold text-primary tabular-nums">{formatCurrency(totalIncome)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <ArrowDownRight className="h-3 w-3 text-destructive" />
                Saídas
              </div>
              <p className="text-base font-bold text-destructive tabular-nums">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income breakdown */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="cursor-pointer transition-transform active:scale-[0.98]">
          <CardContent className="p-3">
            <Sparkles className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Serviços</p>
            <p className="text-base font-bold tabular-nums">{formatCurrency(servicesIncome)}</p>
            <p className="text-[10px] text-muted-foreground">{appointments?.length || 0} atendimentos</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-transform active:scale-[0.98]"
          onClick={() => navigate('/painel/produtos')}
        >
          <CardContent className="p-3">
            <Package className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Produtos</p>
            <p className="text-base font-bold tabular-nums">{formatCurrency(productsIncome)}</p>
            <p className="text-[10px] text-muted-foreground">{sales?.length || 0} vendas</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment methods */}
      {byPayment.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Por forma de pagamento
            </p>
            <div className="space-y-2">
              {byPayment.map(([method, amount]) => {
                const meta = PAYMENT_LABELS[method] || { label: method, icon: Wallet, color: '#6B7280' };
                const Icon = meta.icon;
                const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
                return (
                  <div key={method}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                        <span className="font-medium">{meta.label}</span>
                      </div>
                      <span className="font-bold tabular-nums">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly goals & projection (Master only) */}
      {isMaster && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-wider font-semibold">
                Mês de {format(selectedDate, 'MMMM', { locale: ptBR })}
              </p>
            </div>

            {monthlyGoal > 0 ? (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Meta total</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(monthRevenue)} <span className="text-muted-foreground">/ {formatCurrency(monthlyGoal)}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all" style={{ width: `${goalPct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Projeção: <span className="font-semibold text-foreground">{formatCurrency(projection)}</span> até o fim do mês
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/painel/relatorios')}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Definir meta mensal
              </Button>
            )}

            {productsGoal > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Meta de produtos</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(monthData?.productsRevenue || 0)} <span className="text-muted-foreground">/ {formatCurrency(productsGoal)}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all" style={{ width: `${productsPct}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Movements list */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">
          Movimentações do dia
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <PremiumSkeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (totalIncome === 0 && totalExpenses === 0) ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wallet className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada nesse dia</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {(sales || []).map((s: any) => (
              <Card key={`s-${s.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {s.products?.name || 'Produto'} <span className="text-muted-foreground">×{s.quantity}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(s.sold_at), 'HH:mm')} • {PAYMENT_LABELS[s.payment_method]?.label || s.payment_method}
                      {s.customer_name && ` • ${s.customer_name}`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary tabular-nums">+{formatCurrency(Number(s.total_amount))}</span>
                </CardContent>
              </Card>
            ))}
            {(appointments || []).map((a: any) => (
              <Card key={`a-${a.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.services?.name || 'Atendimento'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {format(new Date(a.start_time), 'HH:mm')} • {a.customer_name}
                      {a.payment_method && ` • ${PAYMENT_LABELS[a.payment_method]?.label || a.payment_method}`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary tabular-nums">+{formatCurrency(Number(a.services?.price || 0))}</span>
                </CardContent>
              </Card>
            ))}
            {(expenses || []).map((e: any) => (
              <Card key={`e-${e.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <Receipt className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{e.category}</p>
                  </div>
                  <span className="text-sm font-bold text-destructive tabular-nums">-{formatCurrency(Number(e.amount))}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="outline" onClick={() => navigate('/painel/produtos')}>
          <Package className="h-4 w-4 mr-1.5" />
          Produtos
        </Button>
        <Button variant="outline" onClick={() => navigate('/painel/despesas')}>
          <Receipt className="h-4 w-4 mr-1.5" />
          Despesas
        </Button>
      </div>
    </div>
  );
};

export default Caixa;
