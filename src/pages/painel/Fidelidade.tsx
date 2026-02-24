import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Gift, Star, Users, Plus, Trash2, Search, Award, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OutletContext {
  barber: { id: string; barbershop_id: string } | null;
  barbershop: { id: string; name: string } | null;
  isMaster: boolean;
}

const Fidelidade = () => {
  const { barbershop, isMaster } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();
  const [rewardDialog, setRewardDialog] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');
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

  // Rewards
  const { data: rewards } = useQuery({
    queryKey: ['loyalty-rewards', barbershop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('barbershop_id', barbershop!.id)
        .eq('is_active', true)
        .order('points_required');
      if (error) throw error;
      return data || [];
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
        .limit(20);
      if (searchPhone) {
        query = query.or(`customer_phone.ilike.%${searchPhone}%,customer_name.ilike.%${searchPhone}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster,
  });

  // Transactions for selected card
  const { data: transactions } = useQuery({
    queryKey: ['loyalty-transactions', selectedCard?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*, loyalty_rewards(name)')
        .eq('loyalty_card_id', selectedCard!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCard?.id,
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
    mutationFn: async (points: number) => {
      if (config) {
        const { error } = await supabase
          .from('loyalty_config')
          .update({ points_per_visit: points, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('loyalty_config')
          .insert({ barbershop_id: barbershop!.id, points_per_visit: points });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
      toast.success('Pontos por visita atualizados!');
    },
  });

  const addRewardMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('loyalty_rewards')
        .insert({ barbershop_id: barbershop!.id, name: rewardName, points_required: Number(rewardPoints) });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      setRewardDialog(false);
      setRewardName('');
      setRewardPoints('');
      toast.success('Prêmio adicionado!');
    },
  });

  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loyalty_rewards').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      toast.success('Prêmio removido!');
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ cardId, rewardId, points }: { cardId: string; rewardId: string; points: number }) => {
      // Create transaction
      const { error: txError } = await supabase
        .from('loyalty_transactions')
        .insert({
          loyalty_card_id: cardId,
          barbershop_id: barbershop!.id,
          type: 'redeem',
          points: -points,
          reward_id: rewardId,
          description: 'Resgate de prêmio',
        });
      if (txError) throw txError;
      // Update card points
      const { error: cardError } = await supabase
        .from('loyalty_cards')
        .update({ total_points: (selectedCard?.total_points || 0) - points, updated_at: new Date().toISOString() })
        .eq('id', cardId);
      if (cardError) throw cardError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-cards'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
      setRedeemDialog(false);
      toast.success('Prêmio resgatado com sucesso!');
    },
  });

  const isActive = config?.is_active ?? false;
  const pointsPerVisit = config?.points_per_visit ?? 1;

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
        <p className="text-sm text-muted-foreground">Fidelize seus clientes com pontos e recompensas</p>
      </div>

      {/* Config */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-sm">Programa ativo</p>
              <p className="text-xs text-muted-foreground">Clientes acumulam pontos ao concluir atendimentos</p>
            </div>
            <Switch checked={isActive} onCheckedChange={(v) => toggleConfigMutation.mutate(v)} />
          </div>
          {isActive && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">Pontos por visita:</p>
              <Input
                type="number"
                min={1}
                value={pointsPerVisit}
                onChange={(e) => updatePointsMutation.mutate(Number(e.target.value) || 1)}
                className="w-20 h-8 text-sm text-center"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards */}
      {isActive && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-primary" />
                Prêmios
              </CardTitle>
              <Button size="sm" className="h-7 px-2.5 text-xs btn-primary-gradient" onClick={() => setRewardDialog(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            {rewards && rewards.length > 0 ? (
              <div className="space-y-2">
                {rewards.map(reward => (
                  <div key={reward.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{reward.name}</p>
                      <p className="text-xs text-muted-foreground">{reward.points_required} pontos</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRewardMutation.mutate(reward.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum prêmio cadastrado.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Cards */}
      {isActive && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Cartões de Fidelidade
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
                {cards.map(card => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => { setSelectedCard(card); setRedeemDialog(true); }}
                  >
                    <div>
                      <p className="text-sm font-medium">{card.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{card.customer_phone}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        {card.total_points} pts
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{card.total_visits} visitas</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                {searchPhone ? 'Nenhum cliente encontrado.' : 'Pontos serão acumulados automaticamente ao concluir atendimentos.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Reward Dialog */}
      <Dialog open={rewardDialog} onOpenChange={setRewardDialog}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Novo prêmio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Nome do prêmio (ex: Corte grátis)" value={rewardName} onChange={(e) => setRewardName(e.target.value)} />
            <Input type="number" placeholder="Pontos necessários" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardDialog(false)}>Cancelar</Button>
            <Button
              className="btn-primary-gradient"
              disabled={!rewardName || !rewardPoints}
              onClick={() => addRewardMutation.mutate()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem / Card Details Dialog */}
      <Dialog open={redeemDialog} onOpenChange={(open) => { setRedeemDialog(open); if (!open) setSelectedCard(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {selectedCard?.customer_name}
            </DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                <span className="text-sm font-medium">Saldo atual</span>
                <Badge className="text-sm btn-primary-gradient">{selectedCard.total_points} pontos</Badge>
              </div>

              {rewards && rewards.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Resgatar prêmio:</p>
                  <div className="space-y-2">
                    {rewards.map(reward => (
                      <div key={reward.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm">{reward.name}</p>
                          <p className="text-xs text-muted-foreground">{reward.points_required} pts</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={selectedCard.total_points < reward.points_required}
                          onClick={() => redeemMutation.mutate({
                            cardId: selectedCard.id,
                            rewardId: reward.id,
                            points: reward.points_required,
                          })}
                        >
                          Resgatar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction history */}
              {transactions && transactions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <History className="h-3 w-3" /> Histórico
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between py-1.5 text-xs">
                        <span className="text-muted-foreground">
                          {format(new Date(tx.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </span>
                        <span className={tx.type === 'earn' ? 'text-primary font-medium' : 'text-destructive font-medium'}>
                          {tx.type === 'earn' ? '+' : ''}{tx.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fidelidade;
