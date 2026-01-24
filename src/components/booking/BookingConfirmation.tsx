import { CheckCircle, Calendar, User, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface BookingConfirmationProps {
  appointment: Appointment;
  onNewBooking: () => void;
}

export function BookingConfirmation({ appointment, onNewBooking }: BookingConfirmationProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="w-full max-w-md mx-auto text-center animate-fade-in">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto bg-success/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Agendamento confirmado!</h1>
        <p className="text-muted-foreground">
          Seu horário foi reservado com sucesso.
        </p>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-card-lg text-left space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Profissional</p>
            <p className="font-medium">{appointment.barber?.name || 'Barbeiro'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Scissors className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Serviço</p>
            <p className="font-medium">{appointment.service?.name || 'Serviço'}</p>
            {appointment.service && (
              <p className="text-sm text-primary font-semibold">
                {formatPrice(Number(appointment.service.price))}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Data e horário</p>
            <p className="font-medium">
              {format(new Date(appointment.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(appointment.start_time), 'HH:mm')} - {format(new Date(appointment.end_time), 'HH:mm')}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Button onClick={onNewBooking} className="w-full btn-primary-gradient" size="lg">
          Fazer novo agendamento
        </Button>
        <Button variant="outline" asChild className="w-full" size="lg">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
