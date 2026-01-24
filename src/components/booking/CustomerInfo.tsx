import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Loader2, Calendar, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomerInfoProps {
  onSubmit: (name: string, phone: string) => void;
  isSubmitting: boolean;
  bookingData: {
    barber: { name: string } | null;
    service: { name: string; duration_minutes: number; price: number } | null;
    dateTime: Date | null;
  };
}

export function CustomerInfo({ onSubmit, isSubmitting, bookingData }: CustomerInfoProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Seus dados</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Preencha suas informações para confirmar o agendamento
        </p>
      </div>

      {/* Booking Summary */}
      <div className="bg-accent/50 rounded-xl p-4 space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Resumo do agendamento
        </h3>
        <div className="space-y-2">
          {bookingData.barber && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-primary" />
              <span>{bookingData.barber.name}</span>
            </div>
          )}
          {bookingData.service && (
            <div className="flex items-center gap-2 text-sm">
              <Scissors className="h-4 w-4 text-primary" />
              <span>{bookingData.service.name}</span>
              <span className="text-muted-foreground">
                ({bookingData.service.duration_minutes} min - {formatPrice(Number(bookingData.service.price))})
              </span>
            </div>
          )}
          {bookingData.dateTime && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span>
                {format(bookingData.dateTime, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Digite seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
              maxLength={100}
            />
          </div>
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={handlePhoneChange}
              className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
              maxLength={15}
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full btn-primary-gradient"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirmando...
            </>
          ) : (
            'Confirmar agendamento'
          )}
        </Button>
      </form>
    </div>
  );
}
