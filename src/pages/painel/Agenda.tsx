import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addDays, startOfDay, format } from 'date-fns';
import { supabase, type Appointment } from '@/lib/supabase';
import { awardLoyaltyPoints } from '@/lib/loyaltyUtils';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { useSubscription } from '@/hooks/useSubscription';
import { useAgendaTimeline } from '@/hooks/useAgendaTimeline';
import { toast } from 'sonner';
import FloatingActionButton from '@/components/painel/FloatingActionButton';
import AgendaToolbar from '@/components/painel/agenda/AgendaToolbar';
import AgendaTimeline from '@/components/painel/agenda/AgendaTimeline';
import HolidayBanner from '@/components/painel/agenda/HolidayBanner';
import { AgendaContextType, getTodayLocalDate, toLocalDate } from '@/components/painel/agenda/agendaUtils';
import { canEditAgenda, columnBlocks, currency, DEFAULT_AGENDA_PREFERENCES, freeIntervals, type AgendaMode, type AgendaFilter, type AgendaPreferences, type TimelineColumn } from '@/components/painel/agenda/timelineUtils';
import { Button } from '@/components/ui/button';

const MonthlyCalendar = lazy(() => import('@/components/painel/MonthlyCalendar'));
const ManualAppointmentDialog = lazy(() => import('@/components/painel/ManualAppointmentDialog'));
const AppointmentDetailsSheet = lazy(() => import('@/components/painel/AppointmentDetailsSheet'));
const EditAppointmentDialog = lazy(() => import('@/components/painel/EditAppointmentDialog'));
const QuickBlockDialog = lazy(() => import('@/components/painel/QuickBlockDialog'));
const ComandaSheet = lazy(() => import('@/components/painel/ComandaSheet'));

const Agenda = () => {
  const { barber, barbershop, isMaster } = useOutletContext<AgendaContextType>();
  const { barbers } = useBarbershopBarbers();
  const { checkCanPerformAction } = useSubscription();
  const canViewOthers = isMaster || barber?.permissions?.can_view_others_schedule === true;
  const canCreateForOthers = isMaster || barber?.permissions?.can_edit_others_schedule === true;
  const canEditBarber = (id: string) => canEditAgenda(id, barber, isMaster);
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDate);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [mode, setMode] = useState<AgendaMode>('individual');
  const [monthly, setMonthly] = useState(false);
  const [filter, setFilter] = useState<AgendaFilter>('active');
  const [preferences, setPreferences] = useState<AgendaPreferences>(DEFAULT_AGENDA_PREFERENCES);
  const preferenceKey = `bookify-agenda-appearance:${barbershop?.id || ''}:${barber?.auth_id || ''}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey) || 'null');
      setPreferences({ palette: ['original', 'ocean', 'warm'].includes(saved?.palette) ? saved.palette : 'original', density: saved?.density === 'comfortable' ? 'comfortable' : 'compact' });
    } catch { setPreferences(DEFAULT_AGENDA_PREFERENCES); }
  }, [preferenceKey]);
  const changePreferences = (value: AgendaPreferences) => {
    setPreferences(value);
    try { localStorage.setItem(preferenceKey, JSON.stringify(value)); } catch { /* private browsing */ }
  };
  const effectiveMode = mode === 'team' && !canViewOthers ? 'individual' : mode;
  const timeline = useAgendaTimeline({ shopId: barbershop?.id, barbers, currentBarber: barber, selectedBarberId, canViewOthers, mode: effectiveMode, selectedDate });
  const selectedBarber = timeline.selected;
  const appointments = timeline.data?.appointments || [];
  const columns = useMemo<TimelineColumn[]>(() => timeline.dates.flatMap(date => timeline.visible.map(b => {
    const hours = timeline.data?.openingHours.find(h => h.barber_id === b.id && h.day_of_week === date.getDay());
    const start = startOfDay(date), end = addDays(start, 1);
    return { id: `${b.id}-${format(date, 'yyyy-MM-dd')}`, date, barber: b, hours,
      appointments: (timeline.data?.appointments || []).filter(a => a.barber_id === b.id && new Date(a.start_time) < end && new Date(a.end_time) > start),
      blocks: columnBlocks(date, b.id, hours, timeline.data?.blockedSlots || []) };
  })), [timeline.data, timeline.dates, timeline.visible]);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [preselectedTime, setPreselectedTime] = useState<string | null>(null);
  const [preselectedBarberId, setPreselectedBarberId] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState(getTodayLocalDate);
  const [showQuickBlock, setShowQuickBlock] = useState(false);
  const [blockTime, setBlockTime] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showComanda, setShowComanda] = useState(false);
  const [comandaAppointment, setComandaAppointment] = useState<Appointment | null>(null);
  const dialogBarber = timeline.allowed.find(b => b.id === preselectedBarberId) || selectedBarber;
  const scheduleAgendaRefresh = useCallback((_includeAvailability = false) => { void timeline.refresh(); }, [timeline.refresh]);
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try { await timeline.refresh(); } finally { setRefreshing(false); }
  };
  const handleOpenManualDialog = (time?: string, id = selectedBarber?.id, date = selectedDate) => {
    if (!id || !canEditBarber(id) || !checkCanPerformAction('create_appointment')) return;
    setBookingDate(toLocalDate(date)); setPreselectedTime(time || null); setPreselectedBarberId(id); setShowManualDialog(true);
  };
  const handleOpenQuickBlock = (time?: string, id = selectedBarber?.id, date = selectedDate) => {
    if (!id || !canEditBarber(id) || !checkCanPerformAction('create_appointment')) return;
    setBookingDate(toLocalDate(date)); setPreselectedBarberId(id); setBlockTime(time || null); setShowQuickBlock(true);
  };
  const editableAppointment = (id: string) => {
    const apt = appointments.find(a => a.id === id);
    return apt && canEditBarber(apt.barber_id) ? apt : null;
  };
  const handleDeleteAppointment = async (id: string) => {
    if (!editableAppointment(id)) { toast.error('Sem permissão para alterar este agendamento'); return; }
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir agendamento'); throw error; }
    toast.success('Agendamento excluído'); scheduleAgendaRefresh();
  };
  const handleStatusChange = async (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    const apt = editableAppointment(id);
    if (!apt) { toast.error('Sem permissão para alterar este agendamento'); return; }
    if (status === 'completed' && !checkCanPerformAction('complete_appointment')) return;
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); throw error; }
    if (status === 'completed' && barbershop) {
      awardLoyaltyPoints({ id: apt.id, customer_name: apt.customer_name, customer_phone: apt.customer_phone, barbershop_id: barbershop.id }).catch(() => toast.error('Não foi possível atualizar os pontos'));
    }
    toast.success('Status atualizado'); scheduleAgendaRefresh(); setDashboardRefreshKey(k => k + 1);
  };
  const handleCardClick = (appointment: Appointment) => { setSelectedAppointment(appointment); setShowDetailsSheet(true); };
  const handleEditAppointment = (appointment: Appointment) => { if (!canEditBarber(appointment.barber_id)) return; setSelectedAppointment(appointment); setShowEditDialog(true); };
  const active = appointments.filter(a => a.status !== 'cancelled');
  const expected = active.reduce((sum, a) => sum + Number(a.service?.price || 0), 0);
  const vacancies = columns.reduce((sum, c) => sum + freeIntervals(c, new Date()).length, 0);
  useEffect(() => {
    // App-like screen: only the timeline scrolls; the page itself never moves or rubber-bands.
    const root = document.documentElement;
    root.classList.add('agenda-lock');
    return () => root.classList.remove('agenda-lock');
  }, []);
  return <Suspense fallback={<div className="agenda-loading animate-pulse"><span /><span /><span /></div>}>
    <div className={`agenda-cockpit palette-${preferences.palette} pb-20`}>
      <AgendaToolbar mode={effectiveMode} onModeChange={value => { setMode(value); setMonthly(false); }} selectedDate={selectedDate} onDateChange={date => setSelectedDate(toLocalDate(date))}
        canViewOthers={canViewOthers} barbers={timeline.allowed} selectedBarber={selectedBarber} onBarberChange={setSelectedBarberId}
        filter={filter} onFilterChange={setFilter} preferences={preferences} onPreferencesChange={changePreferences}
        refreshing={refreshing || timeline.isFetching} onRefresh={handleManualRefresh} onNew={() => handleOpenManualDialog()} canCreate={Boolean(selectedBarber && canEditBarber(selectedBarber.id))} onMonthView={() => setMonthly(true)} />
      <div className="agenda-summary"><span><strong>{active.length}</strong> clientes</span><span><strong>{currency(expected)}</strong> previsto</span><span><strong>{vacancies}</strong> espaços livres</span></div>
      <HolidayBanner date={selectedDate} />
      {monthly && selectedBarber ? <><Button variant="ghost" className="my-2" onClick={() => setMonthly(false)}>Voltar à agenda</Button><MonthlyCalendar barber={selectedBarber} selectedDate={selectedDate} onDateSelect={date => { setSelectedDate(toLocalDate(date)); setMonthly(false); }} /></> :
        timeline.isError ? <div className="agenda-empty"><p>Não foi possível carregar a agenda.</p><Button variant="ghost" onClick={handleManualRefresh}>Tentar novamente</Button></div> :
        timeline.isPending && timeline.visible.length > 0 ? <div className="agenda-loading animate-pulse" aria-label="Carregando agenda"><span /><span /><span /><span /></div> :
        <AgendaTimeline columns={columns} mode={effectiveMode} filter={filter} compact={preferences.density === 'compact'} canEditBarber={canEditBarber}
          onSlot={handleOpenManualDialog} onBlock={handleOpenQuickBlock} onAppointment={handleCardClick} onEdit={handleEditAppointment} onComplete={id => { void handleStatusChange(id, 'completed'); }} onDelete={id => { void handleDeleteAppointment(id); }} />}
      {dialogBarber && <ManualAppointmentDialog open={showManualDialog} onOpenChange={open => { setShowManualDialog(open); if (!open) { setPreselectedTime(null); setPreselectedBarberId(null); } }}
        barber={dialogBarber} selectedDate={bookingDate} onSuccess={() => scheduleAgendaRefresh()} canCreateForOthers={canCreateForOthers} barbers={timeline.allowed} preselectedTime={preselectedTime} preselectedBarberId={preselectedBarberId} />}
        <AppointmentDetailsSheet
          appointment={selectedAppointment}
          canEdit={Boolean(selectedAppointment && canEditBarber(selectedAppointment.barber_id))}
          open={showDetailsSheet}
          onOpenChange={setShowDetailsSheet}
          onEdit={handleEditAppointment}
          onComplete={(id) => handleStatusChange(id, 'completed')}
          onDelete={handleDeleteAppointment}
          onOpenComanda={(apt) => {
            if (!canEditBarber(apt.barber_id) || !checkCanPerformAction('complete_appointment')) return;
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
            } : null,
          } : null}
          onCompleted={() => {
            scheduleAgendaRefresh(false);
            setDashboardRefreshKey((k) => k + 1);
          }}
        />

        <EditAppointmentDialog
          appointment={selectedAppointment}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={() => scheduleAgendaRefresh()}
          isMaster={isMaster}
        />

      {dialogBarber && <QuickBlockDialog open={showQuickBlock} onOpenChange={open => { setShowQuickBlock(open); if (!open) { setBlockTime(null); setPreselectedBarberId(null); } }} barber={dialogBarber} selectedDate={bookingDate} preselectedTime={blockTime} onSuccess={() => scheduleAgendaRefresh()} />}
      {selectedBarber && canEditBarber(selectedBarber.id) && <FloatingActionButton onNewAppointment={() => handleOpenManualDialog()} onNewBlock={() => handleOpenQuickBlock()} />}
    </div>
  </Suspense>;
};
export default Agenda;
