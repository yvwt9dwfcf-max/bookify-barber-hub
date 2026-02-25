import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gift, Users, Search, Award, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OutletContext {
  barber: { id: string; barbershop_id: string } | null;
  barbershop: { id: string; name: string } | null;
  isMaster: boolean;
}

const Fidelidade = () => {
  const { barbershop, isMaster } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [redeemDialog, setRedeemDialog] = useState(false);

  // Config
  const { data: config } = useQuery({
    queryKey: ['loyalty-config', barbershop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_config')
        .select('*')
        .eq('barbershop_id', barbershop!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id && isMaster,
  });

  // Cards (customers)
  const { data: cards } = useQuery({
    queryKey: ['loyalty-cards', barbershop?.id, searchPhone],
    queryFn: async () => {
      let query = supabase
        .from('loyalty_cards')
        .select('*')
        .eq('barbershop_id', barbershop!.id)
        .order('total_points', { ascending: false })
        .limit(30);
      if (searchPhone) {
        query = query.or(`customer_phone.ilike.%${searchPhone}%,customer_name.ilike.%${searchPhone}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster,
  });

  // Toggle active
  const toggleConfigMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (config) {
        const { error } = await supabase
          .from('loyalty_config')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('loyalty_config')
          .insert({ barbershop_id: barbershop!.id, is_active: isActive, points_per_visit: 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
      toast.success('Configuração atualizada!');
    },
  });

  const updatePointsMutation = useMutation({
    mutationFn: async ({ field, value }: { field: 'points_per_visit' | 'goal_points'; value: number }) => {
      if (!config) return;
      const { error } = await supabase
        .from('loyalty_config')
        .update({ [field]: value, updated_at: new Date().toISOString() } as any)
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
      toast.success('Configuração atualizada!');
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ cardId, currentPoints, goalPoints }: { cardId: string; currentPoints: number; goalPoints: number }) => {
      const newPoints = currentPoints - goalPoints;
      const { error: txError } = await supabase
        .from('loyalty_transactions')
        .insert({
          loyalty_card_id: cardId,
          barbershop_id: barbershop!.id,
          type: 'redeem',
          points: -goalPoints,
          description: 'Recompensa resgatada',
        });
      if (txError) throw txError;
      const { error: cardError } = await supabase
        .from('loyalty_cards')
        .update({ total_points: newPoints, updated_at: new Date().toISOString() })
        .eq('id', cardId);
      if (cardError) throw cardError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-cards'] });
      setRedeemDialog(false);
      setSelectedCard(null);
      toast.success('Recompensa resgatada!');
    },
  });

  const isActive = config?.is_active ?? false;
  const pointsPerVisit = config?.points_per_visit ?? 1;
  const goalPoints = (config as any)?.goal_points ?? 10;

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
          <Gift className="h-5 w-5 text-primary" />
          Programa de Fidelidade
        </h1>
        <p className="text-sm text-muted-foreground">Sistema simples de pontos por serviço concluído</p>
      </div>

      {/* Config */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Programa ativo</p>
              <p className="text-xs text-muted-foreground">Clientes com telefone acumulam pontos ao concluir serviços</p>
            </div>
            <Switch checked={isActive} onCheckedChange={(v) => toggleConfigMutation.mutate(v)} />
          </div>
          {isActive && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground whitespace-nowrap">Pontos por serviço:</p>
                <Input
                  type="number"
                  min={1}
                  value={pointsPerVisit}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 1) updatePointsMutation.mutate({ field: 'points_per_visit', value: v });
                  }}
                  className="w-20 h-8 text-sm text-center"
                />
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground whitespace-nowrap">Pontos para recompensa:</p>
                <Input
                  type="number"
                  min={1}
                  value={goalPoints}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 1) updatePointsMutation.mutate({ field: 'goal_points', value: v });
                  }}
                  className="w-20 h-8 text-sm text-center"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pontos só são acumulados para clientes com número de telefone cadastrado.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Cards */}
      {isActive && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {cards && cards.length > 0 ? (
              <div className="space-y-2">
                {cards.map(card => {
                  const reachedGoal = goalPoints && card.total_points >= goalPoints;
                  return (
                    <div
                      key={card.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        reachedGoal ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted/80'
                      }`}
                      onClick={() => { setSelectedCard(card); setRedeemDialog(true); }}
                    >
                      <div>
                        <p className="text-sm font-medium">{card.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{card.customer_phone}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {card.total_points} pts
                        </Badge>
                        {reachedGoal && (
                          <Badge className="text-xs bg-primary text-primary-foreground">
                            <Award className="h-3 w-3 mr-1" />
                            Recompensa!
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                {searchPhone ? 'Nenhum cliente encontrado.' : 'Pontos serão acumulados ao concluir atendimentos com telefone cadastrado.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Redeem Dialog */}
      <Dialog open={redeemDialog} onOpenChange={(open) => { setRedeemDialog(open); if (!open) setSelectedCard(null); }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {selectedCard?.customer_name}
            </DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">{selectedCard.customer_phone}</div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                <span className="text-sm font-medium">Pontos acumulados</span>
                <Badge className="text-sm btn-primary-gradient">{selectedCard.total_points} pts</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{selectedCard.total_visits} visitas</p>

              {goalPoints && selectedCard.total_points >= goalPoints && (
                <Button
                  className="w-full btn-primary-gradient"
                  onClick={() => redeemMutation.mutate({
                    cardId: selectedCard.id,
                    currentPoints: selectedCard.total_points,
                    goalPoints,
                  })}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Resgatar recompensa ({goalPoints} pts)
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fidelidade;
