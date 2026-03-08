import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { supabase, Barbershop, Barber } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Users, Sparkles, Loader2, CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PLANS } from '@/lib/plans';
import { STRIPE_PLANS, StripePlanId } from '@/lib/stripe';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

const Assinatura = () => {
  const { barbershop, isMaster } = useOutletContext<ContextType>();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<{
    subscribed: boolean;
    plan_id: string | null;
    subscription_end: string | null;
  } | null>(null);
  const [searchParams] = useSearchParams();

  const currentPlan = barbershop?.plan || 'basic';

  // Check subscription on mount and after successful checkout
  useEffect(() => {
    checkSubscription();
  }, []);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Assinatura realizada com sucesso! 🎉');
      // Re-check after a short delay to let Stripe process
      setTimeout(checkSubscription, 2000);
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout cancelado.');
    }
  }, [searchParams]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscriptionData(data);
    } catch (err) {
      console.error('Error checking subscription:', err);
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

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (error: any) {
      console.error('Erro ao abrir portal:', error);
      toast.error(error?.message || 'Erro ao abrir portal de gerenciamento.');
    } finally {
      setManagingPortal(false);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Escolha o plano ideal para sua barbearia</h1>
        <p className="text-muted-foreground text-sm">
          Todos os planos incluem 3 dias de teste gratuito. Cancele quando quiser.
        </p>
        {isTrialActive && (
          <Badge className="badge-gradient text-sm px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''} restante{trialDaysRemaining !== 1 ? 's' : ''} de teste grátis
          </Badge>
        )}
        {!isTrialActive && !barbershop?.subscription_active && !hasActiveStripeSubscription && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            Teste expirado — escolha um plano para continuar
          </Badge>
        )}
        {hasActiveStripeSubscription && subscriptionData?.subscription_end && (
          <div className="flex flex-col items-center gap-2">
            <Badge className="bg-green-600 text-white text-sm px-3 py-1">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Assinatura ativa
            </Badge>
            <p className="text-xs text-muted-foreground">
              Próxima cobrança: {new Date(subscriptionData.subscription_end).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}
      </div>

      {/* Manage subscription button */}
      {hasActiveStripeSubscription && isMaster && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={managingPortal}
            className="gap-2"
          >
            {managingPortal ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Gerenciar assinatura
          </Button>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
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
                {/* Plan header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {plan.popular && (
                      <Badge className="badge-gradient text-[10px]">Popular</Badge>
                    )}
                    {isSubscribedToPlan && (
                      <Badge className="bg-green-600 text-white text-[10px]">
                        Seu Plano
                      </Badge>
                    )}
                    {isCurrent && !isSubscribedToPlan && (
                      <Badge variant="outline" className="text-[10px] border-primary text-primary">
                        Atual
                      </Badge>
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

                {/* Features */}
                <ul className="space-y-2 mb-5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action */}
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
                    'Trocar plano'
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
  );
};

export default Assinatura;
