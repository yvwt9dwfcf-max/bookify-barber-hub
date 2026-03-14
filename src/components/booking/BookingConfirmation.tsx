import { useState, useEffect } from 'react';
import { CircleCheck as CheckCircle, CalendarDays as Calendar, UserRound as User, Sparkles as Scissors, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Appointment, Barber, supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface BookingConfirmationProps {
  appointment: Appointment;
  onNewBooking: () => void;
  barbershopId?: string;
  preselectedBarber?: Barber | null;
}

export function BookingConfirmation({ appointment, onNewBooking, barbershopId, preselectedBarber }: BookingConfirmationProps) {
  const navigate = useNavigate();
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);

  useEffect(() => {
    if (!barbershopId) return;
    const fetchWhatsapp = async () => {
      const { data: profile } = await supabase
        .from('public_profiles')
        .select('whatsapp_numero')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();
      
      const { data: shop } = await supabase
        .from('barbershops')
        .select('phone')
        .eq('id', barbershopId)
        .maybeSingle();

      const number = profile?.whatsapp_numero || shop?.phone;
      if (number) {
        setWhatsappLink(`https://wa.me/55${number.replace(/\D/g, '')}`);
      }
    };
    fetchWhatsapp();
  }, [barbershopId]);

  const handleBackToStart = () => {
    if (barbershopId) {
      const currentPath = window.location.pathname;
      // Extract the base booking URL (e.g. /agendar/slug or /b/slug)
      // Try to find the barbershop slug from the current URL
      const slugMatch = currentPath.match(/^\/(?:agendar|barbearia|b)\/([^/?]+)/);
      if (slugMatch) {
        // Always go back to the public barbershop page
        window.location.href = `/barbearia/${slugMatch[1]}`;
      } else {
        window.location.href = `/barbearia/${barbershopId}`;
      }
    } else if (preselectedBarber) {
      navigate(`/barbeiro/${preselectedBarber.id}`);
      window.location.reload();
    } else {
      navigate('/');
    }
  };
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  // Stagger delay base (0.08s = 80ms)
  const staggerDelay = 0.08;

  return (
    <div className="w-full max-w-md mx-auto text-center">
      {/* 1º - Ícone de check com animação pop elástica */}
      <div 
        className="mb-8"
        style={{
          opacity: 0,
          animation: 'fade-in 0.3s ease-out forwards',
          animationDelay: `${staggerDelay * 0}s`
        }}
      >
        <div 
          className="w-20 h-20 mx-auto bg-success/20 rounded-full flex items-center justify-center mb-6"
          style={{
            transform: 'scale(0)',
            animation: 'pop-elastic 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            animationDelay: `${staggerDelay * 0}s`
          }}
        >
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        
        {/* 2º - Título de sucesso */}
        <div
          style={{
            opacity: 0,
            transform: 'translateY(10px)',
            animation: 'fade-in 0.3s ease-out forwards',
            animationDelay: `${staggerDelay * 1}s`
          }}
        >
          <h1 className="text-2xl font-bold mb-2">Agendamento confirmado!</h1>
          <p className="text-muted-foreground">
            Seu horário foi reservado com sucesso.
          </p>
        </div>
      </div>

      {/* 3º - Card de resumo com mesmo shadow dos cards da agenda */}
      <div 
        className="bg-card rounded-2xl p-6 text-left space-y-4"
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          opacity: 0,
          transform: 'translateY(10px)',
          animation: 'fade-in 0.3s ease-out forwards',
          animationDelay: `${staggerDelay * 2}s`
        }}
      >
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

      {/* 4º - Botões de ação com feedback de clique consistente */}
      <div 
        className="mt-8 space-y-3"
        style={{
          opacity: 0,
          transform: 'translateY(10px)',
          animation: 'fade-in 0.3s ease-out forwards',
          animationDelay: `${staggerDelay * 3}s`
        }}
      >
        <Button 
          onClick={onNewBooking} 
          className="w-full btn-primary-gradient active:scale-[0.98] transition-transform duration-150" 
          size="lg"
        >
          Fazer novo agendamento
        </Button>
        <Button 
          onClick={handleBackToStart} 
          variant="outline"
          className="w-full active:scale-[0.98] transition-transform duration-150" 
          size="lg"
        >
          Voltar ao início
        </Button>
        {whatsappLink && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => window.open(whatsappLink, '_blank')}
          >
            <MessageCircle className="h-4 w-4" />
            Falar com a barbearia
          </Button>
        )}
      </div>
    </div>
  );
}
