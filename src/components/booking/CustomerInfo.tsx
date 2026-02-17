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
        <h2 className="text-xl font-bold">Seus dados</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Preencha suas informações para confirmar o agendamento
        </p>
      </div>

      {/* Booking Summary */}
      <div className="bg-accent/30 border border-border/30 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
          Resumo do agendamento
        </h3>
        <div className="space-y-2.5">
          {bookingData.barber && (
            <div className="flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium">{bookingData.barber.name}</span>
            </div>
          )}
          {bookingData.service && (
            <div className="flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Scissors className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <span className="font-medium">{bookingData.service.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {bookingData.service.duration_minutes} min · {formatPrice(Number(bookingData.service.price))}
                </span>
              </div>
            </div>
          )}
          {bookingData.dateTime && (
            <div className="flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium capitalize">
                {format(bookingData.dateTime, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="font-semibold text-sm">Nome completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Digite seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`pl-10 h-12 rounded-xl ${errors.name ? 'border-destructive' : ''}`}
              maxLength={100}
            />
          </div>
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="font-semibold text-sm">Telefone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={handlePhoneChange}
              className={`pl-10 h-12 rounded-xl ${errors.phone ? 'border-destructive' : ''}`}
              maxLength={15}
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full btn-primary-gradient h-14 text-base font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Confirmando...
            </>
          ) : (
            'Confirmar Agendamento'
          )}
        </Button>
      </form>
    </div>
  );
}
