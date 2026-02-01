import { useState } from 'react';
import { DAY_NAMES_SHORT } from '@/lib/supabase';
import { useAvailability } from '@/hooks/useAvailability';
import { Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const days = getDaysToShow();
  const availableSlots = selectedDate ? getAvailableSlotsForDate(selectedDate, serviceDuration) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Escolha a data e horário</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Selecione quando deseja ser atendido
        </p>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousWeek}
          disabled={isSameDay(weekStart, startOfDay(new Date()))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">
          {format(weekStart, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <Button variant="outline" size="icon" onClick={goToNextWeek}>
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
                'flex flex-col items-center p-2 rounded-lg transition-all duration-200',
                hasSlots && 'hover:bg-accent cursor-pointer',
                !hasSlots && 'opacity-50 cursor-not-allowed',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary'
              )}
            >
              <span className="text-xs font-medium uppercase">
                {DAY_NAMES_SHORT[dayOfWeek]}
              </span>
              <span className="text-lg font-bold mt-1">
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="mt-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horários disponíveis para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h3>
          
          {availableSlots.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum horário disponível para esta data.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={cn(
                    'py-2 px-3 rounded-lg border-2 font-medium transition-all duration-200',
                    'hover:border-primary hover:bg-accent',
                    selectedTime === time
                      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary'
                      : 'border-border'
                  )}
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
