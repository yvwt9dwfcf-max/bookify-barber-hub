import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Loader2, Trash2, Receipt, TrendingDown, TrendingUp, Repeat, DollarSign, PieChart } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie } from 'recharts';

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

const Despesas = () => {
  const { barbershop, isMaster } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const location = useLocation();
  const inFin = location.pathname.includes('/painel/financeiro');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('outros');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);

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
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Expense[];
    },
    enabled: !!barbershop?.id,
  });

  // Revenue query for profit calculation
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

  const monthlyExpenses = useMemo(() => {
    if (!expenses?.length) return 0;
    const now = new Date();
    return expenses
      .filter((e) => {
        const eDate = new Date(e.expense_date);
        return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const profit = monthlyRevenue - monthlyExpenses;

  const categoryBreakdown = useMemo(() => {
    if (!expenses?.length) return [];
    const now = new Date();
    const monthExpenses = expenses.filter((e) => {
      const eDate = new Date(e.expense_date);
      return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear();
    });
    const byCategory: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(byCategory).map(([cat, total]) => {
      const catInfo = CATEGORIES.find((c) => c.value === cat);
      return { name: catInfo?.label || cat, value: total, color: catInfo?.color || '#6B7280' };
    }).sort((a, b) => b.value - a.value);
  }, [expenses]);

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
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
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
            <p className={`text-sm font-bold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-primary" />
              Despesas por categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-[180px] mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
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

      {/* Expenses List */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base">Todas as despesas</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <PremiumSkeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !expenses?.length ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhuma despesa registrada. Clique em "Nova" para começar.
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => {
                const catInfo = CATEGORIES.find((c) => c.value === expense.category);
                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => openEdit(expense)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: catInfo?.color || '#6B7280' }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{expense.name}</p>
                          {expense.is_recurring && (
                            <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {catInfo?.label} • {format(new Date(expense.expense_date + 'T12:00:00'), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-destructive">
                        -{formatCurrency(Number(expense.amount))}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover despesa?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{expense.name}" será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(expense.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
              <Input
                placeholder="0,00"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
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
                <p className="text-[10px] text-muted-foreground">Marca como gasto fixo mensal</p>
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
