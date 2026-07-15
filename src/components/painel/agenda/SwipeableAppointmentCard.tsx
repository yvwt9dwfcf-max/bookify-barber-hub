import { useRef, useState, useCallback } from 'react';
import { Check, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Appointment } from '@/lib/supabase';
import { getStatusConfig } from './agendaUtils';
import { useAgendaPalette, getAppointmentAccent } from '@/lib/agendaPalette';

interface SwipeableAppointmentCardProps {
  appointment: Appointment;
  is15Min: boolean;
  cardMinHeight: number;
  onTap: (appointment: Appointment) => void;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (appointment: Appointment) => void;
}

const ACTION_WIDTH = 64;
const SWIPE_THRESHOLD = 36;

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
  const [palette] = useAgendaPalette();
  const accent = getAppointmentAccent(appointment.status, palette);
  const isConfirmed = appointment.status === 'confirmed';
  const actionCount = (onEdit ? 1 : 0) + (isConfirmed && onComplete ? 1 : 0) + (onDelete ? 1 : 0);
  const maxSwipe = ACTION_WIDTH * actionCount;

  // Only show actions when there's actual offset
  const showActions = offsetX < -4;
  const actionProgress = Math.min(1, Math.abs(offsetX) / maxSwipe);

  const snapTo = useCallback((target: number) => {
    setTransitioning(true);
    setOffsetX(target);
    setIsRevealed(target !== 0);
    setTimeout(() => setTransitioning(false), 280);
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

    if (!isSwipingRef.current && !isVerticalRef.current) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isVerticalRef.current = true;
        return;
      }
      if (Math.abs(deltaX) > 8) {
        isSwipingRef.current = true;
      }
    }

    if (isVerticalRef.current || !isSwipingRef.current) return;

    e.preventDefault();

    let newOffset = currentXRef.current + deltaX;
    newOffset = Math.min(0, newOffset);
    // Rubber band past max
    if (newOffset < -maxSwipe) {
      const over = -newOffset - maxSwipe;
      newOffset = -(maxSwipe + over * 0.2);
    }
    setOffsetX(newOffset);
  }, [maxSwipe]);

  const handleTouchEnd = useCallback(() => {
    if (isVerticalRef.current) return;

    if (!isSwipingRef.current) {
      if (isRevealed) {
        snapTo(0);
      } else {
        onTap(appointment);
      }
      return;
    }

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
    }, 220);
  };

  const price = appointment.service?.price;

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl my-0.5">
      {/* Action buttons - only rendered when swiping */}
      {showActions && (
        <div
          className="absolute inset-y-0 right-0 flex items-stretch z-0"
          style={{ opacity: actionProgress }}
        >
          {onEdit && (
            <button
              onClick={() => handleAction('edit')}
              className="w-16 flex flex-col items-center justify-center gap-1 bg-muted/80 text-muted-foreground transition-all active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
                <Pencil className="h-3.5 w-3.5" />
              </div>
              <span className="text-[9px] font-medium opacity-80">Editar</span>
            </button>
          )}
          {isConfirmed && onComplete && (
            <button
              onClick={() => handleAction('complete')}
              className="w-16 flex flex-col items-center justify-center gap-1 bg-success/20 text-success transition-all active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span className="text-[9px] font-medium opacity-80">Concluir</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => handleAction('delete')}
              className="w-16 flex flex-col items-center justify-center gap-1 bg-destructive/20 text-destructive transition-all active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                <Trash2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-[9px] font-medium opacity-80">Excluir</span>
            </button>
          )}
        </div>
      )}

      {/* Foreground card */}
      <div
        className={cn(
          "relative rounded-xl bg-secondary/80 backdrop-blur-sm border border-border/30",
          "border-l-[3px]",
          is15Min ? "px-3 py-1.5" : "px-3 py-2",
          cfg.borderColor,
          transitioning && "transition-transform duration-[280ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
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
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className={cn(
              "font-semibold text-foreground truncate leading-tight",
              is15Min ? "text-[11px]" : "text-[12px]"
            )}>
              {appointment.customer_name}
            </p>
            {appointment.service && (
              <p className="text-[10px] text-muted-foreground truncate leading-tight">
                {appointment.service.name}
              </p>
            )}
            {!is15Min && (
              <p className="text-[9px] text-muted-foreground/60 tabular-nums leading-tight pt-0.5">
                {format(new Date(appointment.start_time), 'HH:mm')} — {format(new Date(appointment.end_time), 'HH:mm')}
                {price != null && price > 0 && (
                  <span className="ml-1.5 text-primary/80 font-medium">
                    R$ {price.toFixed(0)}
                  </span>
                )}
              </p>
            )}
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0 tracking-wide",
            appointment.status === 'confirmed' && "bg-primary/10 text-primary",
            appointment.status === 'completed' && "bg-success/10 text-success",
          )}>
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SwipeableAppointmentCard;
