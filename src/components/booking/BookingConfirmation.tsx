import { useState, useEffect, useRef } from 'react';
import { CircleCheck as CheckCircle, MessageCircle } from 'lucide-react';
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

const LINE = 'rgba(242,238,228,0.14)';

export function BookingConfirmation({ appointment, onNewBooking, barbershopId, preselectedBarber }: BookingConfirmationProps) {
  const navigate = useNavigate();
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const autoOpened = useRef(false);

  const start = new Date(appointment.start_time);
  const dateLabel = format(start, "EEEE, d 'de' MMMM", { locale: ptBR });
  const timeLabel = format(start, 'HH:mm');

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
        .select('phone, name')
        .eq('id', barbershopId)
        .maybeSingle();

      const number = profile?.whatsapp_numero || shop?.phone;
      if (!number) return;

      const shopName = shop?.name || 'barbearia';
      const message =
        `Olá! Acabei de agendar ${appointment.service?.name || 'um serviço'} com ` +
        `${appointment.barber?.name || 'o profissional'} para ${dateLabel} às ${timeLabel} na ${shopName}. ` +
        `Confirmado automaticamente pelo Bookify. ✅`;

      const link = `https://wa.me/55${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      setWhatsappLink(link);

      // O agendamento já está confirmado no sistema; o WhatsApp é só o aviso automático.
      if (!autoOpened.current) {
        autoOpened.current = true;
        window.open(link, '_blank');
      }
    };
    fetchWhatsapp();
  }, [barbershopId]);

  const handleBackToStart = () => {
    if (barbershopId) {
      const currentPath = window.location.pathname;
      const slugMatch = currentPath.match(/^\/(?:agendar|barbearia|b)\/([^/?]+)/);
      if (slugMatch) {
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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-editorial-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: '#8C887C' }}>
        {label}
      </span>
      <span className="font-display text-base text-right capitalize">{value}</span>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-5"
          style={{ border: '1px solid #22C55E', background: 'rgba(34,197,94,0.06)' }}
        >
          <CheckCircle className="h-6 w-6" style={{ color: '#22C55E' }} />
        </div>
        <p className="font-editorial-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: '#22C55E' }}>
          — Confirmado
        </p>
        <h1 className="font-display text-2xl font-semibold mt-2">Agendamento confirmado</h1>
      </div>

      <div
        className="p-5 space-y-3.5"
        style={{ background: '#101009', border: `1px solid ${LINE}`, borderRadius: 16 }}
      >
        <Row label="Profissional" value={appointment.barber?.name || 'Barbeiro'} />
        <Row label="Serviço" value={appointment.service?.name || 'Serviço'} />
        <Row label="Data" value={dateLabel} />
        <Row label="Horário" value={timeLabel} />

        {appointment.service && (
          <div className="flex items-baseline justify-between gap-4 pt-3.5" style={{ borderTop: `1px solid ${LINE}` }}>
            <span className="font-editorial-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: '#8C887C' }}>
              Total
            </span>
            <span className="font-editorial-mono text-xl font-medium" style={{ color: '#22C55E' }}>
              {formatPrice(Number(appointment.service.price))}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs mt-4 text-center" style={{ color: '#8C887C' }}>
        Seu horário fica reservado imediatamente ao confirmar — sem precisar de aprovação da barbearia.
      </p>

      <div className="mt-7 space-y-3">
        {whatsappLink && (
          <>
            <button
              onClick={() => window.open(whatsappLink, '_blank')}
              className="btn-primary-solid w-full h-14 flex items-center justify-center gap-2.5 active:scale-[0.99] transition-transform"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
              <span>
                Avisar a barbearia no WhatsApp
              </span>
            </button>
            <p className="text-center text-xs" style={{ color: '#8C887C' }}>
              Você será direcionado ao WhatsApp da barbearia com os dados já preenchidos
            </p>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleBackToStart}
            className="flex-1 h-12 rounded-xl font-editorial-mono text-[11px] uppercase tracking-[0.16em] transition-colors"
            style={{ border: `1px solid ${LINE}`, color: '#8C887C' }}
          >
            Voltar ao início
          </button>
          <button
            onClick={onNewBooking}
            className="flex-1 h-12 rounded-xl font-editorial-mono text-[11px] uppercase tracking-[0.16em] transition-colors"
            style={{ border: `1px solid ${LINE}` }}
          >
            Novo agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
