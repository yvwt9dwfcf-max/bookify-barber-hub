import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Plus, Loader2, Trash2, Receipt, TrendingDown, TrendingUp, Repeat, DollarSign, ChartPie as PieChart, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, Tooltip, Cell, PieChart as RePieChart, Pie } from 'recharts';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

interface Expense {
  id: string;
  barbershop_id: string;
  name: string;
  amount: number;
  category: string;
  expense_date: string;
  is_recurring: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'aluguel', label: 'Aluguel', color: '#EF4444' },
  { value: 'produtos', label: 'Produtos', color: '#F59E0B' },
  { value: 'energia', label: 'Energia/Luz', color: '#3B82F6' },
  { value: 'agua', label: 'Água', color: '#06B6D4' },
  { value: 'internet', label: 'Internet', color: '#8B5CF6' },
  { value: 'equipamentos', label: 'Equipamentos', color: '#EC4899' },
  { value: 'marketing', label: 'Marketing', color: '#10B981' },
  { value: 'outros', label: 'Outros', color: '#6B7280' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const PAGE_SIZE = 20;

const Despesas = () => {
  const { barbershop, isMaster } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const location = useLocation();
  const inFin = location.pathname.includes('/painel/financeiro');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filters
  const [filterMonth, setFilterMonth] = useState<string>('all'); // 'all' | 'YYYY-MM'
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openOlder, setOpenOlder] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('outros');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    if (!barbershop?.id || !isMaster) return;
    (supabase.rpc as any)('materialize_recurring_expenses', { _barbershop_id: barbershop.id })
      .then(({ data }: any) => {
        if (data && Number(data) > 0) {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }
      })
      .catch(() => {});
  }, [barbershop?.id, isMaster, queryClient]);

  const monthStart = startOfMonth(new Date()).toISOString();
  const monthEnd = endOfMonth(new Date()).toISOString();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('expense_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Expense[];
    },
    enabled: !!barbershop?.id,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['monthly-revenue', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return 0;
      const { data, error } = await supabase
        .from('appointments')
        .select('services(price)')
        .eq('barbershop_id', barbershop.id)
        .eq('status', 'completed')
        .gte('start_time', monthStart)
        .lte('start_time', monthEnd);
      if (error) throw error;
      return (data || []).reduce((sum: number, apt: any) => sum + Number(apt.services?.price || 0), 0);
    },
    enabled: !!barbershop?.id,
  });

  const monthlyRevenue = revenueData || 0;
  const now = new Date();
  const lastMonth = subMonths(now, 1);

  const monthlyExpenses = useMemo(() => {
    if (!expenses?.length) return 0;
    return expenses
      .filter((e) => isSameMonth(new Date(e.expense_date + 'T12:00:00'), now))
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const profit = monthlyRevenue - monthlyExpenses;

  // Available months for filter
  const availableMonths = useMemo(() => {
    if (!expenses?.length) return [];
    const set = new Set<string>();
    expenses.forEach((e) => set.add(format(new Date(e.expense_date + 'T12:00:00'), 'yyyy-MM')));
    return Array.from(set).sort().reverse();
  }, [expenses]);

  // Filtered list
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((e) => {
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterMonth !== 'all') {
        const m = format(new Date(e.expense_date + 'T12:00:00'), 'yyyy-MM');
        if (m !== filterMonth) return false;
      }
      return true;
    });
  }, [expenses, filterCategory, filterMonth]);

  // Bucketing by period (only when no month filter is set)
  const { thisMonth, lastMonthList, older } = useMemo(() => {
    const a: Expense[] = [], b: Expense[] = [], c: Expense[] = [];
    filteredExpenses.forEach((e) => {
      const d = new Date(e.expense_date + 'T12:00:00');
      if (isSameMonth(d, now)) a.push(e);
      else if (isSameMonth(d, lastMonth)) b.push(e);
      else c.push(e);
    });
    return { thisMonth: a, lastMonthList: b, older: c };
  }, [filteredExpenses]);

  const categoryBreakdown = useMemo(() => {
    if (!thisMonth.length) return [];
    const byCategory: Record<string, number> = {};
    thisMonth.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(byCategory).map(([cat, total]) => {
      const catInfo = CATEGORIES.find((c) => c.value === cat);
      return { name: catInfo?.label || cat, value: total, color: catInfo?.color || '#6B7280' };
    }).sort((a, b) => b.value - a.value);
  }, [thisMonth]);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!barbershop?.id) throw new Error('Barbearia não encontrada');
      const amountNum = parseFloat(amount.replace(',', '.'));
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Valor inválido');
      if (!name.trim()) throw new Error('Nome é obrigatório');

      const payload = {
        barbershop_id: barbershop.id,
        name: name.trim(),
        amount: amountNum,
        category,
        expense_date: expenseDate,
        is_recurring: isRecurring,
      };

      if (editingExpense) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(editingExpense ? 'Despesa atualizada!' : 'Despesa adicionada!');
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar despesa'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Despesa removida!');
    },
    onError: () => toast.error('Erro ao remover despesa'),
  });

  const resetForm = () => {
    setName('');
    setAmount('');
    setCategory('outros');
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
    setIsRecurring(false);
    setEditingExpense(null);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setName(expense.name);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setExpenseDate(expense.expense_date);
    setIsRecurring(expense.is_recurring);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  if (!isMaster) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Acesso restrito</h2>
        <p className="text-muted-foreground">Apenas o administrador pode gerenciar despesas.</p>
      </div>
    );
  }

  // ── Helper to render a single expense row
  const ExpenseRow = ({ expense }: { expense: Expense }) => {
    const catInfo = CATEGORIES.find((c) => c.value === expense.category);
    return (
      <div
        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => openEdit(expense)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: catInfo?.color || '#6B7280' }} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{expense.name}</p>
              {expense.is_recurring && <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {catInfo?.label} • {format(new Date(expense.expense_date + 'T12:00:00'), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-destructive">-{formatCurrency(Number(expense.amount))}</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover despesa?</AlertDialogTitle>
                <AlertDialogDescription>"{expense.name}" será removida permanentemente.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(expense.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };

  // Group rendering
  const renderGrouped = (list: Expense[]) => {
    const grouped: Record<string, Expense[]> = {};
    list.forEach((e) => {
      grouped[e.category] = grouped[e.category] || [];
      grouped[e.category].push(e);
    });
    return Object.entries(grouped)
      .map(([cat, items]) => {
        const info = CATEGORIES.find((c) => c.value === cat);
        const total = items.reduce((s, i) => s + Number(i.amount), 0);
        return { cat, info, items, total };
      })
      .sort((a, b) => b.total - a.total)
      .map(({ cat, info, items, total }) => (
        <div key={cat} className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: info?.color }} />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{info?.label || cat}</span>
              <span className="text-[10px] text-muted-foreground">({items.length})</span>
            </div>
            <span className="text-xs font-bold text-destructive">-{formatCurrency(total)}</span>
          </div>
          <div className="space-y-1.5">
            {items.map((e) => <ExpenseRow key={e.id} expense={e} />)}
          </div>
        </div>
      ));
  };

  const usingMonthFilter = filterMonth !== 'all';
  const flatList = usingMonthFilter ? filteredExpenses.slice(0, visibleCount) : null;

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        {!inFin && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/painel/financeiro?tab=relatorios')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {inFin ? 'Despesas' : 'Controle de Despesas'}
          </h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <Button size="sm" className="btn-primary-gradient" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />
          Nova
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-[11px] text-muted-foreground">Receita</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(monthlyRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 text-destructive mx-auto mb-1" />
            <p className="text-[11px] text-muted-foreground">Despesas</p>
            <p className="text-sm font-bold text-destructive">{formatCurrency(monthlyExpenses)}</p>
          </CardContent>
        </Card>
        <Card className={profit >= 0 ? 'border-primary/20' : 'border-destructive/20'}>
          <CardContent className="p-3 text-center">
            <DollarSign className={`h-4 w-4 mx-auto mb-1 ${profit >= 0 ? 'text-primary' : 'text-destructive'}`} />
            <p className="text-[11px] text-muted-foreground">Lucro</p>
            <p className={`text-sm font-bold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(profit)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Pie (current month) */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-primary" />
              Por categoria · este mês
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[160px] mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {categoryBreakdown.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), '']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {categoryBreakdown.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setVisibleCount(PAGE_SIZE); }}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m}>
                    {format(new Date(m + '-01T12:00:00'), "MMMM 'de' yyyy", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setVisibleCount(PAGE_SIZE); }}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-muted-foreground">Agrupar por categoria</span>
            <Switch checked={groupByCategory} onCheckedChange={setGroupByCategory} />
          </div>
        </CardContent>
      </Card>

      {/* Lists by period */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <PremiumSkeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : !filteredExpenses.length ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          Nenhuma despesa neste filtro.
        </div>
      ) : usingMonthFilter ? (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">
              {format(new Date(filterMonth + '-01T12:00:00'), "MMMM 'de' yyyy", { locale: ptBR })} · {filteredExpenses.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {groupByCategory ? (
              <div className="space-y-4">{renderGrouped(filteredExpenses)}</div>
            ) : (
              <div className="space-y-2">
                {flatList!.map((e) => <ExpenseRow key={e.id} expense={e} />)}
                {filteredExpenses.length > visibleCount && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                    Ver mais ({filteredExpenses.length - visibleCount} restantes)
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {thisMonth.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Este mês</span>
                  <span className="text-xs font-normal text-muted-foreground">{thisMonth.length} item(s)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {groupByCategory ? <div className="space-y-4">{renderGrouped(thisMonth)}</div> : <div className="space-y-2">{thisMonth.map((e) => <ExpenseRow key={e.id} expense={e} />)}</div>}
              </CardContent>
            </Card>
          )}

          {lastMonthList.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Mês passado</span>
                  <span className="text-xs font-normal text-muted-foreground">{lastMonthList.length} item(s)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {groupByCategory ? <div className="space-y-4">{renderGrouped(lastMonthList)}</div> : <div className="space-y-2">{lastMonthList.map((e) => <ExpenseRow key={e.id} expense={e} />)}</div>}
              </CardContent>
            </Card>
          )}

          {older.length > 0 && (
            <Card>
              <Collapsible open={openOlder} onOpenChange={setOpenOlder}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 pt-4 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {openOlder ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        Histórico anterior
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">{older.length} item(s)</span>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-4 pb-4">
                    {(() => {
                      const slice = older.slice(0, visibleCount);
                      return groupByCategory ? (
                        <div className="space-y-4">{renderGrouped(slice)}</div>
                      ) : (
                        <div className="space-y-2">
                          {slice.map((e) => <ExpenseRow key={e.id} expense={e} />)}
                          {older.length > visibleCount && (
                            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                              Ver mais ({older.length - visibleCount} restantes)
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input placeholder="Ex: Aluguel do ponto" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input placeholder="0,00" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Despesa recorrente</Label>
                <p className="text-[10px] text-muted-foreground">Repete automaticamente todo mês</p>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending} className="btn-primary-gradient">
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingExpense ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Despesas;
