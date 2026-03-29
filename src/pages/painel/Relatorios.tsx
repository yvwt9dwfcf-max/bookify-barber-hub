import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartPie as BarChart3, TrendingUp, TrendingDown, UsersRound as Users, Sparkles as Scissors, Target, Download, Minus, Timer as Clock, CircleX as XCircle, DollarSign, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, subMonths, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

type PeriodFilter = 'today' | '7days' | '30days';

interface OutletContext {
  barber: { id: string; barbershop_id: string; name?: string } | null;
  barbershop: { id: string; name: string; monthly_goal?: number | null } | null;
  isMaster: boolean;
}

const PIE_COLORS = ['#22C55E', '#F59E0B', '#4ADE80', '#EF4444', '#A1A1A1'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// ─── Reusable report content component ───
interface ReportContentProps {
  appointments: any[];
  allAppointments: any[];
  isLoading: boolean;
  period: PeriodFilter;
  dateRange: { start: string; end: string; startDate: Date; endDate: Date };
  showRanking?: boolean;
  showGoal?: boolean;
  monthlyGoal?: number | null;
  prevMonthRevenue?: number;
  onOpenGoalDialog?: () => void;
}

const ReportContent = ({
  appointments,
  allAppointments,
  isLoading,
  period,
  dateRange,
  showRanking = false,
  showGoal = false,
  monthlyGoal,
  prevMonthRevenue = 0,
  onOpenGoalDialog,
}: ReportContentProps) => {
  const totalRevenue = useMemo(() => {
    if (!appointments?.length) return 0;
    return appointments.reduce((sum: number, apt: any) => sum + Number(apt.services?.price || 0), 0);
  }, [appointments]);

  const totalCompleted = appointments?.length || 0;
  const ticketMedio = totalCompleted > 0 ? totalRevenue / totalCompleted : 0;

  const cancellationRate = useMemo(() => {
    if (!allAppointments?.length) return 0;
    const cancelled = allAppointments.filter((a: any) => a.status === 'cancelled').length;
    return Math.round((cancelled / allAppointments.length) * 100);
  }, [allAppointments]);

  const peakHours = useMemo(() => {
    if (!allAppointments?.length) return [];
    const hourCount: Record<number, number> = {};
    allAppointments.filter((a: any) => a.status !== 'cancelled').forEach((apt: any) => {
      const hour = new Date(apt.start_time).getHours();
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });
    return Object.entries(hourCount)
      .map(([hour, count]) => ({ hour: `${hour}h`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allAppointments]);

  const revenueData = useMemo(() => {
    if (period === '30days') {
      const total = appointments?.reduce((sum: number, apt: any) => sum + Number(apt.services?.price || 0), 0) || 0;
      const monthName = format(dateRange.startDate, 'MMMM', { locale: ptBR });
      return [{ day: monthName.charAt(0).toUpperCase() + monthName.slice(1), revenue: total }];
    }
    const allDays = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
    const revenueByDay: Record<string, number> = {};
    appointments?.forEach((apt: any) => {
      const dayKey = format(new Date(apt.start_time), 'yyyy-MM-dd');
      revenueByDay[dayKey] = (revenueByDay[dayKey] || 0) + Number(apt.services?.price || 0);
    });
    return allDays.map((day) => ({
      day: format(day, 'dd/MM', { locale: ptBR }),
      revenue: revenueByDay[format(day, 'yyyy-MM-dd')] || 0
    }));
  }, [appointments, dateRange, period]);

  const topServices = useMemo(() => {
    if (!appointments?.length) return [];
    const serviceCount: Record<string, { name: string; count: number }> = {};
    appointments.forEach((apt: any) => {
      if (apt.services?.name) {
        const sn = apt.services.name;
        if (!serviceCount[sn]) serviceCount[sn] = { name: sn, count: 0 };
        serviceCount[sn].count++;
      }
    });
    return Object.values(serviceCount).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [appointments]);

  const pieChartData = useMemo(() => {
    if (!topServices.length) return [];
    const total = topServices.reduce((sum, s) => sum + s.count, 0);
    return topServices.map((s) => ({ name: s.name, value: s.count, percentage: ((s.count / total) * 100).toFixed(1) }));
  }, [topServices]);

  const barberPerformance = useMemo(() => {
    if (!appointments?.length || !showRanking) return [];
    const barberCount: Record<string, { name: string; count: number }> = {};
    appointments.forEach((apt: any) => {
      const barberName = (apt.barbers as any)?.name;
      if (barberName) {
        if (!barberCount[barberName]) barberCount[barberName] = { name: barberName, count: 0 };
        barberCount[barberName].count++;
      }
    });
    return Object.values(barberCount).sort((a, b) => b.count - a.count);
  }, [appointments, showRanking]);

  const periodLabel = period === 'today' ? 'Hoje' : period === '7days' ? '7 dias' : 'Mês';

  return (
    <div className="space-y-4">
      {/* Faturamento */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Faturamento
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2">
          {isLoading ? (
            <div className="space-y-3">
              <PremiumSkeleton className="h-6 w-28" />
              <PremiumSkeleton className="h-[180px] w-full" />
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total do período</p>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
                    {period === '30days' && prevMonthRevenue > 0 && (() => {
                      const diff = totalRevenue - prevMonthRevenue;
                      const pct = ((diff / prevMonthRevenue) * 100).toFixed(1);
                      const isUp = diff > 0;
                      const isEqual = diff === 0;
                      return (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium pb-0.5 ${isEqual ? 'text-muted-foreground' : isUp ? 'text-primary' : 'text-destructive'}`}>
                          {isEqual ? <Minus className="h-3 w-3" /> : isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isEqual ? '0%' : `${isUp ? '+' : ''}${pct}%`}
                        </span>
                      );
                    })()}
                  </div>
                  {period === '30days' && prevMonthRevenue > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">vs mês anterior: {formatCurrency(prevMonthRevenue)}</p>
                  )}
                </div>
                {showGoal && period === '30days' && (
                  <div className="text-right">
                    {monthlyGoal ? (
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Meta do mês</p>
                          <p className="text-sm font-semibold">{formatCurrency(monthlyGoal)}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onOpenGoalDialog} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                          <Target className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={onOpenGoalDialog} className="h-7 px-2.5 text-xs">
                        <Target className="h-3.5 w-3.5 mr-1" />
                        Definir meta
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar for monthly goal */}
              {showGoal && period === '30days' && monthlyGoal && monthlyGoal > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progresso da meta</span>
                    <span className={`text-xs font-semibold ${(totalRevenue / monthlyGoal) >= 1 ? 'text-primary' : (totalRevenue / monthlyGoal) >= 0.7 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {Math.min((totalRevenue / monthlyGoal) * 100, 999).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${(totalRevenue / monthlyGoal) >= 1 ? 'bg-primary' : (totalRevenue / monthlyGoal) >= 0.7 ? 'bg-yellow-500' : 'bg-muted-foreground/50'}`}
                      style={{ width: `${Math.min((totalRevenue / monthlyGoal) * 100, 100)}%` }}
                    />
                  </div>
                  {(totalRevenue / monthlyGoal) >= 1 && <p className="text-xs text-primary mt-1 font-medium">🎉 Meta atingida!</p>}
                </div>
              )}

              {revenueData.length > 0 ? (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(value) => `R$${value}`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Faturamento']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Bar dataKey="revenue" fill="url(#primaryGradient)" radius={[4, 4, 0, 0]} />
                      {showGoal && period === '30days' && monthlyGoal && (
                        <ReferenceLine y={monthlyGoal} stroke="hsl(var(--destructive))" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Meta', position: 'right', fill: 'hsl(var(--destructive))', fontSize: 11 }} />
                      )}
                      <defs>
                        <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22C55E" />
                          <stop offset="100%" stopColor="#16A34A" />
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

      {/* Ticket Médio + Cancelamento + Pico */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" />
              Ticket médio
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            {isLoading ? <PremiumSkeleton className="h-16 w-full" /> : (
              <div>
                <div className="text-3xl font-bold text-primary">{formatCurrency(ticketMedio)}</div>
                <p className="text-xs text-muted-foreground mt-1">{totalCompleted} atendimento{totalCompleted !== 1 ? 's' : ''} concluído{totalCompleted !== 1 ? 's' : ''}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4 text-destructive" />
              Cancelamentos
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">Porcentagem de agendamentos cancelados no período.</TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            {isLoading ? <PremiumSkeleton className="h-16 w-full" /> : (
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-destructive">{cancellationRate}%</div>
                <div className="text-xs text-muted-foreground">{allAppointments?.filter((a: any) => a.status === 'cancelled').length || 0} de {allAppointments?.length || 0}</div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Horários de pico
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            {isLoading ? <PremiumSkeleton className="h-16 w-full" /> : peakHours.length > 0 ? (
              <div className="space-y-1.5">
                {peakHours.map((ph, i) => (
                  <div key={ph.hour} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">#{i + 1}</span>
                      <span className="text-sm font-medium">{ph.hour}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{ph.count} agend.</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground text-sm">Nenhum dado no período.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Services + Ranking */}
      <div className={`grid gap-4 ${showRanking ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="h-4 w-4 text-primary" />
              Serviços mais vendidos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="flex items-center justify-between"><PremiumSkeleton className="h-4 w-28" /><PremiumSkeleton className="h-4 w-14" /></div>)}</div>
            ) : topServices.length > 0 ? (
              <>
                <div className="h-[180px] mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                        {pieChartData.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [`${value} atend.`, name]} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {pieChartData.map((service, index) => (
                    <div key={service.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span className="text-sm font-medium truncate">{service.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{service.percentage}% ({service.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">Nenhum serviço realizado no período.</div>
            )}
          </CardContent>
        </Card>

        {showRanking && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Ranking dos barbeiros
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              {isLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="flex items-center justify-between"><PremiumSkeleton className="h-4 w-28" /><PremiumSkeleton className="h-4 w-14" /></div>)}</div>
              ) : barberPerformance.length > 0 ? (
                <div className="space-y-2">
                  {barberPerformance.map((barber, index) => {
                    const barberRevenue = appointments.filter((a: any) => (a.barbers as any)?.name === barber.name).reduce((sum: number, a: any) => sum + Number(a.services?.price || 0), 0);
                    return (
                      <div key={barber.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>{`${index + 1}º`}</span>
                          <div>
                            <span className="text-sm font-medium">{barber.name}</span>
                            <p className="text-[10px] text-muted-foreground">{formatCurrency(barberRevenue)}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{barber.count} atend.</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground text-sm">Nenhum atendimento realizado no período.</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ───
const Relatorios = () => {
  const { barber, barbershop, isMaster } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>('7days');
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalValue, setGoalValue] = useState('');
  const [goalTarget, setGoalTarget] = useState<'barbershop' | 'barber'>('barbershop');
  const [masterTab, setMasterTab] = useState('barbearia');
  const queryClient = useQueryClient();

  const { data: barbershopData } = useQuery({
    queryKey: ['barbershop-goal', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;
      const { data, error } = await supabase.from('barbershops').select('id, monthly_goal').eq('id', barbershop.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id && isMaster
  });

  const monthlyGoal = barbershopData?.monthly_goal ?? null;

  // Barber personal goal
  const { data: barberData } = useQuery({
    queryKey: ['barber-goal', barber?.id],
    queryFn: async () => {
      if (!barber?.id) return null;
      const { data, error } = await supabase.from('barbers').select('id, monthly_goal').eq('id', barber.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!barber?.id
  });
  const barberGoal = barberData?.monthly_goal ?? null;

  const updateGoalMutation = useMutation({
    mutationFn: async (newGoal: number | null) => {
      if (goalTarget === 'barber') {
        if (!barber?.id) throw new Error('Barbeiro não encontrado');
        const { error } = await supabase.from('barbers').update({ monthly_goal: newGoal } as any).eq('id', barber.id);
        if (error) throw error;
      } else {
        if (!barbershop?.id) throw new Error('Barbearia não encontrada');
        const { error } = await supabase.from('barbershops').update({ monthly_goal: newGoal }).eq('id', barbershop.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barbershop-goal'] });
      queryClient.invalidateQueries({ queryKey: ['barber-goal'] });
      toast.success('Meta atualizada com sucesso!');
      setGoalDialogOpen(false);
    },
    onError: () => toast.error('Erro ao atualizar meta')
  });

  const handleSaveGoal = () => {
    const value = parseFloat(goalValue.replace(',', '.'));
    if (isNaN(value) || value < 0) { toast.error('Informe um valor válido'); return; }
    updateGoalMutation.mutate(value > 0 ? value : null);
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date, endDate: Date;
    switch (period) {
      case 'today': startDate = startOfDay(now); endDate = endOfDay(now); break;
      case '7days': startDate = startOfDay(subDays(now, 6)); endDate = endOfDay(now); break;
      case '30days': startDate = startOfMonth(now); endDate = endOfDay(now); break;
      default: startDate = startOfDay(subDays(now, 6)); endDate = endOfDay(now);
    }
    return { start: startDate.toISOString(), end: endDate.toISOString(), startDate, endDate };
  }, [period]);

  // All appointments for the barbershop (master uses for "Barbearia" tab)
  const { data: allShopAppointments, isLoading: shopLoading } = useQuery({
    queryKey: ['reports-all-appointments', barbershop?.id, dateRange],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, start_time, status, barber_id, service_id, barbers!inner(id, name), services(id, name, price)')
        .eq('barbershop_id', barbershop.id)
        .gte('start_time', dateRange.start)
        .lte('start_time', dateRange.end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id
  });

  // Personal appointments (filtered by barber_id)
  const personalAllAppointments = useMemo(() => {
    if (!allShopAppointments || !barber?.id) return [];
    return allShopAppointments.filter((a: any) => a.barber_id === barber.id);
  }, [allShopAppointments, barber?.id]);

  const shopCompleted = useMemo(() => allShopAppointments?.filter((a: any) => a.status === 'completed') || [], [allShopAppointments]);
  const personalCompleted = useMemo(() => personalAllAppointments.filter((a: any) => a.status === 'completed'), [personalAllAppointments]);

  // Previous month for comparison
  const prevMonthRange = useMemo(() => {
    const now = new Date();
    const prevMonth = subMonths(now, 1);
    return { start: startOfMonth(prevMonth).toISOString(), end: endOfMonth(prevMonth).toISOString() };
  }, []);

  const { data: prevMonthAppointments } = useQuery({
    queryKey: ['reports-prev-month', barbershop?.id, prevMonthRange],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, barber_id, services(price)')
        .eq('barbershop_id', barbershop.id)
        .eq('status', 'completed')
        .gte('start_time', prevMonthRange.start)
        .lte('start_time', prevMonthRange.end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && period === '30days'
  });

  const prevMonthShopRevenue = useMemo(() => {
    if (!prevMonthAppointments?.length) return 0;
    return prevMonthAppointments.reduce((sum: number, apt: any) => sum + Number(apt.services?.price || 0), 0);
  }, [prevMonthAppointments]);

  const prevMonthPersonalRevenue = useMemo(() => {
    if (!prevMonthAppointments?.length || !barber?.id) return 0;
    return prevMonthAppointments.filter((a: any) => a.barber_id === barber.id).reduce((sum: number, apt: any) => sum + Number(apt.services?.price || 0), 0);
  }, [prevMonthAppointments, barber?.id]);

  const periodLabel = period === 'today' ? 'Hoje' : period === '7days' ? '7 dias' : 'Mês';

  const handleExportPDF = useCallback(() => {
    const isPersonalView = !isMaster || masterTab === 'meu-desempenho';
    const appointments = isPersonalView ? personalCompleted : shopCompleted;
    const allApts = isPersonalView ? personalAllAppointments : (allShopAppointments || []);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const title = isPersonalView ? 'Meu Desempenho' : 'Relatórios & Desempenho';
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const periodText = period === 'today'
      ? format(dateRange.startDate, "dd/MM/yyyy", { locale: ptBR })
      : period === '7days'
        ? `${format(dateRange.startDate, "dd/MM/yyyy", { locale: ptBR })} a ${format(dateRange.endDate, "dd/MM/yyyy", { locale: ptBR })}`
        : format(dateRange.startDate, "MMMM 'de' yyyy", { locale: ptBR });
    doc.text(`${barbershop?.name || 'Barbearia'} — ${periodLabel} (${periodText})`, pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.setFontSize(8);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.setTextColor(0, 0, 0);

    const totalRevenue = appointments.reduce((sum: number, apt: any) => sum + Number(apt.services?.price || 0), 0);
    const ticketMedio = appointments.length > 0 ? totalRevenue / appointments.length : 0;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Faturamento', 15, y);
    y += 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${formatCurrency(totalRevenue)}`, 15, y);
    y += 6;
    doc.text(`Ticket médio: ${formatCurrency(ticketMedio)}`, 15, y);
    y += 6;
    doc.text(`Atendimentos: ${appointments.length}`, 15, y);
    y += 10;

    // Top services
    const serviceCount: Record<string, { name: string; count: number }> = {};
    appointments.forEach((apt: any) => {
      if (apt.services?.name) {
        const sn = apt.services.name;
        if (!serviceCount[sn]) serviceCount[sn] = { name: sn, count: 0 };
        serviceCount[sn].count++;
      }
    });
    const topServices = Object.values(serviceCount).sort((a, b) => b.count - a.count).slice(0, 5);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Serviços mais vendidos', 15, y);
    y += 7;
    if (topServices.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      topServices.forEach((s, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${i + 1}. ${s.name} — ${s.count} atend.`, 15, y);
        y += 5;
      });
    } else {
      doc.setFontSize(9);
      doc.text('Nenhum serviço no período.', 15, y);
      y += 5;
    }

    const fileName = `relatorio-${isPersonalView ? 'pessoal' : 'barbearia'}-${period}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    toast.success('PDF exportado com sucesso!');
  }, [isMaster, masterTab, personalCompleted, shopCompleted, personalAllAppointments, allShopAppointments, period, dateRange, barbershop, periodLabel]);

  const pageTitle = isMaster ? 'Relatórios & Desempenho' : 'Meu Desempenho';
  const pageSubtitle = isMaster ? 'Visualize o desempenho da sua barbearia' : 'Acompanhe seus resultados pessoais';

  const periodButtons = (
    <div className="flex gap-1.5">
      {(['today', '7days', '30days'] as PeriodFilter[]).map((p) => (
        <Button
          key={p}
          variant={period === p ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriod(p)}
          className={`h-7 px-2.5 text-xs ${period === p ? 'btn-primary-gradient' : ''}`}
        >
          {p === 'today' ? 'Hoje' : p === '7days' ? '7 dias' : 'Mês'}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 animate-page-enter">
      {/* Header */}
      <div className="pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {isMaster && (
            <Button variant="outline" size="sm" onClick={() => navigate('/painel/despesas')} className="h-8 px-3 text-xs gap-1.5 shrink-0">
              <Receipt className="h-3.5 w-3.5" />
              Despesas
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={shopLoading} className="h-8 px-3 text-xs gap-1.5 shrink-0">
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex justify-end">{periodButtons}</div>

      {isMaster ? (
        <Tabs value={masterTab} onValueChange={setMasterTab}>
          <TabsList className="grid w-full grid-cols-2 h-11 rounded-lg p-1">
            <TabsTrigger value="barbearia" className="rounded-md h-full">Barbearia</TabsTrigger>
            <TabsTrigger value="meu-desempenho" className="rounded-md h-full">Meu Desempenho</TabsTrigger>
          </TabsList>
          <TabsContent value="barbearia">
            <ReportContent
              appointments={shopCompleted}
              allAppointments={allShopAppointments || []}
              isLoading={shopLoading}
              period={period}
              dateRange={dateRange}
              showRanking={true}
              showGoal={true}
              monthlyGoal={monthlyGoal}
              prevMonthRevenue={prevMonthShopRevenue}
              onOpenGoalDialog={() => { setGoalTarget('barbershop'); setGoalValue(monthlyGoal?.toString() || ''); setGoalDialogOpen(true); }}
            />
          </TabsContent>
          <TabsContent value="meu-desempenho">
            <ReportContent
              appointments={personalCompleted}
              allAppointments={personalAllAppointments}
              isLoading={shopLoading}
              period={period}
              dateRange={dateRange}
              showRanking={false}
              showGoal={true}
              monthlyGoal={barberGoal}
              prevMonthRevenue={prevMonthPersonalRevenue}
              onOpenGoalDialog={() => { setGoalTarget('barber'); setGoalValue(barberGoal?.toString() || ''); setGoalDialogOpen(true); }}
            />
          </TabsContent>
        </Tabs>
      ) : (
        /* Barber view — personal only */
        <ReportContent
          appointments={personalCompleted}
          allAppointments={personalAllAppointments}
          isLoading={shopLoading}
          period={period}
          dateRange={dateRange}
          showRanking={false}
          showGoal={true}
          monthlyGoal={barberGoal}
          prevMonthRevenue={prevMonthPersonalRevenue}
          onOpenGoalDialog={() => { setGoalTarget('barber'); setGoalValue(barberGoal?.toString() || ''); setGoalDialogOpen(true); }}
        />
      )}

      {/* Goal dialog (master only) */}
      {isMaster && (
        <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Definir meta mensal
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm text-muted-foreground mb-2 block">Valor da meta (R$)</label>
              <Input type="text" inputMode="decimal" placeholder="Ex: 5000" value={goalValue} onChange={(e) => setGoalValue(e.target.value)} className="text-lg" />
              <p className="text-xs text-muted-foreground mt-2">A meta será exibida como linha de referência no gráfico mensal.</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveGoal} disabled={updateGoalMutation.isPending} className="btn-primary-gradient">
                {updateGoalMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Relatorios;
