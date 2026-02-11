import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, Barbershop, Barber } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Users, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    barbers: 1,
    label: '1 barbeiro',
    maxBarbers: 1,
    features: ['Agenda completa', 'Link de agendamento', 'Relatórios básicos'],
  },
  {
    id: 'plus',
    name: 'Plus',
    barbers: 3,
    label: 'até 3 barbeiros',
    maxBarbers: 3,
    features: ['Tudo do Basic', 'Gestão de equipe', 'Permissões por barbeiro'],
  },
  {
    id: 'pro',
    name: 'Pro',
    barbers: 6,
    label: 'até 6 barbeiros',
    maxBarbers: 6,
    popular: true,
    features: ['Tudo do Plus', 'Relatórios avançados', 'Bloqueios de horário'],
  },
  {
    id: 'studio',
    name: 'Studio',
    barbers: 12,
    label: 'até 12 barbeiros',
    maxBarbers: 12,
    features: ['Tudo do Pro', 'Gestão completa', 'Suporte prioritário'],
  },
  {
    id: 'rede',
    name: 'Rede',
    barbers: 20,
    label: 'acima de 12 barbeiros',
    maxBarbers: 20,
    features: ['Tudo do Studio', 'Múltiplas unidades', 'Dashboard consolidado'],
  },
];

const Assinatura = () => {
  const { barbershop, isMaster } = useOutletContext<ContextType>();
  const [selecting, setSelecting] = useState<string | null>(null);

  const currentPlan = barbershop?.plan || 'basic';

  const handleSelectPlan = async (planId: string, maxBarbers: number) => {
    if (!barbershop || !isMaster) return;

    setSelecting(planId);
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          plan: planId as any,
          max_barbers: maxBarbers,
        })
        .eq('id', barbershop.id);

      if (error) throw error;

      toast.success(
        'Plano selecionado.\nFinalize o pagamento para ativar sua assinatura.',
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Erro ao selecionar plano:', error);
      toast.error('Erro ao selecionar plano');
    } finally {
      setSelecting(null);
    }
  };

  const isTrialActive = (() => {
    if (!barbershop?.trial_ends_at) return false;
    return new Date(barbershop.trial_ends_at) > new Date();
  })();

  const trialDaysRemaining = (() => {
    if (!barbershop?.trial_ends_at) return 0;
    const trialEnds = barbershop.trial_ends_at;
    if (!trialEnds) return 0;
    const diff = new Date(trialEnds).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Escolha seu plano</h1>
        <p className="text-muted-foreground text-sm">
          Selecione o plano ideal para o tamanho da sua barbearia
        </p>
        {isTrialActive && (
          <Badge className="badge-gradient text-sm px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''} restante{trialDaysRemaining !== 1 ? 's' : ''} de teste grátis
          </Badge>
        )}
        {!isTrialActive && !barbershop?.subscription_active && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            Teste expirado — escolha um plano para continuar
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative overflow-hidden transition-all duration-200 hover:shadow-lg',
                plan.popular && 'ring-2 ring-primary shadow-lg',
                isCurrent && 'border-primary bg-primary/5'
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
                    {isCurrent && (
                      <Badge variant="outline" className="text-[10px] border-primary text-primary">
                        Atual
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
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
                    isCurrent ? 'btn-primary-gradient opacity-60 cursor-default' : 'btn-primary-gradient'
                  )}
                  disabled={isCurrent || selecting !== null}
                  onClick={() => handleSelectPlan(plan.id, plan.maxBarbers)}
                >
                  {selecting === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    'Plano atual'
                  ) : (
                    'Escolher plano'
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
