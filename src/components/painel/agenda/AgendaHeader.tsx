import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CalendarRange as Calendar, CalendarDays, ChevronLeft, ChevronRight, UserRound as User, LayoutGrid,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ViewMode } from './agendaUtils';
import { Barber } from '@/lib/supabase';

interface AgendaHeaderProps {
  selectedDate: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onShiftDay: (offset: number) => void;
  // Barber selector
  canViewOthers: boolean;
  barbers: Barber[];
  currentBarber: Barber | null;
  selectedBarberId: string | null;
  onBarberChange: (id: string) => void;
}

const AgendaHeader = ({
  selectedDate, viewMode, onViewModeChange, onShiftDay,
  canViewOthers, barbers, currentBarber, selectedBarberId, onBarberChange,
}: AgendaHeaderProps) => {
  return (
    <>
      <div className="animate-fade-in space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost" size="icon"
            onClick={() => onShiftDay(-1)}
            className="h-8 w-8 shrink-0 transition-all hover:-translate-x-0.5 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold capitalize leading-tight">
              {format(selectedDate, 'EEEE', { locale: ptBR })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button
            variant="ghost" size="icon"
            onClick={() => onShiftDay(1)}
            className="h-8 w-8 shrink-0 transition-all hover:translate-x-0.5 active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center gap-1 -mt-0.5">
          <Button
            variant={viewMode === 'daily' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('daily')}
            className={cn(
              "h-8 w-8 rounded-xl transition-all active:scale-95",
              viewMode === 'daily' && 'btn-primary-gradient shadow-md'
            )}
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onViewModeChange('monthly')}
            className={cn(
              "h-8 w-8 rounded-xl transition-all active:scale-95",
              viewMode === 'monthly' && 'btn-primary-gradient shadow-md'
            )}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {canViewOthers && barbers.length > 1 && (
        <Card className="border-border/50 shadow-sm bg-card/80 backdrop-blur-sm animate-fade-in rounded-xl" style={{ animationDelay: '0.05s' }}>
          <CardContent className="p-2">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground">Visualizando agenda de:</label>
                <Select value={selectedBarberId || ''} onValueChange={onBarberChange}>
                  <SelectTrigger className="mt-0.5 h-7 text-sm border-border/50">
                    <SelectValue placeholder="Selecione um barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.id === currentBarber?.id ? '(você)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AgendaHeader;
