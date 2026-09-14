import { cn } from '@/lib/utils';
import { BookingStep } from './BookingFlow';
import { BookingAppearance, DEFAULT_BOOKING_APPEARANCE, isUrbanAppearance } from './bookingAppearance';

interface StepIndicatorProps {
  currentStep: BookingStep;
  appearance?: BookingAppearance;
}

const steps = [
  { key: 'barber', label: 'Profissional' },
  { key: 'service', label: 'Serviço' },
  { key: 'datetime', label: 'Data e horário' },
  { key: 'info', label: 'Seus dados' },
  { key: 'confirmation', label: 'Confirmação' },
] as const;

export function StepIndicator({ currentStep, appearance = DEFAULT_BOOKING_APPEARANCE }: StepIndicatorProps) {
  const currentIndex = Math.max(0, steps.findIndex(s => s.key === currentStep));
  const isUrban = isUrbanAppearance(appearance);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span
          className={isUrban ? 'font-sans text-xs font-bold uppercase' : 'font-editorial-mono text-[10px] uppercase tracking-[0.18em]'}
          style={{ color: appearance.accentColor }}
        >
          Passo {String(currentIndex + 1).padStart(2, '0')}
        </span>
        <span
          className={isUrban ? 'font-sans text-xs font-bold uppercase' : 'font-editorial-mono text-[10px] uppercase tracking-[0.18em]'}
          style={{ color: '#8C887C' }}
        >
          {steps[currentIndex].label}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={cn('flex-1 transition-colors duration-300', isUrban ? 'rounded-2xl' : 'rounded-full')}
            style={{
              height: 2,
              background: index <= currentIndex ? appearance.accentColor : 'rgba(242,238,228,0.14)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
