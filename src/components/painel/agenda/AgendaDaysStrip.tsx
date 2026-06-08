import { useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toLocalDate } from './agendaUtils';

interface AgendaDaysStripProps {
  selectedDate: Date;
  displayMonth: Date;
  onSelectDate: (date: Date) => void;
  onShiftMonth: (offset: number) => void;
  selectedBarberId: string | null;
}

const AgendaDaysStrip = ({
  selectedDate, displayMonth, onSelectDate, onShiftMonth, selectedBarberId,
}: AgendaDaysStripProps) => {
  const daysScrollRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(displayMonth),
      end: endOfMonth(displayMonth),
    });
  }, [displayMonth]);

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

    requestAnimationFrame(() => {
      requestAnimationFrame(doScroll);
    });
  }, [selectedDate, days, selectedBarberId]);

  return (
    <Card className="border-border/50 shadow-md bg-card/95 backdrop-blur-md overflow-hidden animate-fade-in rounded-xl" style={{ animationDelay: '0.08s' }}>
      <CardContent className="px-2 pt-2 pb-2.5">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost" size="icon"
            onClick={() => onShiftMonth(-1)}
            className="h-7 w-7 min-h-[28px] min-w-[28px] transition-all active:scale-95"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium text-muted-foreground capitalize">
            {format(displayMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button
            variant="ghost" size="icon"
            onClick={() => onShiftMonth(1)}
            className="h-7 w-7 min-h-[28px] min-w-[28px] transition-all active:scale-95"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div
          ref={daysScrollRef}
          className="flex gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-0.5"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isSameDay(day, new Date());
            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDate(toLocalDate(day))}
                className={cn(
                  'flex flex-col items-center pt-1.5 pb-1 px-2 rounded-lg transition-all duration-200 snap-center shrink-0',
                  'hover:bg-accent/50 active:scale-95',
                  isSelected && 'text-primary-foreground hover:bg-primary shadow-md',
                  isDayToday && !isSelected && 'ring-1 ring-primary/50'
                )}
                style={{
                  background: isSelected ? 'var(--primary-gradient)' : undefined,
                  minWidth: '42px',
                }}
              >
                <span className="text-[9px] font-medium uppercase opacity-70 leading-none mb-1">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-sm font-semibold leading-none">{format(day, 'd')}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgendaDaysStrip;
