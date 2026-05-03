import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { Trophy, TrendingUp, TrendingDown, Crown, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  barbershopId: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BarbersReport = ({ barbershopId }: Props) => {
  // Last 6 months window
  const range = useMemo(() => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(new Date(), 5));
    return { start: start.toISOString(), end: end.toISOString(), startDate: start, endDate: end };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['barbers-report', barbershopId, range.start],
    queryFn: async () => {
      const [barbersRes, appsRes, salesRes] = await Promise.all([
        supabase
          .from('barbers')
          .select('id, name, photo_url')
          .eq('barbershop_id', barbershopId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('appointments')
          .select('id, barber_id, start_time, status, services(price)')
          .eq('barbershop_id', barbershopId)
          .gte('start_time', range.start)
          .lte('start_time', range.end),
        supabase
          .from('product_sales')
          .select('barber_id, sold_at, total_amount')
          .eq('barbershop_id', barbershopId)
          .gte('sold_at', range.start)
          .lte('sold_at', range.end),
      ]);
      return {
        barbers: barbersRes.data || [],
        apps: appsRes.data || [],
        sales: salesRes.data || [],
      };
    },
    enabled: !!barbershopId,
  });

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const stats = useMemo(() => {
    if (!data) return [];
    return data.barbers.map((b: any) => {
      const myApps = data.apps.filter((a: any) => a.barber_id === b.id);
      const monthApps = myApps.filter((a: any) => {
        const t = new Date(a.start_time).getTime();
        return t >= monthStart.getTime() && t <= monthEnd.getTime();
      });
      const completed = monthApps.filter((a: any) => a.status === 'completed');
      const cancelled = monthApps.filter((a: any) => a.status === 'cancelled');
      const services = completed.reduce((s, a: any) => s + Number(a.services?.price || 0), 0);
      const products = data.sales
        .filter((x: any) => {
          const t = new Date(x.sold_at).getTime();
          return x.barber_id === b.id && t >= monthStart.getTime() && t <= monthEnd.getTime();
        })
        .reduce((s, x: any) => s + Number(x.total_amount || 0), 0);
      const total = services + products;
      const noShowRate = monthApps.length > 0 ? (cancelled.length / monthApps.length) * 100 : 0;
      const ticket = completed.length > 0 ? services / completed.length : 0;
      return {
        id: b.id,
        name: b.name,
        photo_url: b.photo_url,
        services,
        products,
        total,
        appointments: completed.length,
        cancelled: cancelled.length,
        noShowRate,
        ticket,
      };
    }).sort((a, b) => b.total - a.total);
  }, [data, monthStart, monthEnd]);

  const monthlyComparison = useMemo(() => {
    if (!data) return [];
    const months = eachMonthOfInterval({ start: range.startDate, end: range.endDate });
    return months.map((m) => {
      const ms = m.getTime();
      const me = endOfMonth(m).getTime();
      const row: any = { month: format(m, 'MMM', { locale: ptBR }) };
      data.barbers.forEach((b: any) => {
        const services = data.apps
          .filter((a: any) =>
            a.barber_id === b.id &&
            a.status === 'completed' &&
            new Date(a.start_time).getTime() >= ms &&
            new Date(a.start_time).getTime() <= me,
          )
          .reduce((s, a: any) => s + Number(a.services?.price || 0), 0);
        const products = data.sales
          .filter((x: any) =>
            x.barber_id === b.id &&
            new Date(x.sold_at).getTime() >= ms &&
            new Date(x.sold_at).getTime() <= me,
          )
          .reduce((s, x: any) => s + Number(x.total_amount || 0), 0);
        row[b.name] = Math.round(services + products);
      });
      return row;
    });
  }, [data, range]);

  const colors = ['hsl(var(--primary))', '#F59E0B', '#3B82F6', '#A855F7', '#22C55E', '#EC4899', '#06B6D4'];

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map((i) => <PremiumSkeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (!stats.length) {
    return (
      <div className="pt-12 text-center text-sm text-muted-foreground">
        Cadastre barbeiros para ver os relatórios individuais.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Ranking */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-500" />
            Ranking de {format(monthStart, 'MMMM', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {stats.map((s, idx) => (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="relative shrink-0">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-primary">{s.name.charAt(0)}</span>
                  )}
                </div>
                {idx === 0 && s.total > 0 && (
                  <Crown className="h-4 w-4 text-amber-500 absolute -top-1 -right-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">
                  #{idx + 1} {s.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span>{s.appointments} atend.</span>
                  <span>·</span>
                  <span>Ticket {formatCurrency(s.ticket)}</span>
                  {s.noShowRate > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-destructive">{s.noShowRate.toFixed(0)}% faltas</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold tabular-nums">{formatCurrency(s.total)}</p>
                {s.products > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{formatCurrency(s.products)} produtos
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Monthly comparison chart */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução · últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: any) => formatCurrency(Number(v))}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {data?.barbers.slice(0, 6).map((b: any, i: number) => (
                  <Bar key={b.id} dataKey={b.name} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Productivity grid */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Produtividade individual
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-1.5">
          {stats.map((s) => (
            <div key={s.id} className="grid grid-cols-4 gap-2 p-2.5 rounded-lg bg-muted/30 text-center">
              <div className="col-span-4 sm:col-span-1 text-left">
                <p className="text-sm font-semibold truncate">{s.name}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">Atend.</p>
                <p className="text-sm font-bold tabular-nums">{s.appointments}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">Ticket</p>
                <p className="text-sm font-bold tabular-nums">{formatCurrency(s.ticket)}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">Faltas</p>
                <p className={`text-sm font-bold tabular-nums ${s.noShowRate > 20 ? 'text-destructive' : ''}`}>
                  {s.noShowRate.toFixed(0)}%
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BarbersReport;
