import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, DollarSign, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { startOfDay, addDays } from 'date-fns';
import { useSubscription } from '@/hooks/useSubscription';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { Link } from 'react-router-dom';

interface DashboardCardsProps {
  barbershopId: string | undefined;
  refreshKey?: number;
}

const DashboardCards = ({ barbershopId, refreshKey }: DashboardCardsProps) => {
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayClients, setTodayClients] = useState(0);
  const { isTrialActive, trialDaysRemaining, barbershop } = useSubscription();
  const { barbers } = useBarbershopBarbers();

  useEffect(() => {
    if (!barbershopId) return;

    const fetchTodayStats = async () => {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = addDays(startOfDay(new Date()), 1).toISOString();

      const { data, error } = await supabase
        .from('appointments')
        .select('id, status, service:services(price)')
        .eq('barbershop_id', barbershopId)
        .gte('start_time', todayStart)
        .lt('start_time', todayEnd);

      if (error || !data) return;

      setTodayAppointments(data.length);

      const completed = data.filter((a: any) => a.status === 'completed');
      setTodayClients(completed.length);

      const revenue = completed.reduce((sum: number, a: any) => {
        const price = a.service?.price ?? 0;
        return sum + Number(price);
      }, 0);
      setTodayRevenue(revenue);
    };

    fetchTodayStats();
    const interval = setInterval(fetchTodayStats, 30000);
    return () => clearInterval(interval);
  }, [barbershopId, refreshKey]);

  const planLabel = barbershop?.plan
    ? barbershop.plan.charAt(0).toUpperCase() + barbershop.plan.slice(1)
    : '—';

  const activeBarbers = barbers.filter(b => b.is_active).length;
  const maxBarbers = barbershop?.max_barbers ?? 1;

  const trialExpired = barbershop?.subscription_status === 'trial' && !isTrialActive;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Trial warning */}
      {isTrialActive && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Seu teste gratuito termina em <strong>{trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}</strong>.
          </span>
        </div>
      )}

      {trialExpired && (
        <Link to="/trial-expirado" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs hover:bg-destructive/15 transition-colors">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Seu teste gratuito terminou. Escolha um plano para continuar usando o Bookify.</span>
        </Link>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarCheck className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <p className="text-xl font-bold">{todayAppointments}</p>
            <p className="text-[10px] text-muted-foreground">Agendamentos hoje</p>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/60 backdrop-blur-sm rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            </div>
            <p className="text-xl font-bold">
              R$ {todayRevenue.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-[10px] text-muted-foreground">Faturamento hoje</p>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-card/60 backdrop-blur-sm rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-blue-500" />
              </div>
            </div>
            <p className="text-xl font-bold">{todayClients}</p>
            <p className="text-[10px] text-muted-foreground">Clientes atendidos</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default DashboardCards;
