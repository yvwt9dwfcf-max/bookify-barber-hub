import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, Appointment, Barber, DAY_NAMES } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, User, Clock, Phone, Loader2, Plus, Trash2 } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ContextType {
  barber: Barber | null;
}

const Agenda = () => {
  const { barber } = useOutletContext<ContextType>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));

  useEffect(() => {
    if (barber) {
      fetchAppointments();
    }
  }, [barber, selectedDate]);

  const fetchAppointments = async () => {
    if (!barber) return;

    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = addDays(startOfSelectedDay, 1);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(*)
        `)
        .eq('barber_id', barber.id)
        .gte('start_time', startOfSelectedDay.toISOString())
        .lt('start_time', endOfSelectedDay.toISOString())
        .order('start_time');

      if (error) throw error;
      setAppointments((data as Appointment[]) || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Agendamento excluído');
      fetchAppointments();
    } catch (error) {
      toast.error('Erro ao excluir agendamento');
    }
  };

  const handleStatusChange = async (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success('Status atualizado');
      fetchAppointments();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary/10 text-primary';
      case 'completed':
        return 'bg-success/10 text-success';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getDaysToShow = () => {
    const days: Date[] = [];
    for (let i = -3; i <= 3; i++) {
      days.push(addDays(startOfDay(new Date()), i));
    }
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const days = getDaysToShow();
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">
            Gerencie seus agendamentos do dia
          </p>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'flex flex-col items-center p-2 rounded-lg transition-all',
                    'hover:bg-accent',
                    isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                    isToday && !isSelected && 'ring-2 ring-primary'
                  )}
                >
                  <span className="text-xs font-medium uppercase">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className="text-lg font-bold">{format(day, 'd')}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{confirmedCount}</p>
            <p className="text-sm text-muted-foreground">Confirmados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{completedCount}</p>
            <p className="text-sm text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum agendamento para este dia
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
                >
                  <div className="flex-shrink-0 text-center">
                    <p className="text-lg font-bold">
                      {format(new Date(appointment.start_time), 'HH:mm')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appointment.end_time), 'HH:mm')}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate">
                        {appointment.customer_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{appointment.customer_phone}</span>
                    </div>
                    {appointment.service && (
                      <p className="text-sm text-primary mt-1">
                        {appointment.service.name}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getStatusColor(appointment.status)
                      )}
                    >
                      {getStatusLabel(appointment.status)}
                    </span>
                    
                    <div className="flex gap-1">
                      {appointment.status === 'confirmed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(appointment.id, 'completed')}
                        >
                          Concluir
                        </Button>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O agendamento será permanentemente excluído.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAppointment(appointment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Agenda;
