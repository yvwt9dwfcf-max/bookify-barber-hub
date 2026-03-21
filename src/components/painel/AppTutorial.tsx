import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Sparkles, Share2, PartyPopper, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface AppTutorialProps {
  barbershopId: string;
  onComplete: () => void;
}

const steps = [
  {
    icon: CalendarDays,
    title: 'Sua Agenda',
    description: 'Aqui você visualiza e gerencia todos os agendamentos do dia. Seus clientes podem agendar online e os horários aparecem automaticamente.',
    tip: 'Toque em qualquer horário para criar um agendamento manual.',
    color: 'hsl(var(--primary))',
  },
  {
    icon: Sparkles,
    title: 'Seus Serviços',
    description: 'Cadastre os serviços que você oferece com preço e duração. Eles aparecerão para seus clientes na hora de agendar.',
    tip: 'Você pode adicionar fotos dos seus trabalhos em cada serviço.',
    color: 'hsl(var(--accent))',
  },
  {
    icon: Share2,
    title: 'Perfil Público',
    description: 'Configure seu perfil público para compartilhar o link da sua barbearia. Adicione logo, foto de capa, endereço e redes sociais.',
    tip: 'Compartilhe o link nas suas redes sociais para receber agendamentos.',
    color: 'hsl(var(--primary))',
    highlight: true,
  },
  {
    icon: PartyPopper,
    title: 'Tudo pronto!',
    description: 'Agora você pode organizar seus atendimentos, fidelizar clientes e aproveitar tudo que o Bookify oferece.',
    tip: null,
    color: 'hsl(var(--primary))',
  },
];

const AppTutorial = ({ barbershopId, onComplete }: AppTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const markCompleted = async () => {
    await supabase
      .from('barbershops')
      .update({ tutorial_completed: true } as any)
      .eq('id', barbershopId);
    onComplete();
  };

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      markCompleted();
    } else {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    markCompleted();
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Skip button */}
        {!isLast && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Content */}
        <div className="px-6 pt-8 pb-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -direction * 40, filter: 'blur(4px)' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center"
            >
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: `linear-gradient(135deg, ${step.color}20, ${step.color}10)`,
                  border: `1px solid ${step.color}30`,
                }}
              >
                <Icon className="h-7 w-7" style={{ color: step.color }} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-foreground mb-2 tracking-tight">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {step.description}
              </p>

              {/* Tip */}
              {step.tip && (
                <div className="w-full rounded-xl bg-muted/40 border border-border/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground/80">
                    💡 {step.tip}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === currentStep ? 20 : 6,
                  backgroundColor:
                    i === currentStep
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--muted-foreground) / 0.2)',
                }}
              />
            ))}
          </div>

          {/* Action button */}
          <Button
            onClick={handleNext}
            size="sm"
            className="rounded-xl gap-1.5 active:scale-[0.97] transition-transform"
          >
            {isLast ? 'Começar' : 'Próximo'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AppTutorial;
