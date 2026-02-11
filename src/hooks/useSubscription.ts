import { useCallback } from 'react';
import { useUserRole } from './useUserRole';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function useSubscription() {
  const { barbershop, isMaster } = useUserRole();
  const navigate = useNavigate();

  const isTrialActive = useCallback(() => {
    if (!barbershop) return false;
    if (!barbershop?.trial_ends_at) return false;
    return new Date(barbershop.trial_ends_at) > new Date();
  }, [barbershop]);

  const isSubscriptionActive = useCallback(() => {
    if (!barbershop) return false;
    if (isTrialActive()) return true;
    return barbershop.subscription_active === true;
  }, [barbershop, isTrialActive]);

  const trialDaysRemaining = useCallback(() => {
    if (!barbershop?.trial_ends_at) return 0;
    const trialEnds = barbershop.trial_ends_at;
    if (!trialEnds) return 0;
    const diff = new Date(trialEnds).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [barbershop]);

  const checkCanPerformAction = useCallback((action: 'create_appointment' | 'create_barber' | 'complete_appointment') => {
    if (isSubscriptionActive()) return true;
    
    const messages: Record<string, string> = {
      create_appointment: 'Seu período de teste expirou. Escolha um plano para continuar agendando.',
      create_barber: 'Seu período de teste expirou. Escolha um plano para adicionar barbeiros.',
      complete_appointment: 'Seu período de teste expirou. Escolha um plano para concluir atendimentos.',
    };

    toast.error(messages[action]);
    navigate('/painel/assinatura');
    return false;
  }, [isSubscriptionActive, navigate]);

  const checkBarberLimit = useCallback((currentCount: number) => {
    if (!barbershop) return false;
    const limit = barbershop.max_barbers;
    if (currentCount >= limit) {
      toast.error(`Seu plano permite até ${limit} barbeiro${limit > 1 ? 's' : ''}.`);
      navigate('/painel/assinatura');
      return false;
    }
    return true;
  }, [barbershop, navigate]);

  return {
    isTrialActive: isTrialActive(),
    isSubscriptionActive: isSubscriptionActive(),
    trialDaysRemaining: trialDaysRemaining(),
    checkCanPerformAction,
    checkBarberLimit,
    barbershop,
    isMaster,
  };
}
