import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Users, Scissors } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodFilter = 'today' | '7days' | '30days';

interface OutletContext {
  barber: { id: string; barbershop_id: string } | null;
  barbershop: { id: string; name: string } | null;
  isMaster: boolean;
}

const Relatorios = () => {
  const { barbershop, isMaster } = useOutletContext<OutletContext>();
  const [period, setPeriod] = useState<PeriodFilter>('7days');

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case '7days':
        startDate = startOfDay(subDays(now, 6));
        break;
      case '30days':
        startDate = startOfDay(subDays(now, 29));
        break;
      default:
        startDate = startOfDay(subDays(now, 6));
    }
    
    return {
      start: startDate.toISOString(),
      end: endOfDay(now).toISOString()
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Relatórios & Desempenho
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualize o desempenho da sua barbearia
        </p>
      </div>

      {/* Bloco 1 - Faturamento */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Faturamento
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={period === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('today')}
                className={period === 'today' ? 'btn-primary-gradient' : ''}
              >
                Hoje
              </Button>
              <Button
                variant={period === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('7days')}
                className={period === '7days' ? 'btn-primary-gradient' : ''}
              >
                7 dias
              </Button>
              <Button
                variant={period === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('30days')}
                className={period === '30days' ? 'btn-primary-gradient' : ''}
              >
                30 dias
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Total do período</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
              </div>
              
              {revenueData.length > 0 ? (
                <div className="h-[200px] sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
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
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Nenhum agendamento concluído no período selecionado.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Grid for services and barber performance */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bloco 2 - Serviços mais vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scissors className="h-5 w-5 text-primary" />
              Serviços mais vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : topServices.length > 0 ? (
              <div className="space-y-3">
                {topServices.map((service, index) => (
                  <div 
                    key={service.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {service.count} {service.count === 1 ? 'atendimento' : 'atendimentos'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum serviço realizado no período.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 3 - Desempenho dos barbeiros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Desempenho dos barbeiros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : barberPerformance.length > 0 ? (
              <div className="space-y-3">
                {barberPerformance.map((barber, index) => (
                  <div 
                    key={barber.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{barber.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {barber.count} {barber.count === 1 ? 'atendimento' : 'atendimentos'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum atendimento realizado no período.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Relatorios;
