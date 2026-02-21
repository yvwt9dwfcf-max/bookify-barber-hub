import { useState } from 'react';
import { DAY_NAMES_SHORT } from '@/lib/supabase';
import { useAvailability } from '@/hooks/useAvailability';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
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
    setSelectedTime(time);
    if (selectedDate) {
      const [hours, minutes] = time.split(':').map(Number);
      const dateTime = setMinutes(setHours(selectedDate, hours), minutes);
      setTimeout(() => onSelect(dateTime), 150);
    }
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
          const hasSlots = !isPast && isOpen && getAvailableSlotsForDate(day, serviceDuration).length > 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => hasSlots && handleDateSelect(day)}
              disabled={!hasSlots}
              className={cn(
                'flex flex-col items-center p-2.5 rounded-xl border-2 transition-all duration-200 ease-out',
                hasSlots && 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer border-border/30',
                !hasSlots && 'opacity-40 cursor-not-allowed border-transparent bg-muted/30',
                isSelected && 'text-primary-foreground border-primary shadow-md hover:border-primary'
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

      {/* Time Slots - GRID */}
      {selectedDate && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Horários disponíveis para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h3>
          
          {availableSlots.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              Nenhum horário disponível para esta data.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {availableSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={cn(
                    'py-3 px-2 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ease-out',
                    'hover:-translate-y-0.5 hover:shadow-md active:scale-95',
                    selectedTime === time
                      ? 'border-primary text-primary-foreground shadow-md'
                      : 'border-border/30 hover:border-primary/40 bg-card/60'
                  )}
                  style={selectedTime === time ? { background: 'var(--primary-gradient)' } : undefined}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
