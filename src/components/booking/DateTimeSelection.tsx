import { useState } from 'react';
import { DAY_NAMES_SHORT } from '@/lib/supabase';
import { useAvailability } from '@/hooks/useAvailability';
import { Timer as Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, addDays, startOfDay, isSameDay, isAfter, isBefore, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateTimeSelectionProps {
  barberId: string;
  serviceDuration: number;
  onSelect: (dateTime: Date) => void;
}

export function DateTimeSelection({ barberId, serviceDuration, onSelect }: DateTimeSelectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(startOfDay(new Date()));

  const { 
    loading, 
    getAvailableSlotsForDate, 
    getOpeningHoursForDay 
  } = useAvailability({ 
    barberId, 
    serviceDuration 
  });

  const getDaysToShow = () => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    setSelectedTime(time);
    const [hours, minutes] = time.split(':').map(Number);
    const dateTime = setMinutes(setHours(selectedDate, hours), minutes);
    // Call synchronously so parent state is updated in the same React batch
    onSelect(dateTime);
  };

  const goToPreviousWeek = () => {
    const newStart = addDays(weekStart, -7);
    if (isAfter(newStart, addDays(startOfDay(new Date()), -1))) {
      setWeekStart(newStart);
    }
  };

  const goToNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <PremiumSkeleton variant="text" className="w-52 h-6" />
          <PremiumSkeleton variant="text" className="w-64 h-4 mt-2" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <PremiumSkeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <PremiumSkeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const days = getDaysToShow();
  const availableSlots = selectedDate ? getAvailableSlotsForDate(selectedDate, serviceDuration) : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">Escolha a data e horário</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Selecione quando deseja ser atendido
        </p>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousWeek}
          disabled={isSameDay(weekStart, startOfDay(new Date()))}
          className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-95 rounded-xl"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm capitalize">
          {format(weekStart, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={goToNextWeek}
          className="transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-95 rounded-xl"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayOfWeek = day.getDay();
          const isOpen = !!getOpeningHoursForDay(dayOfWeek);
          const isPast = isBefore(day, startOfDay(new Date()));
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isSelectable = !isPast && isOpen;
          const hasSlots = isSelectable && getAvailableSlotsForDate(day, serviceDuration).length > 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => isSelectable && handleDateSelect(day)}
              disabled={!isSelectable}
              className={cn(
                'flex flex-col items-center p-2.5 rounded-2xl border transition-all duration-200 ease-out',
                isSelectable && 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer border-border/30',
                !isSelectable && 'opacity-40 cursor-not-allowed border-transparent bg-muted/30',
                isSelectable && !hasSlots && 'opacity-60 border-border/20',
                isSelected && 'text-primary-foreground border-primary shadow-md hover:border-primary !opacity-100'
              )}
              style={isSelected ? { background: 'var(--primary-gradient)' } : undefined}
            >
              <span className="text-[10px] font-semibold uppercase">
                {DAY_NAMES_SHORT[dayOfWeek]}
              </span>
              <span className="text-lg font-bold mt-0.5">
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time Slots - GROUPED BY PERIOD */}
      {selectedDate && (
        <div className="space-y-6 animate-fade-in">
          <h3 className="font-semibold text-sm">
            Horários para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h3>

          {availableSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-border/20 bg-muted/10">
              <p className="font-bold text-sm tracking-wide uppercase">
                Todos os horários deste dia já foram reservados.
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Tente selecionar outro dia ou fale com a barbearia.
              </p>
            </div>
          ) : (
            (() => {
              const periods: { label: string; slots: string[] }[] = [
                { label: 'Manhã', slots: [] },
                { label: 'Tarde', slots: [] },
                { label: 'Noite', slots: [] },
              ];
              availableSlots.forEach((t) => {
                const h = parseInt(t.split(':')[0], 10);
                if (h < 12) periods[0].slots.push(t);
                else if (h < 18) periods[1].slots.push(t);
                else periods[2].slots.push(t);
              });
              return (
                <div className="space-y-7">
                  {periods.filter(p => p.slots.length > 0).map((period) => (
                    <div key={period.label} className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                        {period.label}
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                        {period.slots.map((time) => (
                          <button
                            key={time}
                            onClick={() => handleTimeSelect(time)}
                            className={cn(
                              'py-3.5 px-2 rounded-2xl border font-semibold text-sm transition-colors duration-150',
                              'active:scale-[0.97]',
                              selectedTime === time
                                ? 'border-primary text-primary-foreground shadow-md'
                                : 'border-border/30 bg-secondary/50 active:bg-secondary'
                            )}
                            style={selectedTime === time ? { background: 'var(--primary-gradient)' } : undefined}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
