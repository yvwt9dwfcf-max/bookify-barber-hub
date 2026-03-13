import { useState } from 'react';
import { Plus, CalendarPlus as Calendar, CircleSlash as Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onNewAppointment: () => void;
  onNewBlock: () => void;
}

const FloatingActionButton = ({ onNewAppointment, onNewBlock }: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
      {/* Menu items */}
      <div
        className={cn(
          'flex flex-col-reverse gap-3 transition-all duration-400',
          isOpen ? '' : 'pointer-events-none'
        )}
      >
        {/* New Appointment */}
        <div 
          className={cn(
            'flex items-center gap-3 transition-all duration-400',
            isOpen 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          )}
          style={{
            transitionDelay: isOpen ? '0.12s' : '0s'
          }}
        >
          <span className="bg-card text-card-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-md border border-border/50">
            Novo agendamento
          </span>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
            onClick={() => {
              onNewAppointment();
              setIsOpen(false);
            }}
          >
            <Calendar className="h-5 w-5" />
          </Button>
        </div>

        {/* New Block */}
        <div 
          className={cn(
            'flex items-center gap-3 transition-all duration-400',
            isOpen 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          )}
          style={{
            transitionDelay: isOpen ? '0.06s' : '0s'
          }}
        >
          <span className="bg-card text-card-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-md border border-border/50">
            Novo bloqueio
          </span>
          <Button
            size="icon"
            variant="secondary"
            className="h-12 w-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
            onClick={() => {
              onNewBlock();
              setIsOpen(false);
            }}
          >
            <Ban className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main FAB */}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-md transition-all duration-300 bg-primary/90 hover:bg-primary hover:scale-105"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plus 
          className={cn(
            'h-5 w-5 transition-transform duration-300',
            isOpen && 'rotate-45'
          )} 
        />
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FloatingActionButton;
