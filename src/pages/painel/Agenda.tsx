import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  CircleSlash as Ban, Copy, Share2, CalendarX
} from 'lucide-react';
import { format, addDays, addMonths, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, setHours, setMinutes } from 'date-fns';
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
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import FloatingActionButton from '@/components/painel/FloatingActionButton';

const MonthlyCalendar = lazy(() => import('@/components/painel/MonthlyCalendar'));
const ManualAppointmentDialog = lazy(() => import('@/components/painel/ManualAppointmentDialog'));
const AppointmentDetailsSheet = lazy(() => import('@/components/painel/AppointmentDetailsSheet'));
const EditAppointmentDialog = lazy(() => import('@/components/painel/EditAppointmentDialog'));
const QuickBlockDialog = lazy(() => import('@/components/painel/QuickBlockDialog'));
const DashboardCards = lazy(() => import('@/components/painel/DashboardCards'));

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

  const handleOpenManualDialog = useCallback((time?: string) => {
    if (!checkCanPerformAction('create_appointment')) return;
    setPreselectedTime(time || null);
    setShowManualDialog(true);
  }, [checkCanPerformAction]);

  const handleOpenQuickBlock = useCallback((time?: string) => {
    setBlockTime(time || null);
    setShowQuickBlock(true);
  }, []);
  
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

  const fetchAppointments = useCallback(async () => {
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
  }, [selectedBarberId, selectedDate]);

  // Stable ref for realtime callback to avoid channel resubscriptions
  const fetchRef = useRef(fetchAppointments);
  const refetchAvailabilityRef = useRef(refetchAvailability);
  useEffect(() => { fetchRef.current = fetchAppointments; }, [fetchAppointments]);
  useEffect(() => { refetchAvailabilityRef.current = refetchAvailability; }, [refetchAvailability]);

  const handleNewAppointment = useCallback(() => {
    fetchRef.current();
    refetchAvailabilityRef.current();
  }, []);

  useRealtimeAppointments({
    barberId: selectedBarberId || undefined,
    onNewAppointment: handleNewAppointment,
  });

  useEffect(() => {
    if (selectedBarberId) {
      fetchAppointments();
    }
  }, [fetchAppointments, selectedBarberId]);


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

  const handleCardClick = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsSheet(true);
  }, []);

  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowEditDialog(true);
  }, []);

  // Month base for the days strip
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));

  // Generate all days of the display month
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(displayMonth),
      end: endOfMonth(displayMonth),
    });
  }, [displayMonth]);

  // When selecting a date, sync the display month
  useEffect(() => {
    const monthOfSelected = startOfMonth(selectedDate);
    if (monthOfSelected.getTime() !== displayMonth.getTime()) {
      setDisplayMonth(monthOfSelected);
    }
  }, [selectedDate]);

  // Ref for scrollable days container
  const daysScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected day (instant on mount, smooth after)
  const hasInitialScrolled = useRef(false);
  useEffect(() => {
    const doScroll = () => {
      const container = daysScrollRef.current;
      if (!container) return;
      const selectedIndex = days.findIndex(d => isSameDay(d, selectedDate));
      if (selectedIndex === -1) return;
      const child = container.children[selectedIndex] as HTMLElement;
      if (!child) return;
      const scrollLeft = child.offsetLeft - container.offsetWidth / 2 + child.offsetWidth / 2;
      if (!hasInitialScrolled.current) {
        container.scrollTo({ left: scrollLeft, behavior: 'instant' as ScrollBehavior });
        hasInitialScrolled.current = true;
      } else {
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    };
    // Use rAF to ensure DOM is painted before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(doScroll);
    });
  }, [selectedDate, days]);

  const isToday = isSameDay(selectedDate, new Date());

  const hasAppointments = useMemo(() => 
    appointments.some(a => a.status !== 'cancelled'), 
    [appointments]
  );

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
      m += 15;
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
      
      // Mark intermediate slots as covered (15-min intervals)
      let slotTime = new Date(startTime.getTime() + 15 * 60 * 1000);
      while (slotTime < endTime) {
        covered.add(format(slotTime, 'HH:mm'));
        slotTime = new Date(slotTime.getTime() + 15 * 60 * 1000);
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

  

  const handleDateSelectFromCalendar = (date: Date) => {
    setSelectedDate(date);
    setViewMode('daily');
  };

  const dayOfWeek = selectedDate.getDay();
  const dayHours = getOpeningHoursForDay(dayOfWeek);
  const isDayClosed = !dayHours;

  const fallback = <Skeleton className="h-24 w-full rounded-xl" />;

  return (
    <Suspense fallback={fallback}>
    <div className="space-y-2 pb-24 animate-page-enter">
      {/* Dashboard Cards */}
      <DashboardCards barbershopId={barbershop?.id} selectedDate={selectedDate} refreshKey={dashboardRefreshKey} />

      {/* Premium Header */}
      <div className="animate-fade-in space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="h-8 w-8 shrink-0 transition-all hover:-translate-x-0.5 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold capitalize leading-tight">
              {format(selectedDate, 'EEEE', { locale: ptBR })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="h-8 w-8 shrink-0 transition-all hover:translate-x-0.5 active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center gap-1">
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

      {/* Barber selector */}
      {canViewOthers && barbers.length > 1 && (
        <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm animate-fade-in rounded-xl" style={{ animationDelay: '0.05s' }}>
          <CardContent className="p-2">
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
            <CardContent className="p-2">
              <div className="flex items-center justify-between mb-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDisplayMonth(addMonths(displayMonth, -1))}
                  className="h-7 w-7 min-h-[28px] min-w-[28px] transition-all active:scale-95"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {format(displayMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
                  className="h-7 w-7 min-h-[28px] min-w-[28px] transition-all active:scale-95"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div
                ref={daysScrollRef}
                className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
                style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {days.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isDayToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'flex flex-col items-center py-1.5 px-2.5 rounded-xl transition-all duration-200 snap-center shrink-0',
                        'hover:bg-accent/50 active:scale-95',
                        isSelected && 'text-primary-foreground hover:bg-primary shadow-md',
                        isDayToday && !isSelected && 'ring-1 ring-primary/50'
                      )}
                      style={{
                        background: isSelected ? 'var(--primary-gradient)' : undefined,
                        minWidth: '48px',
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
              <div className="relative">

                {/* Empty state when no appointments */}
                {!hasAppointments && !loading && (
                  <Card className="border-border/40 border-dashed shadow-sm bg-card/60 backdrop-blur-sm rounded-xl mb-3">
                    <CardContent className="text-center py-10 px-6">
                      <div className="relative mb-5 inline-flex">
                        <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-125" />
                        <div className="relative w-16 h-16 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center">
                          <CalendarX className="h-7 w-7 text-primary/80" />
                        </div>
                      </div>
                      <h3 className="text-base font-semibold mb-1.5">
                        {isToday ? 'Nenhum agendamento hoje' : 'Nenhum agendamento para este dia'}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-2 leading-relaxed">
                        {isToday ? 'Ainda não há clientes marcados para hoje.' : 'Ainda não há clientes marcados para este dia.'}
                      </p>
                      <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto mb-6 leading-relaxed">
                        Compartilhe seu link de agendamento para que seus clientes possam marcar um horário facilmente.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button
                          variant="default"
                          className="btn-primary-gradient px-5"
                          onClick={() => {
                            const slug = barbershop?.slug;
                            if (slug) {
                              const link = `${window.location.origin}/b/${slug}`;
                              navigator.clipboard.writeText(link);
                              toast.success('Link copiado!');
                            } else {
                              toast.error('Configure o perfil público primeiro');
                            }
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1.5" />
                          Copiar link de agendamento
                        </Button>
                        <Button
                          variant="outline"
                          className="px-5"
                          onClick={() => {
                            const slug = barbershop?.slug;
                            if (slug) {
                              const link = `${window.location.origin}/b/${slug}`;
                              if (navigator.share) {
                                navigator.share({ title: barbershop?.name, url: link });
                              } else {
                                navigator.clipboard.writeText(link);
                                toast.success('Link copiado!');
                              }
                            } else {
                              toast.error('Configure o perfil público primeiro');
                            }
                          }}
                        >
                          <Share2 className="h-4 w-4 mr-1.5" />
                          Compartilhar link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Slot grid - always rendered */}
                {(() => {
                  // Build display rows: merge pairs of 15-min slots into 30-min rows when both are "simple" (available/past/break/blocked without appointments)
                  type DisplayRow = {
                    slots: typeof daySlots;
                    merged: boolean; // true = 30-min merged row
                  };
                  
                  const displayRows: DisplayRow[] = [];
                  let i = 0;
                  
                  while (i < daySlots.length) {
                    const slot = daySlots[i];
                    const nextSlot = i + 1 < daySlots.length ? daySlots[i + 1] : null;
                    
                    const slotHasAppointment = !!appointmentsBySlot[slot.time] && appointmentsBySlot[slot.time].status !== 'cancelled';
                    const slotIsCovered = coveredSlots.has(slot.time);
                    const nextHasAppointment = nextSlot && !!appointmentsBySlot[nextSlot.time] && appointmentsBySlot[nextSlot.time].status !== 'cancelled';
                    const nextIsCovered = nextSlot && coveredSlots.has(nextSlot.time);
                    
                    // If current slot is covered by a multi-slot appointment, skip it
                    if (slotIsCovered) {
                      i++;
                      continue;
                    }
                    
                    // If this slot has an appointment, render it individually (appointment handles its own height)
                    if (slotHasAppointment) {
                      displayRows.push({ slots: [slot], merged: false });
                      i++;
                      continue;
                    }
                    
                    // Try to merge with next slot into a 30-min row
                    // Only merge if: next slot exists, is at +15 min, neither has appointments, neither is covered
                    const canMerge = nextSlot 
                      && !nextHasAppointment 
                      && !nextIsCovered
                      && slot.minute % 30 === 0  // current is :00 or :30
                      && nextSlot.minute === (slot.minute + 15) % 60
                      && (nextSlot.minute !== 0 || nextSlot.hour === slot.hour + 1 || (slot.minute === 45));
                    
                    if (canMerge) {
                      displayRows.push({ slots: [slot, nextSlot], merged: true });
                      i += 2;
                    } else {
                      displayRows.push({ slots: [slot], merged: false });
                      i++;
                    }
                  }
                  
                  return displayRows.map((row, rowIndex) => {
                    const slot = row.slots[0];
                    const appointment = appointmentsBySlot[slot.time];
                    const availability = checkSlotAvailability(slot.time, selectedDate, 15);
                    const blockedReason = getBlockedReason(slot.time);
                    const isPast = availability.reason === 'passado';
                    const isBreak = availability.reason === 'intervalo';
                    const isBlocked = availability.reason === 'bloqueado';
                    const isFullHour = slot.minute === 0;
                    const isHalfHour = slot.minute === 30;

                    // For merged rows, also check second slot's state
                    const secondSlot = row.merged ? row.slots[1] : null;
                    const secondAvailability = secondSlot ? checkSlotAvailability(secondSlot.time, selectedDate, 15) : null;
                    const secondBlockedReason = secondSlot ? getBlockedReason(secondSlot.time) : null;
                    const secondIsBreak = secondAvailability?.reason === 'intervalo';
                    const secondIsBlocked = secondAvailability?.reason === 'bloqueado';
                    const secondIsPast = secondAvailability?.reason === 'passado';

                    // Separator line
                    const separator = (
                      <div className={cn(
                        "absolute top-0 left-14 right-0 h-px",
                        isFullHour ? "bg-border/40" : isHalfHour ? "bg-border/20" : "bg-border/10"
                      )} />
                    );

                    // Appointment card (always individual, not merged)
                    if (appointment && appointment.status !== 'cancelled') {
                      const durationMin = appointment.service?.duration_minutes || 30;
                      const slotsSpanned = Math.ceil(durationMin / 15);
                      const is15Min = durationMin <= 15;
                      const cardMinHeight = is15Min ? 36 : slotsSpanned > 1 ? slotsSpanned * 40 + (slotsSpanned - 1) * 4 : 40;
                      const cfg = getStatusConfig(appointment.status);
                      
                      return (
                        <div key={slot.time} className="relative flex" style={{ animationDelay: `${rowIndex * 0.02}s` }}>
                          {separator}
                          <div className="w-14 shrink-0 pt-2.5 pr-3 text-right">
                            <p className="text-xs font-medium tabular-nums text-muted-foreground/70">{slot.time}</p>
                          </div>
                          <div
                            className={cn(
                              "flex-1 rounded-xl overflow-hidden cursor-pointer my-0.5",
                              "border-l-[3px] px-3",
                              is15Min ? "py-1.5" : "py-2.5",
                              "transition-all duration-200 active:scale-[0.99]",
                              "bg-secondary/80",
                              cfg.borderColor,
                            )}
                            onClick={() => handleCardClick(appointment)}
                            style={{ minHeight: `${cardMinHeight}px` }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                {appointment.service && (
                                  <p className={cn("font-semibold text-foreground/90 truncate", is15Min ? "text-[11px]" : "text-xs")}>
                                    {appointment.service.name}
                                  </p>
                                )}
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {appointment.customer_name}
                                </p>
                                {!is15Min && (
                                  <p className="text-[10px] text-muted-foreground/50 tabular-nums mt-0.5">
                                    {format(new Date(appointment.start_time), 'HH:mm')} — {format(new Date(appointment.end_time), 'HH:mm')}
                                  </p>
                                )}
                              </div>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0 border",
                                appointment.status === 'confirmed' && "bg-primary/10 text-primary border-primary/20",
                                appointment.status === 'completed' && "bg-success/10 text-success border-success/20",
                              )}>
                                {cfg.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // For merged rows where both slots are the same type, render as one 30-min row
                    const mergedHeight = row.merged ? 'py-5' : 'py-3';

                    // Blocked slot
                    if (isBlocked || (row.merged && secondIsBlocked)) {
                      return (
                        <div key={slot.time} className="relative flex">
                          {separator}
                          <div className="w-14 shrink-0 pt-2.5 pr-3 text-right">
                            <p className="text-xs font-medium tabular-nums text-muted-foreground/40">{slot.time}</p>
                          </div>
                          <div className={cn("flex-1 flex items-center gap-2 opacity-50", mergedHeight)}>
                            <Ban className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-[11px] text-muted-foreground">{blockedReason || secondBlockedReason || 'Bloqueado'}</span>
                          </div>
                        </div>
                      );
                    }

                    // Break slot
                    if (isBreak || (row.merged && secondIsBreak)) {
                      return (
                        <div key={slot.time} className="relative flex">
                          {separator}
                          <div className="w-14 shrink-0 pt-2.5 pr-3 text-right">
                            <p className="text-xs font-medium tabular-nums text-muted-foreground/40">{slot.time}</p>
                          </div>
                          <div className={cn("flex-1 flex items-center gap-2 opacity-40", mergedHeight)}>
                            <Clock className="h-3 w-3 text-warning shrink-0" />
                            <span className="text-[11px] text-warning/80">Intervalo</span>
                          </div>
                        </div>
                      );
                    }

                    // Past slot
                    if (isPast && (!row.merged || secondIsPast)) {
                      return (
                        <div key={slot.time} className="relative flex">
                          {separator}
                          <div className="w-14 shrink-0 pt-2.5 pr-3 text-right">
                            <p className="text-xs font-medium tabular-nums text-muted-foreground/25">{slot.time}</p>
                          </div>
                          <div className={cn("flex-1", mergedHeight)}>
                            <div className="h-px bg-border/10" />
                          </div>
                        </div>
                      );
                    }

                    // Available slot (30-min merged or 15-min individual)
                    const displayTime = row.merged 
                      ? `${slot.time}` 
                      : slot.time;
                    const endTimeLabel = row.merged && secondSlot
                      ? `${secondSlot.hour.toString().padStart(2, '0')}:${((secondSlot.minute + 15) % 60).toString().padStart(2, '0')}`
                      : `${slot.hour.toString().padStart(2, '0')}:${((slot.minute + 15) % 60).toString().padStart(2, '0')}`;

                    return (
                      <button
                        key={slot.time}
                        onClick={() => handleOpenManualDialog(slot.time)}
                        className={cn(
                          "relative w-full flex group",
                          "transition-all duration-200",
                        )}
                      >
                        {separator}
                        <div className="w-14 shrink-0 pt-2.5 pr-3 text-right">
                          <p className="text-xs font-medium tabular-nums text-muted-foreground/60">
                            {displayTime}
                          </p>
                        </div>
                        <div className={cn(
                          "flex-1 flex items-center justify-between px-2 rounded-lg -mx-1",
                          "group-hover:bg-accent/50 transition-colors",
                          mergedHeight
                        )}>
                          <span className="text-[11px] text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors">
                            {displayTime} <span className="mx-0.5">•</span> Disponível
                          </span>
                          <CalendarPlus className="h-3 w-3 text-transparent group-hover:text-muted-foreground/40 transition-all" />
                        </div>
                      </button>
                    );
                  });
                })()}

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
    </Suspense>
  );
};

export default Agenda;
