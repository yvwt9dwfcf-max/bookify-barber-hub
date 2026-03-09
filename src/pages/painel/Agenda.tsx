import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, Appointment, Barber, Barbershop } from '@/lib/supabase';
import { awardLoyaltyPoints } from '@/lib/loyaltyUtils';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { useSubscription } from '@/hooks/useSubscription';
import { useAvailability } from '@/hooks/useAvailability';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PremiumSkeleton, SkeletonSlot, SkeletonStats } from '@/components/ui/premium-skeleton';
import { 
  CalendarRange as Calendar, CalendarDays, ChevronLeft, ChevronRight, 
  UserRound as User, Timer as Clock, CalendarPlus,
  CircleSlash as Ban
} from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, setHours, setMinutes } from 'date-fns';
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
import QuickBlockDialog from '@/components/painel/QuickBlockDialog';
import DashboardCards from '@/components/painel/DashboardCards';

interface ContextType {
  barber: (Barber & { permissions?: { can_view_others_schedule?: boolean; can_edit_others_schedule?: boolean } }) | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

type ViewMode = 'daily' | 'monthly';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'confirmed':
      return {
        borderColor: 'border-l-primary/70',
        bg: 'bg-card/90',
        dot: 'bg-primary',
        label: 'Confirmado',
        labelColor: 'text-primary',
        avatarBg: 'bg-primary/15',
        avatarText: 'text-primary',
      };
    case 'completed':
      return {
        borderColor: 'border-l-success/70',
        bg: 'bg-card/90',
        dot: 'bg-success',
        label: 'Concluído',
        labelColor: 'text-success',
        avatarBg: 'bg-success/15',
        avatarText: 'text-success',
      };
    case 'cancelled':
      return {
        borderColor: 'border-l-destructive/50',
        bg: 'bg-card/60',
        dot: 'bg-destructive',
        label: 'Cancelado',
        labelColor: 'text-destructive',
        avatarBg: 'bg-muted/30',
        avatarText: 'text-muted-foreground',
      };
    default:
      return {
        borderColor: 'border-l-amber-500/60',
        bg: 'bg-card/90',
        dot: 'bg-amber-500',
        label: 'Pendente',
        labelColor: 'text-amber-500',
        avatarBg: 'bg-amber-500/15',
        avatarText: 'text-amber-500',
      };
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
  const { barbers } = useBarbershopBarbers();
  const { checkCanPerformAction } = useSubscription();

  const canViewOthers = isMaster || barber?.permissions?.can_view_others_schedule === true;
  const canCreateForOthers = isMaster || barber?.permissions?.can_edit_others_schedule === true;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [preselectedTime, setPreselectedTime] = useState<string | null>(null);
  const [showQuickBlock, setShowQuickBlock] = useState(false);
  const [blockTime, setBlockTime] = useState<string | null>(null);

  const handleOpenManualDialog = (time?: string) => {
    if (!checkCanPerformAction('create_appointment')) return;
    setPreselectedTime(time || null);
    setShowManualDialog(true);
  };

  const handleOpenQuickBlock = (time?: string) => {
    setBlockTime(time || null);
    setShowQuickBlock(true);
  };
  
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  
  const selectedBarber = barbers.find(b => b.id === selectedBarberId) || barber;

  // Use availability hook for the selected barber
  const { 
    checkSlotAvailability, 
    getOpeningHoursForDay,
    blockedSlots,
    refetch: refetchAvailability,
    loading: availabilityLoading 
  } = useAvailability({ 
    barberId: selectedBarberId || barber?.id || '' 
  });

  useEffect(() => {
    if (barber && !selectedBarberId) {
      setSelectedBarberId(barber.id);
    }
  }, [barber, selectedBarberId]);

  const handleNewAppointment = useCallback(() => {
    fetchAppointments();
    refetchAvailability();
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

    // Award loyalty points when completing
    if (status === 'completed') {
      const apt = appointments.find(a => a.id === id);
      if (apt && barbershop) {
        awardLoyaltyPoints({
          id: apt.id,
          customer_name: apt.customer_name,
          customer_phone: apt.customer_phone,
          barbershop_id: barbershop.id,
        }).catch(err => console.error('Erro ao pontuar fidelidade:', err));
      }
    }

    toast.success('Status atualizado');
    fetchAppointments();
    setDashboardRefreshKey(k => k + 1);
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

  // Current time
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const isToday = isSameDay(selectedDate, new Date());

  // Generate all time slots for the day based on opening hours
  const daySlots = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    const dayHours = getOpeningHoursForDay(dayOfWeek);
    
    if (!dayHours) return [];

    const [startH, startM] = dayHours.start_time.split(':').map(Number);
    const [endH, endM] = dayHours.end_time.split(':').map(Number);
    
    const slots: { time: string; hour: number; minute: number }[] = [];
    let h = startH;
    let m = startM;
    
    while (h < endH || (h === endH && m < endM)) {
      slots.push({
        time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        hour: h,
        minute: m,
      });
      m += 30;
      if (m >= 60) {
        m = 0;
        h++;
      }
    }
    
    return slots;
  }, [selectedDate, getOpeningHoursForDay]);

  // Map appointments to their time slots, tracking covered slots for multi-slot appointments
  const { appointmentsBySlot, coveredSlots } = useMemo(() => {
    const map: Record<string, Appointment> = {};
    const covered = new Set<string>();
    
    appointments.forEach(apt => {
      const startTime = new Date(apt.start_time);
      const endTime = new Date(apt.end_time);
      const key = format(startTime, 'HH:mm');
      map[key] = apt;
      
      // Mark intermediate slots as covered
      let slotTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      while (slotTime < endTime) {
        covered.add(format(slotTime, 'HH:mm'));
        slotTime = new Date(slotTime.getTime() + 30 * 60 * 1000);
      }
    });
    return { appointmentsBySlot: map, coveredSlots: covered };
  }, [appointments]);

  // Check if a time slot falls within a blocked period
  const getBlockedReason = useCallback((time: string): string | null => {
    const [h, m] = time.split(':').map(Number);
    const slotStart = setMinutes(setHours(selectedDate, h), m);
    
    for (const blocked of blockedSlots) {
      const blockedStart = new Date(blocked.start_time);
      const blockedEnd = new Date(blocked.end_time);
      if (slotStart >= blockedStart && slotStart < blockedEnd) {
        return blocked.reason || 'Bloqueado';
      }
    }
    return null;
  }, [selectedDate, blockedSlots]);

  if (loading && !selectedBarberId) {
    return (
      <div className="space-y-4 pb-24 animate-page-enter">
        <PremiumSkeleton className="h-12 w-3/4" />
        <PremiumSkeleton className="h-24 rounded-xl" />
        <SkeletonStats />
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonSlot key={i} />
        ))}
      </div>
    );
  }

  const days = getDaysToShow();

  const handleDateSelectFromCalendar = (date: Date) => {
    setSelectedDate(date);
    setViewMode('daily');
  };

  const dayOfWeek = selectedDate.getDay();
  const dayHours = getOpeningHoursForDay(dayOfWeek);
  const isDayClosed = !dayHours;

  return (
    <div className="space-y-4 pb-24 animate-page-enter">
      {/* Dashboard Cards */}
      <DashboardCards barbershopId={barbershop?.id} selectedDate={selectedDate} refreshKey={dashboardRefreshKey} />

      {/* Premium Header */}
      <div className="animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold capitalize">
              {format(selectedDate, 'EEEE', { locale: ptBR })}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          
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
          onOpenChange={(open) => {
            setShowManualDialog(open);
            if (!open) setPreselectedTime(null);
          }}
          barber={canCreateForOthers ? selectedBarber! : barber!}
          selectedDate={selectedDate}
          onSuccess={() => {
            fetchAppointments();
            refetchAvailability();
          }}
          canCreateForOthers={canCreateForOthers}
          barbers={barbers}
          preselectedTime={preselectedTime}
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
          {/* Date Navigation - Sticky */}
          <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm overflow-hidden animate-fade-in rounded-xl sticky top-0 z-20" style={{ animationDelay: '0.08s' }}>
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


          {/* Slot Grid View */}
          <div className="animate-fade-in" style={{ animationDelay: '0.16s' }}>
            {loading || availabilityLoading ? (
              <div className="space-y-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonSlot key={i} />
                ))}
              </div>
            ) : isDayClosed ? (
              <Card className="border-border/40 border-dashed shadow-sm bg-card/60 backdrop-blur-sm rounded-xl">
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-muted/30">
                    <Ban className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Dia fechado
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Não há expediente configurado para este dia
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1.5">
                {daySlots.map((slot, index) => {
                  const appointment = appointmentsBySlot[slot.time];
                  const availability = checkSlotAvailability(slot.time, selectedDate, 30);
                  const blockedReason = getBlockedReason(slot.time);
                  const isCurrentSlot = isToday && slot.hour === currentHour && 
                    currentMinute >= slot.minute && currentMinute < slot.minute + 30;
                  const isPast = availability.reason === 'passado';
                  const isBreak = availability.reason === 'intervalo';
                  const isBlocked = availability.reason === 'bloqueado';
                  

                  // Skip slots covered by a multi-slot appointment
                  if (coveredSlots.has(slot.time)) {
                    return null;
                  }

                  // If this slot has an appointment (occupied)
                    if (appointment && appointment.status !== 'cancelled') {
                      const durationMin = appointment.service?.duration_minutes || 30;
                      const slotsSpanned = Math.ceil(durationMin / 30);
                      const cfg = getStatusConfig(appointment.status);
                      
                      return (
                        <div
                          key={slot.time}
                          className={cn(
                            "relative flex items-center gap-0 rounded-2xl overflow-hidden cursor-pointer",
                            "border border-border/20 border-l-[3px]",
                            "transition-all duration-200 hover:border-border/40 hover:shadow-lg active:scale-[0.99]",
                            cfg.bg,
                            cfg.borderColor,
                            "backdrop-blur-sm shadow-sm"
                          )}
                          onClick={() => handleCardClick(appointment)}
                          style={{ animationDelay: `${index * 0.02}s` }}
                        >
                          {/* Time column */}
                          <div className="w-14 shrink-0 flex flex-col items-center justify-center py-3.5 px-1 border-r border-border/15">
                            <p className="text-[13px] font-bold tabular-nums leading-none">
                              {format(new Date(appointment.start_time), 'HH:mm')}
                            </p>
                            <p className="text-[9px] text-muted-foreground/50 tabular-nums mt-1 leading-none">
                              {format(new Date(appointment.end_time), 'HH:mm')}
                            </p>
                          </div>

                          {/* Avatar */}
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 ml-3",
                            cfg.avatarBg, cfg.avatarText
                          )}>
                            {getInitials(appointment.customer_name)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 py-3 px-2.5">
                            <p className="font-semibold text-[13px] leading-tight truncate">
                              {appointment.customer_name}
                            </p>
                            {appointment.service && (
                              <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                                {appointment.service.name}
                                <span className="text-muted-foreground/40"> · {appointment.service.duration_minutes}min</span>
                              </p>
                            )}
                          </div>

                          {/* Status dot + label */}
                          <div className="flex flex-col items-end gap-1 pr-3.5 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                              <span className={cn("text-[11px] font-medium", cfg.labelColor)}>
                                {cfg.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                  // Blocked slot
                  if (isBlocked) {
                    return (
                      <div
                        key={slot.time}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl",
                          "bg-muted/30 border border-border/30",
                          "opacity-60"
                        )}
                      >
                        <div className="w-12 shrink-0 text-center">
                          <p className="text-sm font-medium tabular-nums text-muted-foreground">{slot.time}</p>
                        </div>
                        <div className="w-px h-6 bg-border/30" />
                        <Ban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {blockedReason || 'Bloqueado'}
                        </span>
                      </div>
                    );
                  }

                  // Break slot
                  if (isBreak) {
                    return (
                      <div
                        key={slot.time}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl",
                          "bg-amber-500/5 border border-amber-500/10",
                          "opacity-50"
                        )}
                      >
                        <div className="w-12 shrink-0 text-center">
                          <p className="text-sm font-medium tabular-nums text-muted-foreground">{slot.time}</p>
                        </div>
                        <div className="w-px h-6 bg-border/30" />
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs text-amber-500/80">Intervalo</span>
                      </div>
                    );
                  }

                  // Past slot
                  if (isPast) {
                    return (
                      <div
                        key={slot.time}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2 rounded-xl",
                          "opacity-30"
                        )}
                      >
                        <div className="w-12 shrink-0 text-center">
                          <p className="text-sm font-medium tabular-nums text-muted-foreground">{slot.time}</p>
                        </div>
                        <div className="w-px h-6 bg-border/20" />
                        <div className="flex-1 h-px bg-border/20" />
                      </div>
                    );
                  }

                  // Available slot - clickable
                  return (
                    <button
                      key={slot.time}
                      onClick={() => handleOpenManualDialog(slot.time)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl",
                        "border border-transparent",
                        "transition-all duration-200",
                        "hover:bg-primary/5 hover:border-primary/20 hover:shadow-sm",
                        "active:scale-[0.99] active:bg-primary/10",
                        "group",
                        isCurrentSlot && "bg-primary/5 border-primary/15 ring-1 ring-primary/20"
                      )}
                    >
                      <div className="w-12 shrink-0 text-center">
                        <p className={cn(
                          "text-sm font-medium tabular-nums",
                          isCurrentSlot ? "text-primary font-bold" : "text-muted-foreground"
                        )}>
                          {slot.time}
                        </p>
                      </div>
                      <div className="w-px h-6 bg-border/30 group-hover:bg-primary/30 transition-colors" />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground/50 group-hover:text-primary/70 transition-colors">
                          Horário disponível
                        </span>
                        <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-primary/60 transition-all duration-200" />
                      </div>
                    </button>
                  );
                })}

                {/* Current time indicator */}
                {isToday && daySlots.length > 0 && (
                  <div className="fixed right-4 bottom-24 z-10">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const currentSlotEl = document.querySelector('[data-current-slot]');
                        currentSlotEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="rounded-full shadow-md text-xs h-8 px-3 border-primary/30 text-primary bg-card/95 backdrop-blur-sm"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Agora
                    </Button>
                  </div>
                )}
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

      {/* Quick Block Dialog */}
      {(selectedBarber || barber) && (
        <QuickBlockDialog
          open={showQuickBlock}
          onOpenChange={(open) => {
            setShowQuickBlock(open);
            if (!open) setBlockTime(null);
          }}
          barber={selectedBarber || barber!}
          selectedDate={selectedDate}
          preselectedTime={blockTime}
          onSuccess={() => {
            fetchAppointments();
            refetchAvailability();
          }}
        />
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        onNewAppointment={() => handleOpenManualDialog()}
        onNewBlock={() => handleOpenQuickBlock()}
      />
    </div>
  );
};

export default Agenda;
