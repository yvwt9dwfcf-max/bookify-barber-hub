import { useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonSlot } from '@/components/ui/premium-skeleton';
import { CircleSlash as Ban, Timer as Clock, CalendarPlus } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Appointment, BlockedSlot } from '@/lib/supabase';
import { getStatusConfig } from './agendaUtils';
import { SlotAvailability } from '@/hooks/useAvailability';
import AgendaEmptyState from './AgendaEmptyState';
import { Barbershop } from '@/lib/supabase';
import SwipeableAppointmentCard from './SwipeableAppointmentCard';

interface DaySlot {
  time: string;
  hour: number;
  minute: number;
}

interface AgendaSlotGridProps {
  loading: boolean;
  isDayClosed: boolean;
  isToday: boolean;
  selectedDate: Date;
  daySlots: DaySlot[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  hasAppointments: boolean;
  hideEmptyState: boolean;
  onDismissEmptyState: () => void;
  barbershop: Barbershop | null;
  checkSlotAvailability: (timeSlot: string, date: Date, durationMinutes: number) => SlotAvailability;
  onSlotClick: (time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentComplete?: (id: string) => void;
  onAppointmentDelete?: (id: string) => void;
  onAppointmentEdit?: (appointment: Appointment) => void;
  getOpeningHoursForDay: (dayOfWeek: number) => any;
}

const AgendaSlotGrid = ({
  loading, isDayClosed, isToday, selectedDate,
  daySlots, appointments, blockedSlots,
  hasAppointments, hideEmptyState, onDismissEmptyState,
  barbershop, checkSlotAvailability, onSlotClick, onAppointmentClick,
  onAppointmentComplete, onAppointmentDelete, onAppointmentEdit,
}: AgendaSlotGridProps) => {
  // Map appointments to their time slots
  const { appointmentsBySlot, coveredSlots } = useMemo(() => {
    const map: Record<string, Appointment> = {};
    const covered = new Set<string>();
    appointments.forEach(apt => {
      const startTime = new Date(apt.start_time);
      const endTime = new Date(apt.end_time);
      const key = format(startTime, 'HH:mm');
      map[key] = apt;
      let slotTime = new Date(startTime.getTime() + 15 * 60 * 1000);
      while (slotTime < endTime) {
        covered.add(format(slotTime, 'HH:mm'));
        slotTime = new Date(slotTime.getTime() + 15 * 60 * 1000);
      }
    });
    return { appointmentsBySlot: map, coveredSlots: covered };
  }, [appointments]);

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

  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonSlot key={i} />)}
      </div>
    );
  }

  if (isDayClosed) {
    return (
      <Card className="border-border/40 border-dashed shadow-sm bg-card/60 backdrop-blur-sm rounded-xl">
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-muted/30">
            <Ban className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Dia fechado</p>
          <p className="text-xs text-muted-foreground/70">Não há expediente configurado para este dia</p>
        </CardContent>
      </Card>
    );
  }

  // Build display rows: merge pairs of 15-min slots into 30-min rows
  type DisplayRow = { slots: DaySlot[]; merged: boolean };
  const displayRows: DisplayRow[] = [];
  let i = 0;
  while (i < daySlots.length) {
    const slot = daySlots[i];
    const nextSlot = i + 1 < daySlots.length ? daySlots[i + 1] : null;
    const slotHasAppointment = !!appointmentsBySlot[slot.time] && appointmentsBySlot[slot.time].status !== 'cancelled';
    const slotIsCovered = coveredSlots.has(slot.time);
    const nextHasAppointment = nextSlot && !!appointmentsBySlot[nextSlot.time] && appointmentsBySlot[nextSlot.time].status !== 'cancelled';
    const nextIsCovered = nextSlot && coveredSlots.has(nextSlot.time);

    if (slotIsCovered) { i++; continue; }
    if (slotHasAppointment) { displayRows.push({ slots: [slot], merged: false }); i++; continue; }

    const canMerge = nextSlot
      && !nextHasAppointment
      && !nextIsCovered
      && slot.minute % 30 === 0
      && nextSlot.minute === (slot.minute + 15) % 60
      && (nextSlot.minute !== 0 || nextSlot.hour === slot.hour + 1 || slot.minute === 45);

    if (canMerge) {
      displayRows.push({ slots: [slot, nextSlot], merged: true });
      i += 2;
    } else {
      displayRows.push({ slots: [slot], merged: false });
      i++;
    }
  }

  return (
    <div className="relative">
      {!hasAppointments && !hideEmptyState && (
        <AgendaEmptyState isToday={isToday} barbershop={barbershop} onDismiss={onDismissEmptyState} />
      )}

      {displayRows.map((row, rowIndex) => {
        const slot = row.slots[0];
        const appointment = appointmentsBySlot[slot.time];
        const availability = checkSlotAvailability(slot.time, selectedDate, 15);
        const blockedReason = getBlockedReason(slot.time);
        const isPast = availability.reason === 'passado';
        const isBreak = availability.reason === 'intervalo';
        const isBlocked = availability.reason === 'bloqueado';
        const isFullHour = slot.minute === 0;
        const isHalfHour = slot.minute === 30;

        const secondSlot = row.merged ? row.slots[1] : null;
        const secondAvailability = secondSlot ? checkSlotAvailability(secondSlot.time, selectedDate, 15) : null;
        const secondBlockedReason = secondSlot ? getBlockedReason(secondSlot.time) : null;
        const secondIsBreak = secondAvailability?.reason === 'intervalo';
        const secondIsBlocked = secondAvailability?.reason === 'bloqueado';
        const secondIsPast = secondAvailability?.reason === 'passado';

        const separator = (
          <div className={cn(
            "absolute top-0 left-12 right-0 h-px",
            isFullHour ? "bg-border/40" : isHalfHour ? "bg-border/20" : "bg-border/10"
          )} />
        );

        // Appointment card
        if (appointment && appointment.status !== 'cancelled') {
          const durationMin = appointment.service?.duration_minutes || 30;
          const slotsSpanned = Math.ceil(durationMin / 15);
          const is15Min = durationMin <= 15;
          const cardMinHeight = is15Min ? 32 : slotsSpanned > 1 ? slotsSpanned * 28 + (slotsSpanned - 1) * 3 : 36;

          return (
            <div key={slot.time} className="relative flex" style={{ animationDelay: `${rowIndex * 0.02}s` }}>
              {separator}
              <div className="w-12 shrink-0 pt-2 pr-2 text-right">
                <p className="text-[11px] font-medium tabular-nums text-muted-foreground/70">{slot.time}</p>
              </div>
              <div className="flex-1">
                <SwipeableAppointmentCard
                  appointment={appointment}
                  is15Min={is15Min}
                  cardMinHeight={cardMinHeight}
                  onTap={onAppointmentClick}
                  onComplete={onAppointmentComplete}
                  onDelete={onAppointmentDelete}
                  onEdit={onAppointmentEdit}
                />
              </div>
            </div>
          );
        }

        const mergedHeight = row.merged ? 'py-3.5' : 'py-2';

        // Blocked
        if (isBlocked || (row.merged && secondIsBlocked)) {
          return (
            <div key={slot.time} className="relative flex">
              {separator}
              <div className="w-12 shrink-0 pt-2 pr-2 text-right">
                <p className="text-[11px] font-medium tabular-nums text-muted-foreground/40">{slot.time}</p>
              </div>
              <div className={cn("flex-1 flex items-center gap-2 opacity-50", mergedHeight)}>
                <Ban className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground">{blockedReason || secondBlockedReason || 'Bloqueado'}</span>
              </div>
            </div>
          );
        }

        // Break
        if (isBreak || (row.merged && secondIsBreak)) {
          return (
            <div key={slot.time} className="relative flex">
              {separator}
              <div className="w-12 shrink-0 pt-2 pr-2 text-right">
                <p className="text-[11px] font-medium tabular-nums text-muted-foreground/40">{slot.time}</p>
              </div>
              <div className={cn("flex-1 flex items-center gap-2 opacity-40", mergedHeight)}>
                <Clock className="h-3 w-3 text-warning shrink-0" />
                <span className="text-[11px] text-warning/80">Intervalo</span>
              </div>
            </div>
          );
        }

        // Past
        if (isPast && (!row.merged || secondIsPast)) {
          return (
            <div key={slot.time} className="relative flex">
              {separator}
              <div className="w-12 shrink-0 pt-2 pr-2 text-right">
                <p className="text-[11px] font-medium tabular-nums text-muted-foreground/25">{slot.time}</p>
              </div>
              <div className={cn("flex-1", mergedHeight)}>
                <div className="h-px bg-border/10" />
              </div>
            </div>
          );
        }

        // Available
        const displayTime = slot.time;

        return (
          <button
            key={slot.time}
            onClick={() => onSlotClick(slot.time)}
            className="relative w-full flex group transition-all duration-200"
          >
            {separator}
            <div className="w-12 shrink-0 pt-2 pr-2 text-right">
              <p className="text-[11px] font-medium tabular-nums text-muted-foreground/60">{displayTime}</p>
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
      })}
    </div>
  );
};

export default AgendaSlotGrid;
