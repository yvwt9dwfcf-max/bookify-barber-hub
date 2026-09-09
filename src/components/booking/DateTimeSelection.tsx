import { useState } from 'react';
import { DAY_NAMES_SHORT } from '@/lib/supabase';
import { useAvailability } from '@/hooks/useAvailability';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { cn } from '@/lib/utils';
import { format, addDays, startOfDay, isSameDay, isAfter, isBefore, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateTimeSelectionProps {
  barberId: string;
  serviceDuration: number;
  onSelect: (dateTime: Date) => void;
}

const LINE = 'rgba(242,238,228,0.14)';
type Period = 'Manhã' | 'Tarde' | 'Noite';

const periodOf = (time: string): Period => {
  const h = parseInt(time.split(':')[0], 10);
  if (h < 12) return 'Manhã';
  if (h < 18) return 'Tarde';
  return 'Noite';
};

export function DateTimeSelection({ barberId, serviceDuration, onSelect }: DateTimeSelectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(startOfDay(new Date()));
  const [period, setPeriod] = useState<Period>('Manhã');

  const {
    loading,
    getAvailableSlotsForDate,
    getOpeningHoursForDay,
  } = useAvailability({
    barberId,
    serviceDuration,
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
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <PremiumSkeleton key={i} className="h-16 w-14 rounded-xl" />
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
  const availableSet = new Set(availableSlots);

  // Build the visible grid from opening hours so booked times stay listed (struck through),
  // while availability itself keeps coming from the existing engine.
  const buildGrid = (): string[] => {
    if (!selectedDate) return [];
    const dayHours = getOpeningHoursForDay(selectedDate.getDay());
    if (!dayHours) return availableSlots;
    const [sh, sm] = dayHours.start_time.split(':').map(Number);
    const [eh, em] = dayHours.end_time.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    const times = new Set<string>(availableSlots);
    for (let t = start; t + serviceDuration <= end; t += 30) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      times.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    return [...times].sort();
  };

  const grid = buildGrid();
  const periods: Period[] = ['Manhã', 'Tarde', 'Noite'];
  const gridForPeriod = grid.filter(t => periodOf(t) === period);

  return (
    <div className="space-y-8">
      <div>
        <p
          className="font-editorial-mono text-[10px] uppercase tracking-[0.18em] mb-2"
          style={{ color: '#22C55E' }}
        >
          — Data e horário
        </p>
        <h2 className="font-display text-2xl font-semibold">Escolha a data e horário</h2>
        <p className="text-sm mt-1" style={{ color: '#8C887C' }}>
          Selecione quando deseja ser atendido
        </p>
      </div>

      {/* Navegação de semana */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousWeek}
          disabled={isSameDay(weekStart, startOfDay(new Date()))}
          className="w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
          style={{ border: `1px solid ${LINE}` }}
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-editorial-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: '#8C887C' }}>
          {format(weekStart, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <button
          onClick={goToNextWeek}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ border: `1px solid ${LINE}` }}
          aria-label="Próxima semana"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Pills de dias */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {days.map((day) => {
          const dayOfWeek = day.getDay();
          const isOpen = !!getOpeningHoursForDay(dayOfWeek);
          const isPast = isBefore(day, startOfDay(new Date()));
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isSelectable = !isPast && isOpen;

          return (
            <button
              key={day.toISOString()}
              onClick={() => isSelectable && handleDateSelect(day)}
              disabled={!isSelectable}
              className={cn(
                'flex flex-col items-center justify-center flex-shrink-0 w-14 py-2.5 rounded-xl font-sans transition-colors duration-200',
                !isSelectable && 'opacity-35 cursor-not-allowed'
              )}
              style={{
                border: `1px solid ${isSelected ? '#22C55E' : LINE}`,
                background: isSelected ? '#22C55E' : 'transparent',
                color: isSelected ? '#0A0A08' : undefined,
              }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {DAY_NAMES_SHORT[dayOfWeek]}
              </span>
              <span className="text-base font-semibold mt-0.5">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="space-y-5 animate-fade-in">
          {/* Abas de período */}
          <div className="flex gap-2">
            {periods.map((p) => {
              const active = p === period;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-4 py-1.5 rounded-full font-editorial-mono text-[10px] uppercase tracking-[0.16em] transition-colors"
                  style={{
                    border: `1px solid ${active ? '#F2EEE4' : LINE}`,
                    color: active ? '#F2EEE4' : '#8C887C',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {grid.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl"
              style={{ border: `1px solid ${LINE}` }}
            >
              <p className="font-display text-base">Todos os horários deste dia já foram reservados.</p>
              <p className="text-xs mt-2" style={{ color: '#8C887C' }}>
                Tente selecionar outro dia ou fale com a barbearia.
              </p>
            </div>
          ) : gridForPeriod.length === 0 ? (
            <p className="text-xs py-8 text-center" style={{ color: '#8C887C' }}>
              Nenhum horário neste período.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {gridForPeriod.map((time) => {
                const isAvailable = availableSet.has(time);
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => isAvailable && handleTimeSelect(time)}
                    disabled={!isAvailable}
                    className={cn(
                      'py-3 px-2 rounded-xl font-editorial-mono text-[13px] transition-colors duration-150',
                      isAvailable && 'active:scale-[0.97]',
                      !isAvailable && 'line-through cursor-not-allowed'
                    )}
                    style={{
                      border: `1px solid ${isSelected ? '#22C55E' : LINE}`,
                      background: isSelected ? '#22C55E' : 'transparent',
                      color: isSelected ? '#0A0A08' : isAvailable ? undefined : 'rgba(140,136,124,0.55)',
                    }}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
