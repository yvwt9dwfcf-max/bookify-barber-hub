import { useState } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomerInfoProps {
  onSubmit: (name: string, phone: string) => void;
  isSubmitting: boolean;
  bookingData: {
    barber: { name: string; photo_url?: string | null } | null;
    service: { name: string; duration_minutes: number; price: number; photo_url?: string | null } | null;
    dateTime: Date | null;
  };
}

const LINE = 'rgba(242,238,228,0.14)';

export function CustomerInfo({ onSubmit, isSubmitting, bookingData }: CustomerInfoProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const validate = () => {
    const newErrors: { name?: string; phone?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    const phoneNumbers = phone.replace(/\D/g, '');
    if (!phoneNumbers) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (phoneNumbers.length < 10) {
      newErrors.phone = 'Telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(name.trim(), phone);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const fieldStyle = (key: string, hasError?: boolean) => ({
    borderBottom: `1px solid ${hasError ? 'hsl(var(--destructive))' : focused === key ? '#22C55E' : LINE}`,
  });

  return (
    <div className="space-y-8">
      <div>
        <p
          className="font-editorial-mono text-[10px] uppercase tracking-[0.18em] mb-2"
          style={{ color: '#22C55E' }}
        >
          — Seus dados
        </p>
        <h2 className="font-display text-2xl font-semibold">Confirme seus dados</h2>
        <p className="text-sm mt-1" style={{ color: '#8C887C' }}>
          Preencha suas informações para confirmar o agendamento
        </p>
      </div>

      {/* Resumo */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: '#101009', border: `1px solid ${LINE}` }}
      >
        {bookingData.barber && (
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-editorial-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: '#8C887C' }}>
              Profissional
            </span>
            <span className="font-display text-base">{bookingData.barber.name}</span>
          </div>
        )}
        {bookingData.service && (
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-editorial-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: '#8C887C' }}>
              Serviço
            </span>
            <span className="font-display text-base text-right">
              {bookingData.service.name}
              <span className="font-editorial-mono text-xs ml-2" style={{ color: '#22C55E' }}>
                {formatPrice(Number(bookingData.service.price))}
              </span>
            </span>
          </div>
        )}
        {bookingData.dateTime && (
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-editorial-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: '#8C887C' }}>
              Data
            </span>
            <span className="font-display text-base capitalize text-right">
              {format(bookingData.dateTime, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        <div>
          <label
            htmlFor="name"
            className="font-editorial-mono text-[10px] uppercase tracking-[0.18em] block mb-2"
            style={{ color: '#8C887C' }}
          >
            Nome completo
          </label>
          <input
            id="name"
            type="text"
            placeholder="Digite seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
            maxLength={100}
            className="w-full bg-transparent border-0 outline-none py-2 text-base placeholder:text-muted-foreground/60 transition-colors"
            style={fieldStyle('name', !!errors.name)}
          />
          {errors.name && <p className="text-xs text-destructive mt-2">{errors.name}</p>}
        </div>

        <div>
          <label
            htmlFor="phone"
            className="font-editorial-mono text-[10px] uppercase tracking-[0.18em] block mb-2"
            style={{ color: '#8C887C' }}
          >
            WhatsApp
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={handlePhoneChange}
            onFocus={() => setFocused('phone')}
            onBlur={() => setFocused(null)}
            maxLength={15}
            className="w-full bg-transparent border-0 outline-none py-2 text-base placeholder:text-muted-foreground/60 transition-colors"
            style={fieldStyle('phone', !!errors.phone)}
          />
          {errors.phone && <p className="text-xs text-destructive mt-2">{errors.phone}</p>}
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-xl flex items-center justify-center gap-2.5 disabled:opacity-70 active:scale-[0.99] transition-transform"
            style={{
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              color: '#0A0A08',
              boxShadow: '0 8px 24px rgba(34,197,94,0.18)',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-display italic" style={{ fontSize: 15, fontWeight: 600 }}>
                  Confirmando...
                </span>
              </>
            ) : (
              <>
                <MessageCircle className="h-[18px] w-[18px]" />
                <span className="font-display italic" style={{ fontSize: 15, fontWeight: 600 }}>
                  Confirmar agendamento e avisar a barbearia
                </span>
              </>
            )}
          </button>
          <p className="text-center text-xs" style={{ color: '#8C887C' }}>
            Seu horário fica reservado imediatamente ao confirmar — sem precisar de aprovação da barbearia.
          </p>
        </div>
      </form>
    </div>
  );
}
