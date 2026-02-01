import { useState, useEffect } from 'react';
import { supabase, OpeningHours, BlockedSlot, Appointment, DAY_NAMES_SHORT } from '@/lib/supabase';
import { Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, addDays, startOfDay, isSameDay, isAfter, isBefore, addMinutes, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateTimeSelectionProps {
  barberId: string;
  serviceDuration: number;
  onSelect: (dateTime: Date) => void;
}

export function DateTimeSelection({ barberId, serviceDuration, onSelect }: DateTimeSelectionProps) {
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(startOfDay(new Date()));

  useEffect(() => {
    fetchData();
  }, [barberId]);

  const fetchData = async () => {
    try {
      const [hoursRes, blockedRes, appointmentsRes] = await Promise.all([
        supabase.from('opening_hours').select('*').eq('barber_id', barberId),
        supabase.from('blocked_slots').select('*').eq('barber_id', barberId),
        supabase
          .from('appointments')
          .select('*')
          .eq('barber_id', barberId)
          .neq('status', 'cancelled')
          .gte('start_time', new Date().toISOString()),
      ]);

      setOpeningHours(hoursRes.data || []);
      setBlockedSlots(blockedRes.data || []);
      setAppointments((appointmentsRes.data as Appointment[]) || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysToShow = () => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  };

  const getOpeningHoursForDay = (dayOfWeek: number) => {
    return openingHours.find(h => h.day_of_week === dayOfWeek && h.is_open);
  };

  const getAvailableSlots = (date: Date): string[] => {
    const dayOfWeek = date.getDay();
    const hours = getOpeningHoursForDay(dayOfWeek);
    
    if (!hours) return [];

    const slots: string[] = [];
    const [startHour, startMin] = hours.start_time.split(':').map(Number);
    const [endHour, endMin] = hours.end_time.split(':').map(Number);

    // Parse break times if they exist
    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;
    if (hours.break_start && hours.break_end) {
      const [bsHour, bsMin] = hours.break_start.split(':').map(Number);
      const [beHour, beMin] = hours.break_end.split(':').map(Number);
      breakStart = setMinutes(setHours(date, bsHour), bsMin);
      breakEnd = setMinutes(setHours(date, beHour), beMin);
    }

    let current = setMinutes(setHours(date, startHour), startMin);
    const endTime = setMinutes(setHours(date, endHour), endMin);
    const now = new Date();

    while (isBefore(addMinutes(current, serviceDuration), endTime) || 
           isSameDay(addMinutes(current, serviceDuration), endTime) && 
           addMinutes(current, serviceDuration).getTime() <= endTime.getTime()) {
      
      if (isAfter(current, now)) {
        const slotEnd = addMinutes(current, serviceDuration);
        
        // Check break time - slot overlaps with break
        const isDuringBreak = breakStart && breakEnd && 
          isBefore(current, breakEnd) && isAfter(slotEnd, breakStart);

        // Check blocked slots
        const isBlocked = blockedSlots.some(blocked => {
          const blockedStart = new Date(blocked.start_time);
          const blockedEnd = new Date(blocked.end_time);
          return isBefore(current, blockedEnd) && isAfter(slotEnd, blockedStart);
        });

        // Check appointments
        const hasAppointment = appointments.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return isBefore(current, aptEnd) && isAfter(slotEnd, aptStart);
        });

        if (!isDuringBreak && !isBlocked && !hasAppointment) {
          slots.push(format(current, 'HH:mm'));
        }
      }

      current = addMinutes(current, 30); // 30 min intervals
    }

    return slots;
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
  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : [];

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
          const hasSlots = !isPast && isOpen && getAvailableSlots(day).length > 0;

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
