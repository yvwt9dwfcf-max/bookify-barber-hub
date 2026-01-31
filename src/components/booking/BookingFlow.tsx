import { useState } from 'react';
import { supabase, Barber, Service, Appointment } from '@/lib/supabase';
import { StepIndicator } from './StepIndicator';
import { BarberSelection } from './BarberSelection';
import { ServiceSelection } from './ServiceSelection';
import { DateTimeSelection } from './DateTimeSelection';
import { CustomerInfo } from './CustomerInfo';
import { BookingConfirmation } from './BookingConfirmation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export type BookingStep = 'barber' | 'service' | 'datetime' | 'info' | 'confirmation';

interface BookingData {
  barber: Barber | null;
  service: Service | null;
  dateTime: Date | null;
  customerName: string;
  customerPhone: string;
}

export interface BookingFlowProps {
  preselectedBarber?: Barber | null;
  barbershopId?: string;
  availableBarbers?: Barber[];
}

export function BookingFlow({ preselectedBarber, barbershopId, availableBarbers }: BookingFlowProps) {
  const initialStep = preselectedBarber ? 'service' : 'barber';
  
  const [step, setStep] = useState<BookingStep>(initialStep);
  const [bookingData, setBookingData] = useState<BookingData>({
    barber: preselectedBarber || null,
    service: null,
    dateTime: null,
    customerName: '',
    customerPhone: '',
  });
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define steps based on whether barber is preselected
  const steps: BookingStep[] = preselectedBarber 
    ? ['service', 'datetime', 'info', 'confirmation']
    : ['barber', 'service', 'datetime', 'info', 'confirmation'];
  const currentStepIndex = steps.indexOf(step);

  const handleBarberSelect = (barber: Barber) => {
    setBookingData(prev => ({ ...prev, barber, service: null }));
    setStep('service');
  };

  const handleServiceSelect = (service: Service) => {
    setBookingData(prev => ({ ...prev, service }));
    setStep('datetime');
  };

  const handleDateTimeSelect = (dateTime: Date) => {
    setBookingData(prev => ({ ...prev, dateTime }));
    setStep('info');
  };

  const handleCustomerInfoSubmit = async (name: string, phone: string) => {
    setBookingData(prev => ({ ...prev, customerName: name, customerPhone: phone }));
    setError(null);
    setIsSubmitting(true);

    try {
      if (!bookingData.barber || !bookingData.service || !bookingData.dateTime) {
        throw new Error('Dados incompletos');
      }

      const startTime = bookingData.dateTime;
      const endTime = new Date(startTime.getTime() + bookingData.service.duration_minutes * 60000);

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', bookingData.barber.id)
        .neq('status', 'cancelled')
        .lt('start_time', endTime.toISOString())
        .gt('end_time', startTime.toISOString());

      if (conflicts && conflicts.length > 0) {
        throw new Error('Este horário não está mais disponível. Por favor, escolha outro horário.');
      }

      const { data: appointment, error: insertError } = await supabase
        .from('appointments')
        .insert({
          barber_id: bookingData.barber.id,
          barbershop_id: bookingData.barber.barbershop_id || barbershopId,
          service_id: bookingData.service.id,
          customer_name: name,
          customer_phone: phone,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'confirmed',
        })
        .select(`
          *,
          service:services(*),
          barber:barbers(*)
        `)
        .single();

      if (insertError) throw insertError;

      setCreatedAppointment(appointment as Appointment);
      setStep('confirmation');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar agendamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const resetBooking = () => {
    setBookingData({
      barber: preselectedBarber || null,
      service: null,
      dateTime: null,
      customerName: '',
      customerPhone: '',
    });
    setCreatedAppointment(null);
    setStep(initialStep);
    setError(null);
  };

  if (step === 'confirmation' && createdAppointment) {
    return (
      <BookingConfirmation
        appointment={createdAppointment}
        onNewBooking={resetBooking}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <StepIndicator currentStep={step} />
      
      <Card className="mt-8 shadow-card-lg">
        <CardContent className="p-6">
          {currentStepIndex > 0 && step !== 'confirmation' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 'barber' && (
            <BarberSelection 
              onSelect={handleBarberSelect} 
              barbershopId={barbershopId}
              availableBarbers={availableBarbers}
            />
          )}

          {step === 'service' && bookingData.barber && (
            <ServiceSelection
              barberId={bookingData.barber.id}
              onSelect={handleServiceSelect}
            />
          )}

          {step === 'datetime' && bookingData.barber && bookingData.service && (
            <DateTimeSelection
              barberId={bookingData.barber.id}
              serviceDuration={bookingData.service.duration_minutes}
              onSelect={handleDateTimeSelect}
            />
          )}

          {step === 'info' && (
            <CustomerInfo
              onSubmit={handleCustomerInfoSubmit}
              isSubmitting={isSubmitting}
              bookingData={bookingData}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
