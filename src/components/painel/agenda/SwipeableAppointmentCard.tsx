import { useRef, useState, useCallback } from 'react';
import { Check, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Appointment } from '@/lib/supabase';
import { getStatusConfig } from './agendaUtils';

interface SwipeableAppointmentCardProps {
  appointment: Appointment;
  is15Min: boolean;
  cardMinHeight: number;
  onTap: (appointment: Appointment) => void;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (appointment: Appointment) => void;
}

const ACTION_WIDTH = 72;
const SWIPE_THRESHOLD = 40;

const SwipeableAppointmentCard = ({
  appointment,
  is15Min,
  cardMinHeight,
  onTap,
  onComplete,
  onDelete,
  onEdit,
}: SwipeableAppointmentCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isSwipingRef = useRef(false);
  const isVerticalRef = useRef(false);
  const [offsetX, setOffsetX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const cfg = getStatusConfig(appointment.status);
  const isConfirmed = appointment.status === 'confirmed';
  const maxSwipe = isConfirmed ? ACTION_WIDTH * 3 : ACTION_WIDTH * 2;

  const snapTo = useCallback((target: number) => {
    setTransitioning(true);
    setOffsetX(target);
    setIsRevealed(target !== 0);
    setTimeout(() => setTransitioning(false), 250);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (transitioning) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    currentXRef.current = offsetX;
    isSwipingRef.current = false;
    isVerticalRef.current = false;
  }, [offsetX, transitioning]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    // Decide direction on first significant move
    if (!isSwipingRef.current && !isVerticalRef.current) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isVerticalRef.current = true;
        return;
      }
      if (Math.abs(deltaX) > 8) {
        isSwipingRef.current = true;
      }
    }

    if (isVerticalRef.current) return;
    if (!isSwipingRef.current) return;

    e.preventDefault();

    let newOffset = currentXRef.current + deltaX;
    // Clamp: no right-swipe beyond 0, no left-swipe beyond max
    newOffset = Math.max(-maxSwipe, Math.min(0, newOffset));
    // Rubber band
    if (newOffset < -maxSwipe) {
      newOffset = -maxSwipe + (newOffset + maxSwipe) * 0.3;
    }
    setOffsetX(newOffset);
  }, [maxSwipe]);

  const handleTouchEnd = useCallback(() => {
    if (isVerticalRef.current) return;

    if (!isSwipingRef.current) {
      // It was a tap
      if (isRevealed) {
        snapTo(0);
      } else {
        onTap(appointment);
      }
      return;
    }

    // Snap logic
    if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
      snapTo(-maxSwipe);
    } else {
      snapTo(0);
    }
  }, [offsetX, maxSwipe, isRevealed, snapTo, onTap, appointment]);

  const handleAction = (action: 'complete' | 'delete' | 'edit') => {
    snapTo(0);
    setTimeout(() => {
      if (action === 'complete' && onComplete) onComplete(appointment.id);
      if (action === 'delete' && onDelete) onDelete(appointment.id);
      if (action === 'edit' && onEdit) onEdit(appointment);
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl my-0.5">
      {/* Action buttons behind the card */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        {onEdit && (
          <button
            onClick={() => handleAction('edit')}
            className="w-[72px] flex flex-col items-center justify-center gap-1 bg-accent text-accent-foreground transition-colors active:brightness-90"
          >
            <Pencil className="h-4 w-4" />
            <span className="text-[10px] font-medium">Editar</span>
          </button>
        )}
        {isConfirmed && onComplete && (
          <button
            onClick={() => handleAction('complete')}
            className="w-[72px] flex flex-col items-center justify-center gap-1 bg-success text-success-foreground transition-colors active:brightness-90"
          >
            <Check className="h-4 w-4" />
            <span className="text-[10px] font-medium">Concluir</span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => handleAction('delete')}
            className="w-[72px] flex flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground transition-colors active:brightness-90"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-[10px] font-medium">Excluir</span>
          </button>
        )}
      </div>

      {/* Foreground card */}
      <div
        className={cn(
          "relative border-l-[3px] px-2.5 bg-secondary/80",
          is15Min ? "py-1" : "py-2",
          cfg.borderColor,
          transitioning && "transition-transform duration-250 ease-out",
        )}
        style={{
          transform: `translateX(${offsetX}px)`,
          minHeight: `${cardMinHeight}px`,
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {appointment.service && (
              <p className={cn("font-semibold text-foreground/90 truncate", is15Min ? "text-[11px]" : "text-xs")}>
                {appointment.service.name}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{appointment.customer_name}</p>
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
};

export default SwipeableAppointmentCard;
