import { useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, UsersRound as Users, Loader2, LogOut, TriangleAlert as AlertTriangle } from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { STRIPE_PLANS, StripePlanId } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TrialExpirado = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
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
      toast.error(error?.message || 'Erro ao iniciar checkout.');
    } finally {
      setSelecting(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-destructive/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="mb-8">
          <Logo size="lg" linkTo={undefined} />
        </div>

        {/* Warning */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium mb-6">
            <AlertTriangle className="h-4 w-4" />
            Teste grátis encerrado
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Seu teste grátis terminou
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Escolha um plano para continuar usando o Bookify e gerenciando sua barbearia.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl w-full mb-8">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'relative overflow-hidden transition-all duration-200 hover:shadow-lg',
                plan.popular && 'ring-2 ring-primary shadow-lg'
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--primary-gradient)' }} />
              )}
              <CardContent className="p-5 flex flex-col h-full">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {plan.popular && (
                      <Badge className="badge-gradient text-[10px]">Popular</Badge>
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
                  className={cn('w-full', plan.popular ? 'btn-primary-gradient' : '')}
                  variant={plan.popular ? 'default' : 'outline'}
                  disabled={selecting !== null}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {selecting === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Assinar agora'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sign out */}
        <Button variant="ghost" className="text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
};

export default TrialExpirado;
