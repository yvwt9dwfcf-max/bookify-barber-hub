import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Users, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OutletContext {
  barber: { id: string; barbershop_id: string } | null;
  barbershop: { id: string; name: string } | null;
  isMaster: boolean;
}

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

  // Completed appointments for commission report
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

  const getCommission = (barberId: string) => {
    return commissions?.find(c => c.barber_id === barberId)?.default_percentage ?? 50;
  };

  const getOverride = (barberId: string, serviceId: string) => {
    return overrides?.find(o => o.barber_id === barberId && o.service_id === serviceId)?.percentage;
  };

  const getBarberMonthlyReport = (barberId: string) => {
    const barberApts = completedAppointments?.filter(a => a.barber_id === barberId) || [];
    let totalRevenue = 0;
    let totalCommission = 0;
    barberApts.forEach(apt => {
      const price = Number(apt.services?.price || 0);
      const override = getOverride(barberId, apt.service_id || '');
      const pct = override ?? getCommission(barberId);
      totalRevenue += price;
      totalCommission += price * (pct / 100);
    });
    return { count: barberApts.length, totalRevenue, totalCommission };
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const isLoading = barbersLoading || commissionsLoading;

  if (!isMaster) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-page-enter">
      <div className="pb-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Gestão de Comissões
        </h1>
        <p className="text-sm text-muted-foreground">Configure o percentual de comissão por barbeiro e serviço</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {barbers?.map(barber => {
            const commission = getCommission(barber.id);
            const report = getBarberMonthlyReport(barber.id);
            const isExpanded = expandedBarber === barber.id;
            const editKey = `default-${barber.id}`;
            const currentEditValue = editingValues[editKey] ?? commission;

            return (
              <Card key={barber.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Barber header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {barber.photo_url ? (
                        <img src={barber.photo_url} alt={barber.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{barber.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.count} atend. este mês • {formatCurrency(report.totalCommission)} comissão
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={currentEditValue}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, [editKey]: Number(e.target.value) }))}
                          className="w-16 h-8 text-sm text-center"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => saveCommissionMutation.mutate({ barberId: barber.id, percentage: currentEditValue })}
                        >
                          <Save className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedBarber(isExpanded ? null : barber.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Per-service overrides */}
                  {isExpanded && services && services.length > 0 && (
                    <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Override por serviço (deixe vazio para usar o padrão {commission}%)</p>
                      {services.map(service => {
                        const overrideKey = `override-${barber.id}-${service.id}`;
                        const existing = getOverride(barber.id, service.id);
                        const editVal = editingOverrides[overrideKey] ?? existing ?? '';
                        return (
                          <div key={service.id} className="flex items-center justify-between">
                            <span className="text-sm">{service.name} <span className="text-xs text-muted-foreground">({formatCurrency(service.price)})</span></span>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                placeholder={`${commission}`}
                                value={editVal}
                                onChange={(e) => setEditingOverrides(prev => ({ ...prev, [overrideKey]: Number(e.target.value) }))}
                                className="w-16 h-7 text-xs text-center"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
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

export default Comissoes;
