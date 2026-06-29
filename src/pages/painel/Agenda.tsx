import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, Appointment } from '@/lib/supabase';
import { awardLoyaltyPoints } from '@/lib/loyaltyUtils';
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { useSubscription } from '@/hooks/useSubscription';
import { useAvailability } from '@/hooks/useAvailability';
import { PremiumSkeleton, SkeletonSlot, SkeletonStats } from '@/components/ui/premium-skeleton';
import { startOfDay, addDays, startOfMonth, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import FloatingActionButton from '@/components/painel/FloatingActionButton';
import AgendaHeader from '@/components/painel/agenda/AgendaHeader';
import AgendaDaysStrip from '@/components/painel/agenda/AgendaDaysStrip';
import AgendaSlotGrid from '@/components/painel/agenda/AgendaSlotGrid';
import { AgendaContextType, ViewMode, toLocalDate, getTodayLocalDate, shiftMonthToStart } from '@/components/painel/agenda/agendaUtils';
import HolidayBanner from '@/components/painel/agenda/HolidayBanner';

/* Sticky wrapper — adds dynamic shadow on scroll */
const StickyDaysStrip = (props: React.ComponentProps<typeof AgendaDaysStrip>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
    );

    // Observe a sentinel element right above the sticky container
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.marginBottom = '-1px';
    sentinel.style.pointerEvents = 'none';
    el.parentElement?.insertBefore(sentinel, el);
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="sticky top-14 lg:top-0 z-20 -mx-3 md:-mx-5 lg:-mx-8 px-3 md:px-5 lg:px-8 pt-1 pb-0.5 transition-shadow duration-300"
      style={{
        boxShadow: isStuck ? '0 4px 20px -4px hsl(var(--foreground) / 0.08)' : 'none',
        backgroundColor: 'hsl(var(--background))',
      }}
    >
      <AgendaDaysStrip {...props} />
    </div>
  );
};

const MonthlyCalendar = lazy(() => import('@/components/painel/MonthlyCalendar'));
const ManualAppointmentDialog = lazy(() => import('@/components/painel/ManualAppointmentDialog'));
const AppointmentDetailsSheet = lazy(() => import('@/components/painel/AppointmentDetailsSheet'));
const EditAppointmentDialog = lazy(() => import('@/components/painel/EditAppointmentDialog'));
const QuickBlockDialog = lazy(() => import('@/components/painel/QuickBlockDialog'));
const GreetingHeader = lazy(() => import('@/components/painel/GreetingHeader'));
const ComandaSheet = lazy(() => import('@/components/painel/ComandaSheet'));

const Agenda = () => {
  const { barber, barbershop, isMaster } = useOutletContext<AgendaContextType>();
  const { barbers } = useBarbershopBarbers();
  const { checkCanPerformAction } = useSubscription();

  const canViewOthers = isMaster || barber?.permissions?.can_view_others_schedule === true;
  const canCreateForOthers = isMaster || barber?.permissions?.can_edit_others_schedule === true;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDate);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [preselectedTime, setPreselectedTime] = useState<string | null>(null);
  const [showQuickBlock, setShowQuickBlock] = useState(false);
  const [blockTime, setBlockTime] = useState<string | null>(null);
  const [hideEmptyState, setHideEmptyState] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showComanda, setShowComanda] = useState(false);
  const [comandaAppointment, setComandaAppointment] = useState<Appointment | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(getTodayLocalDate()));

  const selectedBarber = barbers.find(b => b.id === selectedBarberId) || barber;

  const {
    checkSlotAvailability, getOpeningHoursForDay, blockedSlots,
    refetch: refetchAvailability, loading: availabilityLoading,
  } = useAvailability({ barberId: selectedBarberId || barber?.id || '' });

  useEffect(() => {
    if (barber && !selectedBarberId) setSelectedBarberId(barber.id);
  }, [barber, selectedBarberId]);

  useEffect(() => {
    const today = getTodayLocalDate();
    setSelectedDate(today);
    setDisplayMonth(startOfMonth(today));
  }, []);

  // Sync display month with selected date
  useEffect(() => {
    const monthOfSelected = startOfMonth(selectedDate);
    if (monthOfSelected.getTime() !== displayMonth.getTime()) {
      setDisplayMonth(monthOfSelected);
    }
  }, [selectedDate, displayMonth]);

  const fetchAppointments = useCallback(async () => {
    if (!selectedBarberId) return;
    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = addDays(startOfSelectedDay, 1);
      const { data, error } = await supabase
        .from('appointments')
        .select(`*, service:services(*), barber:barbers(*)`)
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

  const fetchRef = useRef(fetchAppointments);
  const refetchAvailabilityRef = useRef(refetchAvailability);
  const suppressRealtimeUntilRef = useRef(0);
  useEffect(() => { fetchRef.current = fetchAppointments; }, [fetchAppointments]);
  useEffect(() => { refetchAvailabilityRef.current = refetchAvailability; }, [refetchAvailability]);

  // Coalesce burst-refreshes: when the user creates/edits/closes an appointment
  // we get a local onSuccess AND a realtime UPDATE for the same row almost
  // simultaneously. Without debouncing, the grid re-renders twice and produces
  // a visible "blink". 250ms is short enough to feel instant.
  const refreshTimer = useRef<number | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      fetchRef.current();
      refetchAvailabilityRef.current();
    }, 250);
  }, []);

  const handleLocalMutationSuccess = useCallback(() => {
    suppressRealtimeUntilRef.current = Date.now() + 1800;
    scheduleRefresh();
  }, [scheduleRefresh]);

  const shouldHandleRealtimeEvent = useCallback(() => Date.now() > suppressRealtimeUntilRef.current, []);
  useEffect(() => () => {
    if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
  }, []);

  const handleNewAppointment = useCallback(() => {
    scheduleRefresh();
  }, [scheduleRefresh]);

  useRealtimeAppointments({
    barberId: selectedBarberId || undefined,
    onNewAppointment: handleNewAppointment,
    shouldHandleEvent: shouldHandleRealtimeEvent,
  });

  useEffect(() => {
    if (selectedBarberId) fetchAppointments();
  }, [fetchAppointments, selectedBarberId]);

  // --- Handlers ---
  const handleOpenManualDialog = useCallback((time?: string) => {
    if (!checkCanPerformAction('create_appointment')) return;
    setPreselectedTime(time || null);
    setShowManualDialog(true);
  }, [checkCanPerformAction]);

  const handleOpenQuickBlock = useCallback((time?: string) => {
    setBlockTime(time || null);
    setShowQuickBlock(true);
  }, []);

  const handleDeleteAppointment = async (id: string) => {
    suppressRealtimeUntilRef.current = Date.now() + 1800;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir agendamento'); throw error; }
    toast.success('Agendamento excluído');
    setAppointments((items) => items.filter((item) => item.id !== id));
    scheduleRefresh();
  };

  const handleStatusChange = async (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    if (status === 'completed' && !checkCanPerformAction('complete_appointment')) return;
    suppressRealtimeUntilRef.current = Date.now() + 1800;
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); throw error; }
    if (status === 'completed') {
      const apt = appointments.find(a => a.id === id);
      if (apt && barbershop) {
        awardLoyaltyPoints({
          id: apt.id, customer_name: apt.customer_name,
          customer_phone: apt.customer_phone, barbershop_id: barbershop.id,
        }).catch(err => console.error('Erro ao pontuar fidelidade:', err));
      }
    }
    toast.success('Status atualizado');
    setAppointments((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
    scheduleRefresh();
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

  const handleShiftDay = (offset: number) => setSelectedDate(toLocalDate(addDays(selectedDate, offset)));
  const handleShiftMonth = (offset: number) => setSelectedDate((currentDate) => shiftMonthToStart(currentDate, offset));
  const handleDateSelectFromCalendar = (date: Date) => { setSelectedDate(toLocalDate(date)); setViewMode('daily'); };

  // --- Computed ---
  const dayOfWeek = selectedDate.getDay();
  const isDayClosed = !getOpeningHoursForDay(dayOfWeek);
  const isToday = isSameDay(selectedDate, new Date());
  const hasAppointments = useMemo(() => appointments.some(a => a.status !== 'cancelled'), [appointments]);

  const daySlots = useMemo(() => {
    const dayHours = getOpeningHoursForDay(selectedDate.getDay());
    if (!dayHours) return [];
    const [startH, startM] = dayHours.start_time.split(':').map(Number);
    const [endH, endM] = dayHours.end_time.split(':').map(Number);
    const slots: { time: string; hour: number; minute: number }[] = [];
    let h = startH, m = startM;
    while (h < endH || (h === endH && m < endM)) {
      slots.push({ time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`, hour: h, minute: m });
      m += 15;
      if (m >= 60) { m = 0; h++; }
    }
    return slots;
  }, [selectedDate, getOpeningHoursForDay]);

  // --- Loading skeleton ---
  if (loading && !selectedBarberId) {
    return (
      <div className="space-y-4 pb-24 animate-page-enter">
        <PremiumSkeleton className="h-12 w-3/4" />
        <PremiumSkeleton className="h-24 rounded-xl" />
        <SkeletonStats />
        {Array.from({ length: 6 }).map((_, i) => <SkeletonSlot key={i} />)}
      </div>
    );
  }

  const fallback = <Skeleton className="h-24 w-full rounded-xl" />;

  return (
    <Suspense fallback={fallback}>
      <div className="space-y-1.5 pb-20 animate-page-enter">
        <GreetingHeader barber={barber} barbershop={barbershop} isMaster={isMaster} selectedDate={selectedDate} refreshKey={dashboardRefreshKey} />

        <AgendaHeader
          selectedDate={selectedDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onShiftDay={handleShiftDay}
          canViewOthers={canViewOthers}
          barbers={barbers}
          currentBarber={barber}
          selectedBarberId={selectedBarberId}
          onBarberChange={setSelectedBarberId}
        />

        {(selectedBarber || barber) && (
          <ManualAppointmentDialog
            open={showManualDialog}
            onOpenChange={(open) => { setShowManualDialog(open); if (!open) setPreselectedTime(null); }}
            barber={canCreateForOthers ? selectedBarber! : barber!}
            selectedDate={selectedDate}
            onSuccess={handleLocalMutationSuccess}
            canCreateForOthers={canCreateForOthers}
            barbers={barbers}
            preselectedTime={preselectedTime}
          />
        )}

        {viewMode === 'monthly' && selectedBarber && (
          <MonthlyCalendar barber={selectedBarber} onDateSelect={handleDateSelectFromCalendar} selectedDate={selectedDate} />
        )}

        {viewMode === 'daily' && (
          <>
            <StickyDaysStrip
              selectedDate={selectedDate}
              displayMonth={displayMonth}
              onSelectDate={setSelectedDate}
              onShiftMonth={handleShiftMonth}
              selectedBarberId={selectedBarberId}
            />

            <HolidayBanner date={selectedDate} />

            <div className="animate-fade-in" style={{ animationDelay: '0.16s' }}>
              <AgendaSlotGrid
                loading={loading || availabilityLoading}
                isDayClosed={isDayClosed}
                isToday={isToday}
                selectedDate={selectedDate}
                daySlots={daySlots}
                appointments={appointments}
                blockedSlots={blockedSlots}
                hasAppointments={hasAppointments}
                hideEmptyState={hideEmptyState}
                onDismissEmptyState={() => setHideEmptyState(true)}
                barbershop={barbershop}
                checkSlotAvailability={checkSlotAvailability}
                onSlotClick={handleOpenManualDialog}
                onAppointmentClick={handleCardClick}
                onAppointmentComplete={(id) => handleStatusChange(id, 'completed')}
                onAppointmentDelete={handleDeleteAppointment}
                onAppointmentEdit={handleEditAppointment}
                getOpeningHoursForDay={getOpeningHoursForDay}
              />
            </div>
          </>
        )}

        <AppointmentDetailsSheet
          appointment={selectedAppointment}
          open={showDetailsSheet}
          onOpenChange={setShowDetailsSheet}
          onEdit={handleEditAppointment}
          onComplete={(id) => handleStatusChange(id, 'completed')}
          onDelete={handleDeleteAppointment}
          onOpenComanda={(apt) => {
            if (!checkCanPerformAction('complete_appointment')) return;
            setComandaAppointment(apt);
            setShowComanda(true);
          }}
        />

        <ComandaSheet
          open={showComanda}
          onOpenChange={setShowComanda}
          appointment={comandaAppointment ? {
            id: comandaAppointment.id,
            customer_name: comandaAppointment.customer_name,
            customer_phone: comandaAppointment.customer_phone,
            barbershop_id: comandaAppointment.barbershop_id ?? barbershop?.id ?? null,
            barber_id: comandaAppointment.barber_id ?? null,
            start_time: comandaAppointment.start_time,
            service: comandaAppointment.service ? {
              name: comandaAppointment.service.name,
              price: Number(comandaAppointment.service.price || 0),
              photo_url: (comandaAppointment.service as any).photo_url ?? null,
            } : null,
          } : null}
          onCompleted={() => {
            if (comandaAppointment) {
              setAppointments((items) => items.map((item) => (
                item.id === comandaAppointment.id ? { ...item, status: 'completed' } : item
              )));
            }
            handleLocalMutationSuccess();
            setDashboardRefreshKey((k) => k + 1);
          }}
        />

        <EditAppointmentDialog
          appointment={selectedAppointment}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={handleLocalMutationSuccess}
          isMaster={isMaster}
        />

        {(selectedBarber || barber) && (
          <QuickBlockDialog
            open={showQuickBlock}
            onOpenChange={(open) => { setShowQuickBlock(open); if (!open) setBlockTime(null); }}
            barber={selectedBarber || barber!}
            selectedDate={selectedDate}
            preselectedTime={blockTime}
            onSuccess={handleLocalMutationSuccess}
          />
        )}

        <FloatingActionButton onNewAppointment={() => handleOpenManualDialog()} onNewBlock={() => handleOpenQuickBlock()} />
      </div>
    </Suspense>
  );
};

export default Agenda;
