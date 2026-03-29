import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, Coins as DollarSign, UsersRound as Users, CircleAlert as AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { startOfDay, addDays, subDays, format } from 'date-fns';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface DashboardCardsProps {
  barbershopId: string | undefined;
  selectedDate: Date;
  refreshKey?: number;
}

interface DayData {
  appointments: number;
  revenue: number;
  clients: number;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

const DashboardCards = ({ barbershopId, selectedDate, refreshKey }: DashboardCardsProps) => {
  const [weekData, setWeekData] = useState<DayData[]>(
    Array.from({ length: 7 }, () => ({ appointments: 0, revenue: 0, clients: 0 }))
  );
  const { isTrialActive, trialDaysRemaining, barbershop } = useSubscription();

  const todayStats = weekData[6];
  const yesterdayStats = weekData[5];

  const fetchStats = useCallback(async () => {
    if (!barbershopId) return;
    const anchorDay = startOfDay(selectedDate);
    const weekStart = startOfDay(subDays(anchorDay, 6)).toISOString();
    const nextDay = addDays(anchorDay, 1).toISOString();

    const { data } = await supabase
      .from('appointments')
      .select('id, status, start_time, service:services(price)')
      .eq('barbershop_id', barbershopId)
      .gte('start_time', weekStart)
      .lt('start_time', nextDay);

    if (!data) return;

    const dayMap = new Map<string, DayData>();
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(anchorDay, i), 'yyyy-MM-dd');
      dayMap.set(date, { appointments: 0, revenue: 0, clients: 0 });
    }

    data.forEach((a: any) => {
      const dateStr = format(new Date(a.start_time), 'yyyy-MM-dd');
      const dayData = dayMap.get(dateStr);
      if (!dayData) return;
      dayData.appointments++;
      if (a.status === 'completed') {
        dayData.clients++;
        dayData.revenue += Number(a.service?.price ?? 0);
      }
    });

    setWeekData(Array.from(dayMap.values()));
  }, [barbershopId, selectedDate]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, refreshKey]);

  const getGrowth = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const trialExpired = barbershop?.subscription_status === 'trial' && !isTrialActive;

  const stats = [
    {
      label: 'Agendamentos',
      formatted: String(todayStats.appointments),
      growth: getGrowth(todayStats.appointments, yesterdayStats.appointments),
      sparkColor: 'hsl(142, 71%, 45%)',
      gradientId: 'gA',
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
      sparkData: weekData.map(d => ({ v: d.appointments })),
      Icon: CalendarCheck,
    },
    {
      label: 'Faturamento',
      formatted: `R$ ${todayStats.revenue.toFixed(2).replace('.', ',')}`,
      growth: getGrowth(todayStats.revenue, yesterdayStats.revenue),
      sparkColor: 'hsl(152, 60%, 50%)',
      gradientId: 'gB',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      sparkData: weekData.map(d => ({ v: d.revenue })),
      Icon: DollarSign,
    },
    {
      label: 'Clientes',
      formatted: String(todayStats.clients),
      growth: getGrowth(todayStats.clients, yesterdayStats.clients),
      sparkColor: 'hsl(217, 91%, 60%)',
      gradientId: 'gC',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      sparkData: weekData.map(d => ({ v: d.clients })),
      Icon: Users,
    },
  ];

  return (
    <div className="space-y-2">
      {isTrialActive && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Seu teste gratuito termina em <strong>{trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}</strong>.
          </span>
        </motion.div>
      )}

      {trialExpired && (
        <Link
          to="/trial-expirado"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs hover:bg-destructive/15 transition-colors"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Seu teste gratuito terminou. Escolha um plano para continuar usando o Bookify.</span>
        </Link>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 gap-2"
      >
        {stats.map(({ label, formatted, growth, sparkColor, gradientId, bgColor, iconColor, sparkData, Icon }) => {
          const isPositive = growth > 0;
          const isNeutral = growth === 0;
          const GrowthIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
          const growthColor = isNeutral
            ? 'text-muted-foreground'
            : isPositive
            ? 'text-primary'
            : 'text-destructive';

          return (
            <motion.div key={label} variants={itemVariants}>
              <Card className="border-border/30 bg-card/60 backdrop-blur-sm rounded-xl overflow-hidden">
                <CardContent className="p-2 pb-0">
                  <div className={`h-5 w-5 rounded-md ${bgColor} flex items-center justify-center mb-1`}>
                    <Icon className={`h-2.5 w-2.5 ${iconColor}`} />
                  </div>
                  <p className="text-sm font-bold leading-tight truncate">{formatted}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                  <div className={`flex items-center gap-0.5 text-[10px] font-medium mt-0.5 mb-1 ${growthColor}`}>
                    <GrowthIcon className="h-2.5 w-2.5" />
                    <span>{isPositive ? '+' : ''}{growth}%</span>
                  </div>
                </CardContent>
                <div className="h-7">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={sparkColor} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={sparkColor}
                        fill={`url(#${gradientId})`}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default DashboardCards;
