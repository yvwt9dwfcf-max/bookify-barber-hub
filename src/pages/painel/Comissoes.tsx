import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ComissoesSkeleton } from '@/components/painel/skeletons';
import {
  Coins as DollarSign,
  UsersRound as Users,
  ChevronDown,
  ChevronUp,
  Save,
  TrendingUp,
  Percent as PercentIcon,
  Wallet,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OutletContext {
  barber: { id: string; barbershop_id: string } | null;
  barbershop: { id: string; name: string } | null;
  isMaster: boolean;
}

import { formatCurrency } from '@/lib/formatters';

const Comissoes = () => {
  const { barbershop, isMaster } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();
  const [expandedBarber, setExpandedBarber] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, number>>({});
  const [editingOverrides, setEditingOverrides] = useState<Record<string, number>>({});

  const { data: barbers, isLoading: barbersLoading } = useQuery({
    queryKey: ['comissoes-barbers', barbershop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name, photo_url')
        .eq('barbershop_id', barbershop!.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster,
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['barber-commissions', barbershop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_commissions')
        .select('*')
        .eq('barbershop_id', barbershop!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster,
  });

  const { data: overrides } = useQuery({
    queryKey: ['commission-overrides', barbershop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_overrides')
        .select('*')
        .eq('barbershop_id', barbershop!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster,
  });

  const { data: services } = useQuery({
    queryKey: ['comissoes-services', barbershop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price')
        .eq('barbershop_id', barbershop!.id)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster,
  });

  const { data: completedAppointments } = useQuery({
    queryKey: ['comissoes-appointments', barbershop?.id],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select('id, barber_id, service_id, services(price)')
        .eq('barbershop_id', barbershop!.id)
        .eq('status', 'completed')
        .gte('start_time', startOfMonth);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster,
  });

  const saveCommissionMutation = useMutation({
    mutationFn: async ({ barberId, percentage }: { barberId: string; percentage: number }) => {
      const existing = commissions?.find(c => c.barber_id === barberId);
      if (existing) {
        const { error } = await supabase
          .from('barber_commissions')
          .update({ default_percentage: percentage, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('barber_commissions')
          .insert({ barber_id: barberId, barbershop_id: barbershop!.id, default_percentage: percentage });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-commissions'] });
      toast.success('Comissão salva!');
    },
    onError: () => toast.error('Erro ao salvar comissão'),
  });

  const saveOverrideMutation = useMutation({
    mutationFn: async ({ barberId, serviceId, percentage }: { barberId: string; serviceId: string; percentage: number }) => {
      const existing = overrides?.find(o => o.barber_id === barberId && o.service_id === serviceId);
      if (existing) {
        const { error } = await supabase
          .from('commission_overrides')
          .update({ percentage })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('commission_overrides')
          .insert({ barber_id: barberId, service_id: serviceId, barbershop_id: barbershop!.id, percentage });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-overrides'] });
      toast.success('Override salvo!');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const getCommission = (barberId: string) =>
    commissions?.find(c => c.barber_id === barberId)?.default_percentage ?? 50;

  const getOverride = (barberId: string, serviceId: string) =>
    overrides?.find(o => o.barber_id === barberId && o.service_id === serviceId)?.percentage;

  const getBarberReport = (barberId: string) => {
    const apts = completedAppointments?.filter(a => a.barber_id === barberId) || [];
    let revenue = 0;
    let commission = 0;
    apts.forEach((apt: any) => {
      const price = Number(apt.services?.price || 0);
      const override = getOverride(barberId, apt.service_id || '');
      const pct = override ?? getCommission(barberId);
      revenue += price;
      commission += price * (pct / 100);
    });
    const profit = revenue - commission;
    const avgTicket = apts.length > 0 ? revenue / apts.length : 0;
    return { count: apts.length, revenue, commission, profit, avgTicket };
  };

  // Totals
  const totals = (barbers || []).reduce(
    (acc, b) => {
      const r = getBarberReport(b.id);
      acc.revenue += r.revenue;
      acc.commission += r.commission;
      acc.profit += r.profit;
      acc.count += r.count;
      return acc;
    },
    { revenue: 0, commission: 0, profit: 0, count: 0 }
  );

  const isLoading = barbersLoading || commissionsLoading;

  if (!isMaster) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 animate-page-enter">
      {/* Header / summary */}
      <Card className="overflow-hidden border-0">
        <CardContent
          className="p-5"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0.02))',
          }}
        >
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            Lucro líquido após comissões
          </p>
          <p className="text-3xl font-bold tabular-nums text-primary">
            {formatCurrency(totals.profit)}
          </p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-xl p-2.5 bg-card/50 border border-border/40">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Bruto</p>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(totals.revenue)}</p>
            </div>
            <div className="rounded-xl p-2.5 bg-card/50 border border-border/40">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Comissões</p>
              <p className="text-sm font-bold tabular-nums text-amber-500">{formatCurrency(totals.commission)}</p>
            </div>
            <div className="rounded-xl p-2.5 bg-card/50 border border-border/40">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Atend.</p>
              <p className="text-sm font-bold tabular-nums">{totals.count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <ComissoesSkeleton />
      ) : (
        <div className="space-y-3">
          {(barbers || []).length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Nenhum barbeiro ativo.
              </CardContent>
            </Card>
          )}
          {barbers?.map(barber => {
            const commission = getCommission(barber.id);
            const r = getBarberReport(barber.id);
            const isExpanded = expandedBarber === barber.id;
            const editKey = `default-${barber.id}`;
            const currentEditValue = editingValues[editKey] ?? commission;
            const profitPct = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;

            return (
              <Card key={barber.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {barber.photo_url ? (
                        <img src={barber.photo_url} alt={barber.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-border" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{barber.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.count} atend. · ticket {formatCurrency(r.avgTicket)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 border border-border/40 px-1.5 py-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={currentEditValue}
                            onChange={(e) =>
                              setEditingValues(prev => ({ ...prev, [editKey]: Number(e.target.value) }))
                            }
                            className="w-12 h-7 text-xs text-center border-0 bg-transparent p-0 focus-visible:ring-0"
                          />
                          <PercentIcon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            saveCommissionMutation.mutate({ barberId: barber.id, percentage: currentEditValue })
                          }
                        >
                          <Save className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <Metric icon={<TrendingUp className="h-3 w-3 text-primary" />} label="Bruto" value={formatCurrency(r.revenue)} />
                      <Metric icon={<Wallet className="h-3 w-3 text-amber-500" />} label="Comissão" value={formatCurrency(r.commission)} accent="amber" />
                      <Metric icon={<Sparkles className="h-3 w-3 text-primary" />} label="Lucro" value={formatCurrency(r.profit)} accent="primary" />
                    </div>

                    {/* Profit bar */}
                    {r.revenue > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Margem da casa</span>
                          <span className="font-semibold tabular-nums text-foreground">{profitPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                          <div className="h-full bg-primary" style={{ width: `${profitPct}%` }} />
                          <div className="h-full bg-amber-500/70" style={{ width: `${100 - profitPct}%` }} />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setExpandedBarber(isExpanded ? null : barber.id)}
                      className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <><ChevronUp className="h-3 w-3" /> Recolher</> : <><ChevronDown className="h-3 w-3" /> Comissão por serviço</>}
                    </button>
                  </div>

                  {isExpanded && services && services.length > 0 && (
                    <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-2">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">
                        Padrão {commission}% — defina exceções por serviço
                      </p>
                      {services.map(service => {
                        const overrideKey = `override-${barber.id}-${service.id}`;
                        const existing = getOverride(barber.id, service.id);
                        const editVal = editingOverrides[overrideKey] ?? existing ?? '';
                        return (
                          <div key={service.id} className="flex items-center justify-between gap-2">
                            <span className="text-xs truncate flex-1">
                              {service.name} <span className="text-muted-foreground">{formatCurrency(service.price)}</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                placeholder={`${commission}`}
                                value={editVal}
                                onChange={(e) =>
                                  setEditingOverrides(prev => ({ ...prev, [overrideKey]: Number(e.target.value) }))
                                }
                                className="w-14 h-7 text-xs text-center"
                              />
                              <span className="text-[10px] text-muted-foreground">%</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  const val = Number(editVal);
                                  if (val >= 0 && val <= 100) {
                                    saveOverrideMutation.mutate({ barberId: barber.id, serviceId: service.id, percentage: val });
                                  }
                                }}
                              >
                                <Save className="h-3 w-3 text-primary" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Metric = ({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: 'primary' | 'amber' }) => (
  <div className="rounded-lg bg-muted/40 border border-border/30 p-2">
    <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
      {icon}
      {label}
    </div>
    <p className={`text-xs font-bold tabular-nums mt-0.5 ${accent === 'primary' ? 'text-primary' : accent === 'amber' ? 'text-amber-500' : ''}`}>
      {value}
    </p>
  </div>
);

export default Comissoes;
