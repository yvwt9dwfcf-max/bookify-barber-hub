import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { supabase, Barbershop, Barber } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Check, UsersRound as Users, Sparkles, Loader2, CreditCard, Calendar, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PLANS } from '@/lib/plans';
import { STRIPE_PLANS, StripePlanId } from '@/lib/stripe';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

interface SubscriptionData {
  subscribed: boolean;
  plan_id: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  cancel_at_period_end: boolean;
  is_owner?: boolean;
}

const Assinatura = () => {
  const { barbershop, isMaster } = useOutletContext<ContextType>();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const currentPlan = barbershop?.plan || 'basic';
  const currentPlanData = PLANS.find(p => p.id === currentPlan);

  useEffect(() => {
    checkSubscription();
  }, []);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Assinatura realizada com sucesso! 🎉');
      setTimeout(checkSubscription, 2000);
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout cancelado.');
    }
  }, [searchParams]);

  const checkSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscriptionData(data);
    } catch (err) {
      console.error('Error checking subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!barbershop || !isMaster) return;
    const stripePlan = STRIPE_PLANS[planId as StripePlanId];
    if (!stripePlan) return;

    setSelecting(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: stripePlan.price_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('URL de checkout não recebida');
    } catch (error: any) {
      console.error('Erro ao iniciar checkout:', error);
      toast.error(error?.message || 'Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setSelecting(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Assinatura cancelada. Você mantém o acesso até o final do período.');
      await checkSubscription();
    } catch (error: any) {
      console.error('Erro ao cancelar:', error);
      toast.error(error?.message || 'Erro ao cancelar assinatura. Tente novamente.');
    } finally {
      setCancelling(false);
    }
  };

  const isTrialActive = (() => {
    if (!barbershop?.trial_ends_at) return false;
    return new Date(barbershop.trial_ends_at) > new Date();
  })();

  const trialDaysRemaining = (() => {
    if (!barbershop?.trial_ends_at) return 0;
    const diff = new Date(barbershop.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const hasActiveStripeSubscription = subscriptionData?.subscribed === true;
  const isCancelScheduled = subscriptionData?.cancel_at_period_end === true;
  const isOwnerAccount = subscriptionData?.is_owner === true;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return <AssinaturaSkeleton />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Owner Account Card */}
      {isOwnerAccount && (
        <Card className="border-primary/30 overflow-hidden">
          <div className="h-1" style={{ background: 'var(--primary-gradient)' }} />
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plano atual</p>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  Rede
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Conta do Dono
                  </Badge>
                </h2>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-primary">Ilimitado</span>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-semibold">Acesso vitalício — sem cobrança</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Limite de barbeiros</p>
                  <p className="text-sm font-semibold">Ilimitado (até 20)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription Info Card (non-owner) */}
      {!isOwnerAccount && (hasActiveStripeSubscription || isTrialActive) && (
        <Card className={cn(
          "overflow-hidden",
          isCancelScheduled ? "border-destructive/30" : "border-primary/20"
        )}>
          <div className={cn(
            "h-1",
            isCancelScheduled
              ? "bg-destructive/60"
              : ""
          )} style={!isCancelScheduled ? { background: 'var(--primary-gradient)' } : {}} />
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plano atual</p>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {currentPlanData?.name || 'Basic'}
                  {hasActiveStripeSubscription && !isCancelScheduled && (
                    <Badge className="bg-green-600 text-white text-xs">Ativo</Badge>
                  )}
                  {isCancelScheduled && (
                    <Badge variant="destructive" className="text-xs">Cancelamento agendado</Badge>
                  )}
                  {isTrialActive && !hasActiveStripeSubscription && (
                    <Badge className="badge-gradient text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Teste grátis
                    </Badge>
                  )}
                </h2>
              </div>
              {hasActiveStripeSubscription && currentPlanData && (
                <div className="text-right">
                  <span className="text-2xl font-extrabold">
                    R$ {currentPlanData.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hasActiveStripeSubscription && subscriptionData?.subscription_start && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Início do período</p>
                    <p className="text-sm font-semibold">{formatDate(subscriptionData.subscription_start)}</p>
                  </div>
                </div>
              )}

              {hasActiveStripeSubscription && subscriptionData?.subscription_end && (
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    isCancelScheduled ? "bg-destructive/10" : "bg-primary/10"
                  )}>
                    {isCancelScheduled ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CreditCard className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isCancelScheduled ? 'Acesso até' : 'Próxima renovação'}
                    </p>
                    <p className="text-sm font-semibold">{formatDate(subscriptionData.subscription_end)}</p>
                  </div>
                </div>
              )}

              {isTrialActive && !hasActiveStripeSubscription && barbershop?.trial_ends_at && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Teste grátis expira em</p>
                    <p className="text-sm font-semibold">
                      {trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''} — {formatDate(barbershop.trial_ends_at)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Limite de barbeiros</p>
                  <p className="text-sm font-semibold">{currentPlanData?.label || '1 barbeiro'}</p>
                </div>
              </div>
            </div>

            {isCancelScheduled && subscriptionData?.subscription_end && (
              <>
                <Separator />
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Cancelamento agendado</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sua assinatura não será renovada. Você mantém acesso a todos os recursos até {formatDate(subscriptionData.subscription_end)}.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trial expired, no subscription (non-owner) */}
      {!isOwnerAccount && !isTrialActive && !hasActiveStripeSubscription && (
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center space-y-2">
            <Badge variant="destructive" className="text-sm px-3 py-1">
              Teste expirado — escolha um plano para continuar
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Plans Section (hidden for owner) */}
      {!isOwnerAccount && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">
              {hasActiveStripeSubscription ? 'Gerencie sua assinatura' : 'Escolha seu plano'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {hasActiveStripeSubscription
                ? 'Altere seu plano a qualquer momento, de forma simples e sem burocracia.'
                : 'Toda conta nova começa no plano Pro gratuitamente por 3 dias. Ao final do período, escolha o plano ideal para você.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((plan) => {
              const isSubscribedToPlan = hasActiveStripeSubscription && subscriptionData?.plan_id === plan.id;

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    'relative overflow-hidden transition-all duration-200 hover:shadow-lg',
                    plan.popular && 'ring-2 ring-primary shadow-lg',
                    isSubscribedToPlan && 'border-green-500 bg-green-500/5'
                  )}
                >
                  {plan.popular && (
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ background: 'var(--primary-gradient)' }}
                    />
                  )}

                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        {plan.popular && (
                          <Badge className="badge-gradient text-[10px]">Popular</Badge>
                        )}
                        {isSubscribedToPlan && (
                          <Badge className="bg-green-600 text-white text-[10px]">Seu Plano</Badge>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className="text-2xl font-extrabold">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                        <span className="text-muted-foreground text-sm">/mês</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-sm font-medium">{plan.label}</span>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-5 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        'w-full',
                        isSubscribedToPlan
                          ? 'bg-green-600 hover:bg-green-700 text-white opacity-60 cursor-default'
                          : 'btn-primary-gradient'
                      )}
                      disabled={isSubscribedToPlan || selecting !== null}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      {selecting === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSubscribedToPlan ? (
                        'Plano atual'
                      ) : hasActiveStripeSubscription ? (
                        'Alterar para este plano'
                      ) : (
                        'Assinar agora'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Subscription Section (hidden for owner) */}
      {!isOwnerAccount && hasActiveStripeSubscription && isMaster && !isCancelScheduled && (
        <div className="pt-4">
          <Separator className="mb-6" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Deseja cancelar sua assinatura?</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive text-sm">
                  Cancelar assinatura
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      Ao cancelar, sua assinatura não será renovada na próxima data de cobrança.
                    </p>
                    <p className="font-medium text-foreground">
                      Você continuará com acesso a todos os recursos até o final do período atual
                      {subscriptionData?.subscription_end && (
                        <> ({formatDate(subscriptionData.subscription_end)})</>
                      )}.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {cancelling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Confirmar cancelamento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assinatura;
