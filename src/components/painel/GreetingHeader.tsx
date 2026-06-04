import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Coins, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, Barber, Barbershop } from '@/lib/supabase';
import { startOfDay, addDays } from 'date-fns';
import { useSubscription } from '@/hooks/useSubscription';

interface GreetingHeaderProps {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
  selectedDate: Date;
  refreshKey?: number;
}

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const motivationalLines = [
  'Vamos fazer um ótimo dia.',
  'Tudo pronto pra começar.',
  'Foco no atendimento de hoje.',
  'Bora bater a meta hoje.',
  'Cliente feliz, agenda cheia.',
];

const GreetingHeader = ({ barber, barbershop, isMaster, selectedDate, refreshKey }: GreetingHeaderProps) => {
  const [stats, setStats] = useState({ appointments: 0, revenue: 0 });
  const { isTrialActive, trialDaysRemaining, barbershop: subShop } = useSubscription();

  const firstName = (barber?.name || barbershop?.name || '').split(' ')[0] || 'bem-vindo';
  const motivation = motivationalLines[selectedDate.getDate() % motivationalLines.length];
  const trialExpired = subShop?.subscription_status === 'trial' && !isTrialActive;

  const fetchStats = useCallback(async () => {
    if (!barbershop?.id) return;
    const start = startOfDay(selectedDate).toISOString();
    const end = addDays(startOfDay(selectedDate), 1).toISOString();

    let query = supabase
      .from('appointments')
      .select('id, status, service:services(price)')
      .eq('barbershop_id', barbershop.id)
      .gte('start_time', start)
      .lt('start_time', end);

    if (!isMaster && barber?.id) {
      query = query.eq('barber_id', barber.id);
    }

    const { data } = await query;
    if (!data) return;
    const appointments = data.filter((a: any) => a.status !== 'cancelled').length;
    const revenue = data
      .filter((a: any) => a.status === 'completed')
      .reduce((sum: number, a: any) => sum + Number(a.service?.price ?? 0), 0);
    setStats({ appointments, revenue });
  }, [barbershop?.id, barber?.id, isMaster, selectedDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-2"
    >
      {isTrialActive && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px]">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>
            Teste grátis: <strong>{trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}</strong> restantes
          </span>
        </div>
      )}

      {trialExpired && (
        <Link
          to="/trial-expirado"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px]"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>Teste encerrado. Escolha um plano para continuar.</span>
        </Link>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">
            {getTimeGreeting()}, <span className="capitalize">{firstName}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{motivation}</p>
        </div>

        <div className="flex items-center gap-3 text-right shrink-0">
          <div className="flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5 text-primary" />
            <div className="leading-none">
              <p className="text-sm font-semibold">{stats.appointments}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">hoje</p>
            </div>
          </div>
          <div className="h-7 w-px bg-border/50" />
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-emerald-500" />
            <div className="leading-none">
              <p className="text-sm font-semibold">
                R$ {stats.revenue.toFixed(0)}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">caixa</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GreetingHeader;
