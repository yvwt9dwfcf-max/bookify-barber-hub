import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase, Appointment, Barber } from '@/lib/supabase';
import { toast } from 'sonner';

interface MonthlyCalendarProps {
  barber: Barber;
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

interface DayAppointments {
  [key: string]: {
    confirmed: number;
    completed: number;
    cancelled: number;
  };
}

const MonthlyCalendar = ({ barber, onDateSelect, selectedDate }: MonthlyCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const [dayAppointments, setDayAppointments] = useState<DayAppointments>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonthAppointments();
  }, [barber, currentMonth]);

  const fetchMonthAppointments = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, status')
        .eq('barber_id', barber.id)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString());

      if (error) throw error;

      const grouped: DayAppointments = {};
      (data || []).forEach((apt) => {
        const dateKey = format(new Date(apt.start_time), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = { confirmed: 0, completed: 0, cancelled: 0 };
        }
        if (apt.status === 'confirmed') grouped[dateKey].confirmed++;
        else if (apt.status === 'completed') grouped[dateKey].completed++;
        else if (apt.status === 'cancelled') grouped[dateKey].cancelled++;
      });

      setDayAppointments(grouped);
    } catch (error) {
      console.error('Erro ao buscar agendamentos do mês:', error);
      toast.error('Erro ao carregar calendário');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (day: Date) => {
    onDateSelect(day);
  };

  const days = getDaysInMonth();
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-8 w-8 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] font-medium text-muted-foreground py-1.5"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const appointments = dayAppointments[dateKey];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const totalAppointments = appointments 
                  ? appointments.confirmed + appointments.completed + appointments.cancelled 
                  : 0;

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'relative flex flex-col items-center justify-start p-1 h-14 sm:h-16 rounded-xl transition-all',
                      'hover:bg-accent/50 active:scale-95',
                      !isCurrentMonth && 'opacity-30',
                      isSelected && 'bg-primary text-primary-foreground hover:bg-primary shadow-md',
                      isToday && !isSelected && 'ring-1 ring-primary/50'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-medium',
                      isSelected && 'text-primary-foreground'
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {totalAppointments > 0 && (
                      <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                        {appointments.confirmed > 0 && (
                          <span className={cn(
                            'text-[9px] px-1 rounded-full font-medium',
                            isSelected 
                              ? 'bg-primary-foreground/20 text-primary-foreground' 
                              : 'bg-primary/15 text-primary'
                          )}>
                            {appointments.confirmed}
                          </span>
                        )}
                        {appointments.completed > 0 && (
                          <span className={cn(
                            'text-[9px] px-1 rounded-full font-medium',
                            isSelected 
                              ? 'bg-primary-foreground/20 text-primary-foreground' 
                              : 'bg-success/15 text-success'
                          )}>
                            {appointments.completed}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary/20"></span>
                <span className="text-[10px] text-muted-foreground">Confirmados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success/20"></span>
                <span className="text-[10px] text-muted-foreground">Concluídos</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyCalendar;
