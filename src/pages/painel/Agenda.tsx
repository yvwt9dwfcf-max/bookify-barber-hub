import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase, Appointment, Barber, Barbershop } from '@/lib/supabase';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, CalendarDays, ChevronLeft, ChevronRight, 
  User, Loader2, CheckCircle2, Clock, Sparkles, CalendarPlus
} from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MonthlyCalendar from '@/components/painel/MonthlyCalendar';
import ManualAppointmentDialog from '@/components/painel/ManualAppointmentDialog';
import FloatingActionButton from '@/components/painel/FloatingActionButton';
import AppointmentDetailsSheet from '@/components/painel/AppointmentDetailsSheet';
import EditAppointmentDialog from '@/components/painel/EditAppointmentDialog';

interface ContextType {
  barber: (Barber & { permissions?: { can_view_others_schedule?: boolean; can_edit_others_schedule?: boolean } }) | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

type ViewMode = 'daily' | 'monthly';


const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'border-l-primary bg-primary/5';
    case 'completed':
      return 'border-l-emerald-500 bg-emerald-500/5';
    case 'cancelled':
      return 'border-l-destructive bg-destructive/5';
    default:
      return 'border-l-amber-500 bg-amber-500/5';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-primary/10 text-primary border border-primary/20';
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
    case 'cancelled':
      return 'bg-destructive/10 text-destructive border border-destructive/20';
    default:
      return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
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
      return 'Pendente';
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

// Generate timeline hours
const generateTimelineHours = () => {
  const hours: string[] = [];
  for (let h = 7; h <= 21; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return hours;
};

const Agenda = () => {
  const { barber, isMaster } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const { barbers } = useBarbershopBarbers();
  const { checkCanPerformAction } = useSubscription();

  const canViewOthers = isMaster || barber?.permissions?.can_view_others_schedule === true;
  const canCreateForOthers = isMaster || barber?.permissions?.can_edit_others_schedule === true;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [showManualDialog, setShowManualDialog] = useState(false);

  const handleOpenManualDialog = () => {
    if (!checkCanPerformAction('create_appointment')) return;
    setShowManualDialog(true);
  };
  
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  
  const selectedBarber = barbers.find(b => b.id === selectedBarberId) || barber;

  useEffect(() => {
    if (barber && !selectedBarberId) {
      setSelectedBarberId(barber.id);
    }
  }, [barber, selectedBarberId]);

  const handleNewAppointment = useCallback(() => {
    fetchAppointments();
  }, [selectedBarberId, selectedDate]);

  useRealtimeAppointments({
    barberId: selectedBarberId || undefined,
    onNewAppointment: handleNewAppointment,
  });

  useEffect(() => {
    if (selectedBarberId) {
      fetchAppointments();
    }
  }, [selectedBarberId, selectedDate]);

  const fetchAppointments = async () => {
    if (!selectedBarberId) return;

    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = addDays(startOfSelectedDay, 1);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(*),
          barber:barbers(*)
        `)
        .eq('barber_id', selectedBarberId)
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
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir agendamento');
      throw error;
    }
    toast.success('Agendamento excluído');
    fetchAppointments();
  };

  const handleStatusChange = async (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    if (status === 'completed' && !checkCanPerformAction('complete_appointment')) return;
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar status');
      throw error;
    }
    toast.success('Status atualizado');
    fetchAppointments();
  };

  const handleCardClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsSheet(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowEditDialog(true);
  };

  const getDaysToShow = () => {
    const days: Date[] = [];
    for (let i = -3; i <= 3; i++) {
      days.push(addDays(startOfDay(new Date()), i));
    }
    return days;
  };

  // Current time indicator
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const isToday = isSameDay(selectedDate, new Date());

  // Map appointments to timeline
  const timelineHours = generateTimelineHours();
  const appointmentsByHour = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach(apt => {
      const hour = format(new Date(apt.start_time), 'HH');
      const key = `${hour}:00`;
      if (!map[key]) map[key] = [];
      map[key].push(apt);
    });
    return map;
  }, [appointments]);

  if (loading && !selectedBarberId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const days = getDaysToShow();
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const totalCount = appointments.length;

  const handleDateSelectFromCalendar = (date: Date) => {
    setSelectedDate(date);
    setViewMode('daily');
  };

  

  return (
    <div className="space-y-5 pb-24">
      {/* Premium Header */}
      <div className="animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {/* Day of week prominent */}
            <h1 className="text-2xl font-bold capitalize">
              {format(selectedDate, 'EEEE', { locale: ptBR })}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          
          {/* Top icons */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={viewMode === 'daily' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('daily')}
              className={cn(
                "h-9 w-9 rounded-xl transition-all active:scale-95",
                viewMode === 'daily' && 'btn-primary-gradient shadow-md'
              )}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('monthly')}
              className={cn(
                "h-9 w-9 rounded-xl transition-all active:scale-95",
                viewMode === 'monthly' && 'btn-primary-gradient shadow-md'
              )}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Barber selector */}
      {canViewOthers && barbers.length > 1 && (
        <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm animate-fade-in rounded-xl" style={{ animationDelay: '0.05s' }}>
          <CardContent className="p-2.5">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground">Visualizando agenda de:</label>
                <Select
                  value={selectedBarberId || ''}
                  onValueChange={(value) => setSelectedBarberId(value)}
                >
                  <SelectTrigger className="mt-0.5 h-7 text-sm border-border/50">
                    <SelectValue placeholder="Selecione um barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.id === barber?.id ? '(você)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Appointment Dialog */}
      {(selectedBarber || barber) && (
        <ManualAppointmentDialog
          open={showManualDialog}
          onOpenChange={setShowManualDialog}
          barber={canCreateForOthers ? selectedBarber! : barber!}
          selectedDate={selectedDate}
          onSuccess={fetchAppointments}
          canCreateForOthers={canCreateForOthers}
          barbers={barbers}
        />
      )}

      {/* Monthly Calendar View */}
      {viewMode === 'monthly' && selectedBarber && (
        <MonthlyCalendar
          barber={selectedBarber}
          onDateSelect={handleDateSelectFromCalendar}
          selectedDate={selectedDate}
        />
      )}

      {/* Daily View */}
      {viewMode === 'daily' && (
        <>
          {/* Date Navigation */}
          <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in rounded-xl" style={{ animationDelay: '0.08s' }}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                  className="h-7 w-7 min-h-[28px] min-w-[28px] transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                  className="h-7 w-7 min-h-[28px] min-w-[28px] transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isDayToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'flex flex-col items-center py-1.5 px-1 rounded-xl transition-all duration-200',
                        'hover:bg-accent/50 active:scale-95',
                        isSelected && 'text-primary-foreground hover:bg-primary shadow-md',
                        isDayToday && !isSelected && 'ring-1 ring-primary/50'
                      )}
                      style={{
                        background: isSelected ? 'var(--primary-gradient)' : undefined,
                      }}
                    >
                      <span className="text-[9px] font-medium uppercase opacity-70">
                        {format(day, 'EEE', { locale: ptBR })}
                      </span>
                      <span className="text-sm font-semibold mt-0.5">{format(day, 'd')}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: '0.12s' }}>
            <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden relative group hover:shadow-md transition-all duration-200 rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted-foreground/20" />
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-muted/60">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Total</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden relative group hover:shadow-md transition-all duration-200 rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--primary-gradient)' }} />
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">{confirmedCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Confirmados</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden relative group hover:shadow-md transition-all duration-200 rounded-xl">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Concluídos</p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline View */}
          <div className="space-y-0 animate-fade-in" style={{ animationDelay: '0.16s' }}>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : appointments.length === 0 ? (
              <Card className="border-border/40 border-dashed shadow-sm bg-card/60 backdrop-blur-sm rounded-xl">
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-primary/5">
                    <CalendarPlus className="h-8 w-8 text-primary/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Dia livre!
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-4">
                    Nenhum agendamento para este dia
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleOpenManualDialog()}
                    className="text-xs h-8 px-4 border-primary/30 text-primary hover:bg-primary/5 rounded-xl"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Agendar horário
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[52px] top-0 bottom-0 w-px bg-border/50" />

                {timelineHours.map((hour) => {
                  const hourNum = parseInt(hour.split(':')[0]);
                  const hourAppointments = appointmentsByHour[hour] || [];
                  const isCurrentHour = isToday && hourNum === currentHour;
                  const hasAppointments = hourAppointments.length > 0;

                  // Skip hours without appointments that are far from current time
                  if (!hasAppointments && !isCurrentHour && Math.abs(hourNum - currentHour) > 2 && !isToday) {
                    return null;
                  }

                  return (
                    <div key={hour} className="relative flex gap-4 min-h-[48px] mb-1">
                      {/* Time label */}
                      <div className="w-[44px] shrink-0 text-right pt-0.5">
                        <span className={cn(
                          "text-xs font-medium",
                          isCurrentHour ? "text-primary font-bold" : "text-muted-foreground"
                        )}>
                          {hour}
                        </span>
                      </div>

                      {/* Timeline dot */}
                      <div className="relative shrink-0 w-[16px] flex justify-center pt-1.5">
                        <div className={cn(
                          "w-2 h-2 rounded-full z-10",
                          isCurrentHour ? "bg-primary shadow-[0_0_8px_rgba(37,99,235,0.5)]" : 
                          hasAppointments ? "bg-primary/60" : "bg-border"
                        )} />
                      </div>

                      {/* Current time indicator line */}
                      {isCurrentHour && (
                        <div 
                          className="absolute left-[44px] right-0 h-px bg-primary/40 z-0"
                          style={{ top: `${(currentMinute / 60) * 100}%` }}
                        >
                          <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-primary" />
                        </div>
                      )}

                      {/* Cards */}
                      <div className="flex-1 space-y-2 pb-2">
                        {hourAppointments.map((appointment, index) => (
                          <Card 
                            key={appointment.id}
                            className={cn(
                              "border-border/30 shadow-sm bg-card/90 backdrop-blur-sm overflow-hidden cursor-pointer",
                              "transition-all duration-200",
                              "hover:shadow-lg hover:border-primary/20 active:scale-[0.99]",
                              "border-l-[3px] rounded-xl",
                              getStatusColor(appointment.status),
                            )}
                            onClick={() => handleCardClick(appointment)}
                          >
                            <CardContent className="p-3.5">
                              <div className="flex items-center gap-3">
                                {/* Client Avatar */}
                                <div 
                                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 text-primary-foreground"
                                  style={{ background: 'var(--primary-gradient)' }}
                                >
                                  {getInitials(appointment.customer_name)}
                                </div>

                                {/* Customer info */}
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold text-sm truncate block leading-tight">
                                    {appointment.customer_name}
                                  </span>
                                  {appointment.service && (
                                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                                      {appointment.service.name}
                                    </p>
                                  )}
                                </div>

                                {/* Time + Status */}
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <p className="text-base font-bold leading-tight tabular-nums">
                                    {format(new Date(appointment.start_time), 'HH:mm')}
                                  </p>
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                      getStatusBadgeColor(appointment.status)
                                    )}
                                  >
                                    {getStatusLabel(appointment.status)}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Appointment Details Sheet */}
      <AppointmentDetailsSheet
        appointment={selectedAppointment}
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
        onEdit={handleEditAppointment}
        onComplete={(id) => handleStatusChange(id, 'completed')}
        onDelete={handleDeleteAppointment}
      />

      {/* Edit Appointment Dialog */}
      <EditAppointmentDialog
        appointment={selectedAppointment}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={fetchAppointments}
        isMaster={isMaster}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        onNewAppointment={() => handleOpenManualDialog()}
        onNewBlock={() => navigate('/painel/bloqueios')}
      />
    </div>
  );
};

export default Agenda;
