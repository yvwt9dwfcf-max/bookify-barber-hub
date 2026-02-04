import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BarChart3, TrendingUp, Users, Scissors, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type PeriodFilter = 'today' | '7days' | '30days';

interface OutletContext {
  barber: { id: string; barbershop_id: string } | null;
  barbershop: { id: string; name: string; monthly_goal?: number | null } | null;
  isMaster: boolean;
}

const Relatorios = () => {
  const { barbershop, isMaster } = useOutletContext<OutletContext>();
  const [period, setPeriod] = useState<PeriodFilter>('7days');
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalValue, setGoalValue] = useState('');
  const queryClient = useQueryClient();

  // Fetch barbershop with monthly_goal
  const { data: barbershopData } = useQuery({
    queryKey: ['barbershop-goal', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;
      const { data, error } = await supabase
        .from('barbershops')
        .select('id, monthly_goal')
        .eq('id', barbershop.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id && isMaster
  });

  const monthlyGoal = barbershopData?.monthly_goal ?? null;

  // Mutation to update monthly goal
  const updateGoalMutation = useMutation({
    mutationFn: async (newGoal: number | null) => {
      if (!barbershop?.id) throw new Error('Barbearia não encontrada');
      const { error } = await supabase
        .from('barbershops')
        .update({ monthly_goal: newGoal })
        .eq('id', barbershop.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-goal'] });
      toast.success('Meta atualizada com sucesso!');
      setGoalDialogOpen(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar meta');
    }
  });

  const handleSaveGoal = () => {
    const value = parseFloat(goalValue.replace(',', '.'));
    if (isNaN(value) || value < 0) {
      toast.error('Informe um valor válido');
      return;
    }
    updateGoalMutation.mutate(value > 0 ? value : null);
  };

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case '7days':
        startDate = startOfDay(subDays(now, 6));
        endDate = endOfDay(now);
        break;
      case '30days':
        // Changed: Use current month (1st to last day)
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfDay(subDays(now, 6));
        endDate = endOfDay(now);
    }
    
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    };
  }, [period]);

  // Fetch completed appointments with services and barbers
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['reports-appointments', barbershop?.id, dateRange],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          status,
          barber_id,
          service_id,
          barbers!inner(id, name),
          services(id, name, price)
        `)
        .eq('barbershop_id', barbershop.id)
        .eq('status', 'completed')
        .gte('start_time', dateRange.start)
        .lte('start_time', dateRange.end);

      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster
  });

  // Calculate revenue data for chart
  const revenueData = useMemo(() => {
    if (!appointments?.length) return [];

    const revenueByDay: Record<string, number> = {};
    
    appointments.forEach((apt) => {
      const day = format(new Date(apt.start_time), 'dd/MM', { locale: ptBR });
      const price = apt.services?.price || 0;
      revenueByDay[day] = (revenueByDay[day] || 0) + Number(price);
    });

    return Object.entries(revenueByDay).map(([day, revenue]) => ({
      day,
      revenue
    }));
  }, [appointments]);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    if (!appointments?.length) return 0;
    return appointments.reduce((sum, apt) => sum + Number(apt.services?.price || 0), 0);
  }, [appointments]);

  // Calculate top services
  const topServices = useMemo(() => {
    if (!appointments?.length) return [];

    const serviceCount: Record<string, { name: string; count: number }> = {};
    
    appointments.forEach((apt) => {
      if (apt.services?.name) {
        const serviceName = apt.services.name;
        if (!serviceCount[serviceName]) {
          serviceCount[serviceName] = { name: serviceName, count: 0 };
        }
        serviceCount[serviceName].count++;
      }
    });

    return Object.values(serviceCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [appointments]);

  // Calculate barber performance
  const barberPerformance = useMemo(() => {
    if (!appointments?.length) return [];

    const barberCount: Record<string, { name: string; count: number }> = {};
    
    appointments.forEach((apt) => {
      const barberName = (apt.barbers as any)?.name;
      if (barberName) {
        if (!barberCount[barberName]) {
          barberCount[barberName] = { name: barberName, count: 0 };
        }
        barberCount[barberName].count++;
      }
    });

    return Object.values(barberCount)
      .sort((a, b) => b.count - a.count);
  }, [appointments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!isMaster) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header - more compact */}
      <div className="pb-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Relatórios & Desempenho
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualize o desempenho da sua barbearia
        </p>
      </div>

      {/* Bloco 1 - Faturamento */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Faturamento
            </CardTitle>
            <div className="flex gap-1.5">
              <Button
                variant={period === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('today')}
                className={`h-7 px-2.5 text-xs ${period === 'today' ? 'btn-primary-gradient' : ''}`}
              >
                Hoje
              </Button>
              <Button
                variant={period === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('7days')}
                className={`h-7 px-2.5 text-xs ${period === '7days' ? 'btn-primary-gradient' : ''}`}
              >
                7 dias
              </Button>
              <Button
                variant={period === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('30days')}
                className={`h-7 px-2.5 text-xs ${period === '30days' ? 'btn-primary-gradient' : ''}`}
              >
                30 dias
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-[180px] w-full" />
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total do período</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
                </div>
                {period === '30days' && (
                  <div className="text-right">
                    {monthlyGoal ? (
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Meta do mês</p>
                          <p className="text-sm font-semibold">{formatCurrency(monthlyGoal)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setGoalValue(monthlyGoal.toString());
                            setGoalDialogOpen(true);
                          }}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Target className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGoalValue('');
                          setGoalDialogOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs"
                      >
                        <Target className="h-3.5 w-3.5 mr-1" />
                        Definir meta
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {revenueData.length > 0 ? (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="url(#primaryGradient)" 
                        radius={[4, 4, 0, 0]}
                      />
                      {period === '30days' && monthlyGoal && (
                        <ReferenceLine 
                          y={monthlyGoal} 
                          stroke="hsl(var(--destructive))" 
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{
                            value: 'Meta',
                            position: 'right',
                            fill: 'hsl(var(--destructive))',
                            fontSize: 11
                          }}
                        />
                      )}
                      <defs>
                        <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum agendamento concluído no período selecionado.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Grid for services and barber performance */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bloco 2 - Serviços mais vendidos */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="h-4 w-4 text-primary" />
              Serviços mais vendidos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            ) : topServices.length > 0 ? (
              <div className="space-y-2">
                {topServices.map((service, index) => (
                  <div 
                    key={service.name}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-primary">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {service.count} {service.count === 1 ? 'atendimento' : 'atendimentos'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">
                Nenhum serviço realizado no período.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 3 - Desempenho dos barbeiros */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Desempenho dos barbeiros
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            ) : barberPerformance.length > 0 ? (
              <div className="space-y-2">
                {barberPerformance.map((barber, index) => (
                  <div 
                    key={barber.name}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-primary">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium">{barber.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {barber.count} {barber.count === 1 ? 'atendimento' : 'atendimentos'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">
                Nenhum atendimento realizado no período.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para definir meta mensal */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Definir meta mensal
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm text-muted-foreground mb-2 block">
              Valor da meta (R$)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 5000"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground mt-2">
              A meta será exibida como linha de referência no gráfico mensal.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setGoalDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveGoal}
              disabled={updateGoalMutation.isPending}
              className="btn-primary-gradient"
            >
              {updateGoalMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Relatorios;