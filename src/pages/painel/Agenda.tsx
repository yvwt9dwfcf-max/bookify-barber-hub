import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase, Appointment, Barber, Barbershop } from '@/lib/supabase';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, User, Phone, Loader2, AlertTriangle } from 'lucide-react';
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
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

type ViewMode = 'daily' | 'monthly';

const Agenda = () => {
  const { barber, barbershop, isMaster } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const { barbers } = useBarbershopBarbers();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [showManualDialog, setShowManualDialog] = useState(false);
  
  // Estados para detalhes e edição de agendamento
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Barbeiro selecionado para visualização (master pode ver agenda de outros)
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  
  // Barbeiro usado para o diálogo de novo agendamento
  const selectedBarber = barbers.find(b => b.id === selectedBarberId) || barber;

  // Inicializar com o barbeiro do contexto
  useEffect(() => {
    if (barber && !selectedBarberId) {
      setSelectedBarberId(barber.id);
    }
  }, [barber, selectedBarberId]);

  // Memoize the callback to prevent unnecessary re-subscriptions
  const handleNewAppointment = useCallback(() => {
    fetchAppointments();
  }, [selectedBarberId, selectedDate]);

  // Subscribe to realtime appointment updates
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

  const isSubscriptionActive = barbershop?.subscription_active !== false;

  const handleStatusChange = async (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    // Block completing appointments if subscription is inactive
    if (status === 'completed' && !isSubscriptionActive) {
      toast.error('Ative sua assinatura para concluir atendimentos');
      return;
    }

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

  const handleDateSelectFromCalendar = (date: Date) => {
    setSelectedDate(date);
    setViewMode('daily');
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header - clean and simple */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {viewMode === 'daily' ? 'Gerencie os agendamentos do dia' : 'Visão geral do mês'}
          </p>
        </div>
        
        {/* View mode toggle - simplified */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'daily' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('daily')}
            className="transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Diário
          </Button>
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('monthly')}
            className="transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Mensal
          </Button>
        </div>
      </div>

      {/* Subscription Inactive Warning */}
      {!isSubscriptionActive && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Assinatura inativa</p>
              <p className="text-sm text-muted-foreground">
                Novos agendamentos e conclusões estão bloqueados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seletor de barbeiro para master - lighter card */}
      {isMaster && barbers.length > 1 && (
        <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
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
      {selectedBarber && (
        <ManualAppointmentDialog
          open={showManualDialog}
          onOpenChange={setShowManualDialog}
          barber={selectedBarber}
          selectedDate={selectedDate}
          onSuccess={fetchAppointments}
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

      {/* Daily View - Date Navigation - lighter design */}
      {viewMode === 'daily' && (
        <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
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
              <span className="text-xs font-medium text-muted-foreground">
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
                      'flex flex-col items-center py-1.5 px-1 rounded-lg transition-all',
                      'hover:bg-accent/50 active:scale-95',
                      isSelected && 'bg-primary text-primary-foreground hover:bg-primary shadow-md',
                      isToday && !isSelected && 'ring-1 ring-primary/50'
                    )}
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
      )}

      {/* Stats - only show in daily view - compact design */}
      {viewMode === 'daily' && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-2.5 text-center">
              <p className="text-2xl font-bold text-primary">{confirmedCount}</p>
              <p className="text-[10px] text-muted-foreground">Confirmados</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-2.5 text-center">
              <p className="text-2xl font-bold text-success">{completedCount}</p>
              <p className="text-[10px] text-muted-foreground">Concluídos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Appointments List - only show in daily view - modern cards */}
      {viewMode === 'daily' && (
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
            <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
              <CardContent className="text-center py-8">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Nenhum agendamento para este dia
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {appointments.map((appointment, index) => (
                <Card 
                  key={appointment.id}
                  className={cn(
                    "border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden cursor-pointer",
                    "transition-all duration-300 animate-fade-in hover:shadow-md hover:border-primary/30 active:scale-[0.99]",
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => handleCardClick(appointment)}
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-3">
                      {/* Time block - compact */}
                      <div className="flex-shrink-0 text-center min-w-[44px]">
                        <p className="text-sm font-bold leading-tight">
                          {format(new Date(appointment.start_time), 'HH:mm')}
                        </p>
                        <p className="text-[9px] text-muted-foreground leading-tight">
                          até {format(new Date(appointment.end_time), 'HH:mm')}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-8 bg-border/50" />

                      {/* Customer info */}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-xs truncate block leading-tight">
                          {appointment.customer_name}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground leading-tight">
                          <Phone className="h-2.5 w-2.5" />
                          <span>{appointment.customer_phone || 'Sem telefone'}</span>
                        </div>
                        {appointment.service && (
                          <p className="text-[10px] text-primary font-medium leading-tight">
                            {appointment.service.name}
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded-full text-[9px] font-medium',
                            getStatusColor(appointment.status)
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
        onNewAppointment={() => {
          if (!isSubscriptionActive) {
            toast.error('Ative sua assinatura para criar novos agendamentos');
            return;
          }
          setShowManualDialog(true);
        }}
        onNewBlock={() => navigate('/painel/bloqueios')}
      />
    </div>
  );
};

export default Agenda;
