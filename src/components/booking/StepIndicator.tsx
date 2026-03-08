import { UserRound as User, Sparkles as Scissors, CalendarDays as Calendar, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingStep } from './BookingFlow';

interface StepIndicatorProps {
  currentStep: BookingStep;
}

const steps = [
  { key: 'barber', label: 'Profissional', icon: User },
  { key: 'service', label: 'Serviço', icon: Scissors },
  { key: 'datetime', label: 'Data/Hora', icon: Calendar },
  { key: 'info', label: 'Dados', icon: FileText },
] as const;

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-between px-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.key === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
                  isCompleted && 'text-primary-foreground shadow-md',
                  isCurrent && 'text-primary-foreground ring-4 ring-primary/20 shadow-md',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
                style={(isCompleted || isCurrent) ? { background: 'var(--primary-gradient)' } : undefined}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1.5 font-semibold',
                  isCurrent && 'text-primary',
                  !isCurrent && !isCompleted && 'text-muted-foreground',
                  isCompleted && 'text-foreground'
                )}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-8 sm:w-16 h-0.5 mx-1.5 rounded-full transition-all',
                  index < currentIndex ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
