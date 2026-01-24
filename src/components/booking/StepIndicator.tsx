import { User, Scissors, Calendar, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingStep } from './BookingFlow';

interface StepIndicatorProps {
  currentStep: BookingStep;
}

const steps = [
  { key: 'barber', label: 'Profissional', icon: User },
  { key: 'service', label: 'Serviço', icon: Scissors },
  { key: 'datetime', label: 'Data/Hora', icon: Calendar },
  { key: 'info', label: 'Seus dados', icon: FileText },
] as const;

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-between px-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.key === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-2 font-medium hidden sm:block',
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
                  'w-12 sm:w-20 h-0.5 mx-2',
                  index < currentIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
