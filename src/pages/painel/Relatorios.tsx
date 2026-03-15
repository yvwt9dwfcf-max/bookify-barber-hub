import { useState, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChartPie as BarChart3, TrendingUp, TrendingDown, UsersRound as Users, Sparkles as Scissors, Target, Download, Minus, Timer as Clock, CircleX as XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, subMonths, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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
        .maybeSingle();
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
        // Current month: from 1st day to today
        startDate = startOfMonth(now);
        endDate = endOfDay(now);
        break;
      default:
        startDate = startOfDay(subDays(now, 6));
        endDate = endOfDay(now);
    }
    
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      startDate,
      endDate
    };
  }, [period]);

  // Fetch ALL appointments (not just completed) for richer metrics
  const { data: allAppointments, isLoading } = useQuery({
    queryKey: ['reports-all-appointments', barbershop?.id, dateRange],
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
        .gte('start_time', dateRange.start)
        .lte('start_time', dateRange.end);

      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster
  });

  // Filter completed only for revenue calculations
  const appointments = useMemo(() => 
    allAppointments?.filter(a => a.status === 'completed') || [], 
    [allAppointments]
  );

  // Cancellation rate
  const cancellationRate = useMemo(() => {
    if (!allAppointments?.length) return 0;
    const cancelled = allAppointments.filter(a => a.status === 'cancelled').length;
    return Math.round((cancelled / allAppointments.length) * 100);
  }, [allAppointments]);

  // Peak hours
  const peakHours = useMemo(() => {
    if (!allAppointments?.length) return [];
    const hourCount: Record<number, number> = {};
    allAppointments.filter(a => a.status !== 'cancelled').forEach(apt => {
      const hour = new Date(apt.start_time).getHours();
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });
    return Object.entries(hourCount)
      .map(([hour, count]) => ({ hour: `${hour}h`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allAppointments]);

  // Fetch previous month appointments for comparison (only when period is '30days')
  const prevMonthRange = useMemo(() => {
    const now = new Date();
    const prevMonth = subMonths(now, 1);
    return {
      start: startOfMonth(prevMonth).toISOString(),
      end: endOfMonth(prevMonth).toISOString()
    };
  }, []);

  const { data: prevMonthAppointments } = useQuery({
    queryKey: ['reports-prev-month', barbershop?.id, prevMonthRange],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, services(price)')
        .eq('barbershop_id', barbershop.id)
        .eq('status', 'completed')
        .gte('start_time', prevMonthRange.start)
        .lte('start_time', prevMonthRange.end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster && period === '30days'
  });

  const prevMonthRevenue = useMemo(() => {
    if (!prevMonthAppointments?.length) return 0;
    return prevMonthAppointments.reduce((sum, apt) => sum + Number(apt.services?.price || 0), 0);
  }, [prevMonthAppointments]);

  // Calculate revenue data for chart
  const revenueData = useMemo(() => {
    // For "Mês" filter: show single bar with total
    if (period === '30days') {
      const total = appointments?.reduce((sum, apt) => sum + Number(apt.services?.price || 0), 0) || 0;
      const monthName = format(dateRange.startDate, 'MMMM', { locale: ptBR });
      return [{
        day: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenue: total
      }];
    }

    // For other filters: show one bar per day
    const allDays = eachDayOfInterval({
      start: dateRange.startDate,
      end: dateRange.endDate
    });

    const revenueByDay: Record<string, number> = {};
    
    appointments?.forEach((apt) => {
      const dayKey = format(new Date(apt.start_time), 'yyyy-MM-dd');
      const price = apt.services?.price || 0;
      revenueByDay[dayKey] = (revenueByDay[dayKey] || 0) + Number(price);
    });

    return allDays.map((day) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const displayDay = format(day, 'dd/MM', { locale: ptBR });
      return {
        day: displayDay,
        revenue: revenueByDay[dayKey] || 0
      };
    });
  }, [appointments, dateRange, period]);

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

  // Pie chart data with percentages
  const pieChartData = useMemo(() => {
    if (!topServices.length) return [];
    const total = topServices.reduce((sum, s) => sum + s.count, 0);
    return topServices.map((s) => ({
      name: s.name,
      value: s.count,
      percentage: ((s.count / total) * 100).toFixed(1)
    }));
  }, [topServices]);

  const PIE_COLORS = ['#22C55E', '#F59E0B', '#4ADE80', '#EF4444', '#A1A1A1'];

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

  const periodLabel = period === 'today' ? 'Hoje' : period === '7days' ? '7 dias' : 'Mês';

  const handleExportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatórios & Desempenho', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Subtitle with barbershop name and period
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

    // Section 1: Faturamento
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Faturamento', 15, y);
    y += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total do período: ${formatCurrency(totalRevenue)}`, 15, y);
    y += 6;

    if (period === '30days' && monthlyGoal) {
      doc.text(`Meta do mês: ${formatCurrency(monthlyGoal)}`, 15, y);
      y += 6;
      const pct = totalRevenue > 0 && monthlyGoal > 0 ? ((totalRevenue / monthlyGoal) * 100).toFixed(1) : '0';
      doc.text(`Progresso: ${pct}%`, 15, y);
      y += 6;
    }

    // Revenue table
    if (revenueData.length > 0) {
      y += 2;
      const colWidths = [90, 80];
      const startX = 15;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(startX, y - 4, colWidths[0] + colWidths[1], 7, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Período', startX + 3, y);
      doc.text('Faturamento', startX + colWidths[0] + 3, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      revenueData.forEach((item) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(item.day, startX + 3, y);
        doc.text(formatCurrency(item.revenue), startX + colWidths[0] + 3, y);
        y += 5;
      });
    }

    y += 8;

    // Section 2: Serviços mais vendidos
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Serviços mais vendidos', 15, y);
    y += 7;

    if (topServices.length > 0) {
      const colWidths = [15, 110, 45];
      const startX = 15;

      doc.setFillColor(240, 240, 240);
      doc.rect(startX, y - 4, colWidths[0] + colWidths[1] + colWidths[2], 7, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('#', startX + 3, y);
      doc.text('Serviço', startX + colWidths[0] + 3, y);
      doc.text('Atendimentos', startX + colWidths[0] + colWidths[1] + 3, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      topServices.forEach((service, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${i + 1}`, startX + 3, y);
        doc.text(service.name, startX + colWidths[0] + 3, y);
        doc.text(`${service.count}`, startX + colWidths[0] + colWidths[1] + 3, y);
        y += 5;
      });
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Nenhum serviço realizado no período.', 15, y);
      y += 6;
    }

    y += 8;

    // Section 3: Desempenho dos barbeiros
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Desempenho dos barbeiros', 15, y);
    y += 7;

    if (barberPerformance.length > 0) {
      const colWidths = [15, 110, 45];
      const startX = 15;

      doc.setFillColor(240, 240, 240);
      doc.rect(startX, y - 4, colWidths[0] + colWidths[1] + colWidths[2], 7, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('#', startX + 3, y);
      doc.text('Barbeiro', startX + colWidths[0] + 3, y);
      doc.text('Atendimentos', startX + colWidths[0] + colWidths[1] + 3, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      barberPerformance.forEach((barber, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${i + 1}`, startX + 3, y);
        doc.text(barber.name, startX + colWidths[0] + 3, y);
        doc.text(`${barber.count}`, startX + colWidths[0] + colWidths[1] + 3, y);
        y += 5;
      });
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Nenhum atendimento realizado no período.', 15, y);
    }

    // Save
    const fileName = `relatorio-${period}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    toast.success('PDF exportado com sucesso!');
  }, [period, dateRange, barbershop, totalRevenue, monthlyGoal, revenueData, topServices, barberPerformance, formatCurrency, periodLabel]);

  if (!isMaster) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-page-enter">
      {/* Header - more compact */}
      <div className="pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Relatórios & Desempenho
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize o desempenho da sua barbearia
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={isLoading}
          className="h-8 px-3 text-xs gap-1.5 shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Button>
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
                Mês
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
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
                    {period === '30days' && prevMonthRevenue > 0 && (() => {
                      const diff = totalRevenue - prevMonthRevenue;
                      const pct = ((diff / prevMonthRevenue) * 100).toFixed(1);
                      const isUp = diff > 0;
                      const isEqual = diff === 0;
                      return (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium pb-0.5 ${
                          isEqual ? 'text-muted-foreground' : isUp ? 'text-primary' : 'text-destructive'
                        }`}>
                          {isEqual ? <Minus className="h-3 w-3" /> : isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isEqual ? '0%' : `${isUp ? '+' : ''}${pct}%`}
                        </span>
                      );
                    })()}
                  </div>
                  {period === '30days' && prevMonthRevenue > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      vs mês anterior: {formatCurrency(prevMonthRevenue)}
                    </p>
                  )}
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

              {/* Progress bar for monthly goal */}
              {period === '30days' && monthlyGoal && monthlyGoal > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progresso da meta</span>
                    <span className={`text-xs font-semibold ${
                      (totalRevenue / monthlyGoal) >= 1 
                        ? 'text-primary' 
                        : (totalRevenue / monthlyGoal) >= 0.7 
                          ? 'text-yellow-500' 
                          : 'text-muted-foreground'
                    }`}>
                      {Math.min((totalRevenue / monthlyGoal) * 100, 999).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        (totalRevenue / monthlyGoal) >= 1
                          ? 'bg-primary'
                          : (totalRevenue / monthlyGoal) >= 0.7
                            ? 'bg-yellow-500'
                            : 'bg-muted-foreground/50'
                      }`}
                      style={{ width: `${Math.min((totalRevenue / monthlyGoal) * 100, 100)}%` }}
                    />
                  </div>
                  {(totalRevenue / monthlyGoal) >= 1 && (
                    <p className="text-xs text-primary mt-1 font-medium">Meta atingida!</p>
                  )}
                </div>
              )}
              
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

      {/* New metrics row: Cancellation rate + Peak hours */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4 text-destructive" />
              Taxa de cancelamento
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-destructive">{cancellationRate}%</div>
                <div className="text-xs text-muted-foreground">
                  {allAppointments?.filter(a => a.status === 'cancelled').length || 0} cancelados de {allAppointments?.length || 0} total
                </div>
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
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : peakHours.length > 0 ? (
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
              <div className="py-4 text-center text-muted-foreground text-sm">
                Nenhum dado no período.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
              <>
                <div className="h-[180px] mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                        {pieChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value} atend.`, name]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      />
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

        {/* Bloco 3 - Ranking dos barbeiros */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Ranking dos barbeiros
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
                {barberPerformance.map((barber, index) => {
                  const barberRevenue = appointments
                    .filter(a => (a.barbers as any)?.name === barber.name)
                    .reduce((sum, a) => sum + Number(a.services?.price || 0), 0);
                  return (
                    <div key={barber.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                        <div>
                          <span className="text-sm font-medium">{barber.name}</span>
                          <p className="text-[10px] text-muted-foreground">{formatCurrency(barberRevenue)}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {barber.count} {barber.count === 1 ? 'atend.' : 'atend.'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">Nenhum atendimento realizado no período.</div>
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