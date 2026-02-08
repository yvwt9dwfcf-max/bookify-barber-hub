import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase, Appointment, Barber, Barbershop } from '@/lib/supabase';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, CalendarDays, ChevronLeft, ChevronRight, 
  User, Phone, Loader2, CheckCircle2, Clock, Sparkles, CalendarPlus
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

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'border-l-primary bg-primary/5';
    case 'completed':
      return 'border-l-emerald-500 bg-emerald-500/5';
    case 'cancelled':
      return 'border-l-destructive bg-destructive/5';
    default:
      return 'border-l-muted-foreground bg-muted/30';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-primary/10 text-primary';
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-600';
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

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const Agenda = () => {
  const { barber, barbershop, isMaster } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const { barbers } = useBarbershopBarbers();

  const canViewOthers = isMaster || barber?.permissions?.can_view_others_schedule === true;
  const canCreateForOthers = isMaster || barber?.permissions?.can_edit_others_schedule === true;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [showManualDialog, setShowManualDialog] = useState(false);
  
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

  const firstName = barber?.name?.split(' ')[0] || 'Barbeiro';

  return (
    <div className="space-y-5 pb-24">
      {/* Greeting Header */}
      <div className="animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {getGreeting()}, {firstName}! 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isSameDay(selectedDate, new Date()) 
                ? totalCount > 0
                  ? `Você tem ${totalCount} agendamento${totalCount > 1 ? 's' : ''} hoje`
                  : 'Nenhum agendamento para hoje'
                : format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
              }
            </p>
          </div>
          
          {/* View mode toggle */}
          <div className="flex gap-1.5 shrink-0">
            <Button
              variant={viewMode === 'daily' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('daily')}
              className={cn(
                "h-8 px-3 transition-all active:scale-95",
                viewMode === 'daily' && 'btn-primary-gradient shadow-md'
              )}
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Diário
            </Button>
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('monthly')}
              className={cn(
                "h-8 px-3 transition-all active:scale-95",
                viewMode === 'monthly' && 'btn-primary-gradient shadow-md'
              )}
            >
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Mensal
            </Button>
          </div>
        </div>
      </div>

      {/* Barber selector */}
      {canViewOthers && barbers.length > 1 && (
        <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.05s' }}>
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
          <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in" style={{ animationDelay: '0.08s' }}>
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
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'flex flex-col items-center py-1.5 px-1 rounded-lg transition-all duration-200',
                        'hover:bg-accent/50 active:scale-95',
                        isSelected && 'text-primary-foreground hover:bg-primary shadow-md',
                        isToday && !isSelected && 'ring-1 ring-primary/50'
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
            {/* Total */}
            <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden relative group hover:shadow-md transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted-foreground/20" />
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center bg-muted/60">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Total</p>
              </CardContent>
            </Card>

            {/* Confirmed */}
            <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden relative group hover:shadow-md transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--primary-gradient)' }} />
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">{confirmedCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Confirmados</p>
              </CardContent>
            </Card>

            {/* Completed */}
            <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden relative group hover:shadow-md transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Concluídos</p>
              </CardContent>
            </Card>
          </div>

          {/* Appointments List */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-0.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : appointments.length === 0 ? (
              /* Empty state - more visual */
              <Card className="border-border/40 border-dashed shadow-sm bg-card/60 backdrop-blur-sm">
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
                    onClick={() => setShowManualDialog(true)}
                    className="text-xs h-8 px-4 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Agendar horário
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {appointments.map((appointment, index) => (
                  <Card 
                    key={appointment.id}
                    className={cn(
                      "border-border/40 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden cursor-pointer",
                      "transition-all duration-200 animate-fade-in",
                      "hover:shadow-md hover:border-primary/20 active:scale-[0.99]",
                      "border-l-[3px]",
                      getStatusColor(appointment.status),
                    )}
                    style={{ animationDelay: `${index * 40}ms` }}
                    onClick={() => handleCardClick(appointment)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Client Avatar */}
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 text-primary-foreground"
                          style={{ background: 'var(--primary-gradient)' }}
                        >
                          {getInitials(appointment.customer_name)}
                        </div>

                        {/* Customer info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate leading-tight">
                              {appointment.customer_name}
                            </span>
                          </div>
                          {appointment.service && (
                            <p className="text-xs text-primary font-medium leading-tight mt-0.5">
                              {appointment.service.name}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground leading-tight mt-0.5">
                            <Phone className="h-2.5 w-2.5" />
                            <span>{appointment.customer_phone || 'Sem telefone'}</span>
                          </div>
                        </div>

                        {/* Time + Status */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold leading-tight">
                              {format(new Date(appointment.start_time), 'HH:mm')}
                            </p>
                            <p className="text-[9px] text-muted-foreground leading-tight">
                              {format(new Date(appointment.end_time), 'HH:mm')}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded-full text-[9px] font-medium',
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
        onNewAppointment={() => setShowManualDialog(true)}
        onNewBlock={() => navigate('/painel/bloqueios')}
      />
    </div>
  );
};

export default Agenda;
