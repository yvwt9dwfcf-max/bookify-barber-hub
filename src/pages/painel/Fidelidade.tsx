import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Stamp as Gift, UsersRound as Users, Search, Award, Check, Save, ChevronDown, Info, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';

interface OutletContext {
  barber: { id: string; barbershop_id: string } | null;
  barbershop: { id: string; name: string } | null;
  isMaster: boolean;
}

const PAGE_SIZE = 30;

const Fidelidade = () => {
  const { barbershop, isMaster } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();
  const [searchPhone, setSearchPhone] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [redeemDialog, setRedeemDialog] = useState(false);
  const [localPointsPerVisit, setLocalPointsPerVisit] = useState('1');
  const [localGoalPoints, setLocalGoalPoints] = useState('10');
  const [localRewardName, setLocalRewardName] = useState('Corte grátis');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Debounce search for performance with large datasets
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchPhone), 300);
    return () => clearTimeout(timer);
  }, [searchPhone]);

  // Config - available to all roles
  const { data: config, isLoading: configLoading } = useQuery({
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
    enabled: !!barbershop?.id,
  });

  // Cards with infinite scroll for 10k+ clients
  const {
    data: cardsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: cardsLoading,
  } = useInfiniteQuery({
    queryKey: ['loyalty-cards', barbershop?.id, debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('loyalty_cards')
        .select('*')
        .eq('barbershop_id', barbershop!.id)
        .order('total_points', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (debouncedSearch) {
        query = query.or(`customer_phone.ilike.%${debouncedSearch}%,customer_name.ilike.%${debouncedSearch}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
    enabled: !!barbershop?.id && (config?.is_active ?? false),
  });

  const cards = cardsData?.pages.flat() ?? [];

  // Toggle active - master only
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

  // Sync local state from config
  useEffect(() => {
    if (config) {
      setLocalPointsPerVisit(String(config.points_per_visit ?? 1));
      setLocalGoalPoints(String((config as any)?.goal_points ?? 10));
      setLocalRewardName((config as any)?.reward_name ?? 'Corte grátis');
      setHasUnsavedChanges(false);
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      if (!config) return;
      const pointsVal = Number(localPointsPerVisit) || 1;
      const goalVal = Number(localGoalPoints) || 10;
      const { error } = await supabase
        .from('loyalty_config')
        .update({ points_per_visit: pointsVal, goal_points: goalVal, reward_name: localRewardName.trim() || 'Corte grátis', updated_at: new Date().toISOString() } as any)
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
      setHasUnsavedChanges(false);
      toast.success('Configurações salvas com sucesso!');
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
  const goalPoints = Number(localGoalPoints) || 10;
  const rewardName = localRewardName.trim() || 'Corte grátis';

  if (configLoading) {
    return (
      <div className="space-y-4">
        <PremiumSkeleton className="h-8 w-64" />
        <PremiumSkeleton className="h-40 w-full" />
        <PremiumSkeleton className="h-60 w-full" />
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
        <p className="text-sm text-muted-foreground">
          {isMaster ? 'Recompense seus clientes fiéis de forma simples' : 'Consulte e resgate prêmios dos clientes'}
        </p>
      </div>

      {/* How it works */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary" />
            Como funciona?
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Os pontos são acumulados <strong>automaticamente</strong> ao concluir um atendimento na agenda.</li>
            <li>Apenas clientes com <strong>número de telefone</strong> cadastrado acumulam pontos.</li>
            <li>Quando o cliente atingir a meta, um destaque aparece — clique para resgatar o prêmio.</li>
            {isMaster && (
              <>
                <li>Ative o programa e defina quantos pontos o cliente ganha por serviço concluído.</li>
                <li>Defina a meta de pontos e o prêmio que o cliente receberá ao atingir.</li>
              </>
            )}
            <li>Após o resgate, os pontos usados são descontados e o ciclo recomeça.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Config - Master only can edit, barbers see status */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Programa {isActive ? 'ativo' : 'inativo'}</p>
              <p className="text-xs text-muted-foreground">
                {isActive ? 'Clientes com telefone acumulam pontos ao concluir serviços' : 'O programa está desativado no momento'}
              </p>
            </div>
            {isMaster ? (
              <Switch checked={isActive} onCheckedChange={(v) => toggleConfigMutation.mutate(v)} />
            ) : (
              <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-primary text-primary-foreground' : ''}>
                {isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            )}
          </div>
          {isActive && isMaster && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground whitespace-nowrap">Pontos por serviço:</p>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={localPointsPerVisit}
                  onChange={(e) => {
                    setLocalPointsPerVisit(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-20 h-8 text-sm text-center"
                />
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground whitespace-nowrap">Pontos para recompensa:</p>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={localGoalPoints}
                  onChange={(e) => {
                    setLocalGoalPoints(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-20 h-8 text-sm text-center"
                />
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground whitespace-nowrap">Prêmio:</p>
                <Input
                  type="text"
                  placeholder="Ex: Corte grátis"
                  value={localRewardName}
                  onChange={(e) => {
                    setLocalRewardName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="h-8 text-sm"
                />
              </div>
              {hasUnsavedChanges && (
                <Button
                  onClick={() => saveConfigMutation.mutate()}
                  disabled={saveConfigMutation.isPending}
                  className="w-full btn-primary-gradient"
                  size="sm"
                >
                  {saveConfigMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar configurações
                    </>
                  )}
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">
                Pontos só são acumulados para clientes com número de telefone cadastrado.
              </p>
            </div>
          )}
          {/* Barbers see read-only config summary */}
          {isActive && !isMaster && config && (
            <div className="pt-2 border-t border-border/50 grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-primary">{(config as any).points_per_visit ?? 1}</p>
                <p className="text-[10px] text-muted-foreground">pts/serviço</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold text-primary">{(config as any).goal_points ?? 10}</p>
                <p className="text-[10px] text-muted-foreground">meta</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xs font-bold text-primary truncate">{(config as any).reward_name ?? 'Corte grátis'}</p>
                <p className="text-[10px] text-muted-foreground">prêmio</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Cards - available to all roles */}
      {isActive && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Clientes
              {cards.length > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1">{cards.length}+</Badge>
              )}
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
            {cardsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <PremiumSkeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : cards.length > 0 ? (
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{card.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{card.customer_phone}</p>
                      </div>
                      <div className="text-right flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="secondary" className="text-xs">
                          {card.total_points} pts
                        </Badge>
                        {reachedGoal && (
                          <Badge className="text-xs bg-primary text-primary-foreground">
                            <Award className="h-3 w-3 mr-1" />
                            {rewardName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {hasNextPage && (
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    size="sm"
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                {debouncedSearch ? 'Nenhum cliente encontrado.' : 'Pontos serão acumulados ao concluir atendimentos com telefone cadastrado.'}
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <Award className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-primary">Prêmio disponível!</p>
                      <p className="text-xs text-muted-foreground">{rewardName}</p>
                    </div>
                  </div>
                  <Button
                    className="w-full btn-primary-gradient"
                    onClick={() => redeemMutation.mutate({
                      cardId: selectedCard.id,
                      currentPoints: selectedCard.total_points,
                      goalPoints,
                    })}
                    disabled={redeemMutation.isPending}
                  >
                    {redeemMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resgatando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Resgatar "{rewardName}" ({goalPoints} pts)
                      </>
                    )}
                  </Button>
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
