import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { supabase, Barber, Service, Appointment } from '@/lib/supabase';
import { StepIndicator } from './StepIndicator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const BarberSelection = lazy(() => import('./BarberSelection').then(m => ({ default: m.BarberSelection })));
const ServiceSelection = lazy(() => import('./ServiceSelection').then(m => ({ default: m.ServiceSelection })));
const DateTimeSelection = lazy(() => import('./DateTimeSelection').then(m => ({ default: m.DateTimeSelection })));
const CustomerInfo = lazy(() => import('./CustomerInfo').then(m => ({ default: m.CustomerInfo })));
const BookingConfirmation = lazy(() => import('./BookingConfirmation').then(m => ({ default: m.BookingConfirmation })));

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

  // Ref mirrors bookingData so async submit handlers always read fresh values,
  // avoiding stale-closure issues where selected dateTime appeared "lost" on first submit.
  const bookingDataRef = useRef(bookingData);
  useEffect(() => { bookingDataRef.current = bookingData; }, [bookingData]);

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

  const handleServiceAutoSelect = (service: Service) => {
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
      // Read from ref to avoid stale closure missing the freshly selected dateTime
      const current = bookingDataRef.current;
      if (!current.barber || !current.service || !current.dateTime) {
        throw new Error('Dados incompletos. Por favor, refaça a seleção.');
      }

      const startTime = current.dateTime;
      const endTime = new Date(startTime.getTime() + current.service.duration_minutes * 60000);

      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', current.barber.id)
        .neq('status', 'cancelled')
        .lt('start_time', endTime.toISOString())
        .gt('end_time', startTime.toISOString());

      if (conflicts && conflicts.length > 0) {
        throw new Error('Este horário não está mais disponível. Por favor, escolha outro horário.');
      }

      const { data: appointment, error: insertError } = await supabase
        .from('appointments')
        .insert({
          barber_id: current.barber.id,
          barbershop_id: current.barber.barbershop_id || barbershopId,
          service_id: current.service.id,
          customer_name: name,
          customer_phone: phone,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'confirmed',
          origin: 'online',
        })
        .select('id, barber_id, barbershop_id, service_id, start_time, end_time, status')
        .single();

      if (insertError) throw insertError;

      // Build the enriched appointment locally from data already known,
      // avoiding an anon SELECT on customer PII columns.
      const enriched: Appointment = {
        ...(appointment as any),
        customer_name: name,
        customer_phone: phone,
        service: current.service,
        barber: current.barber,
      } as Appointment;
      setCreatedAppointment(enriched);
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

  const stepFallback = <Skeleton className="h-48 w-full rounded-xl" />;

  if (step === 'confirmation' && createdAppointment) {
    return (
      <Suspense fallback={stepFallback}>
        <BookingConfirmation
          appointment={createdAppointment}
          onNewBooking={resetBooking}
          barbershopId={barbershopId}
          preselectedBarber={preselectedBarber}
        />
      </Suspense>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-2">
      <StepIndicator currentStep={step} />
      
      <Card className="mt-6 border-border/30 shadow-card-lg rounded-2xl overflow-hidden">
        <CardContent className="p-5 md:p-8">
          {currentStepIndex > 0 && step !== 'confirmation' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="mb-6 -ml-2 transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-95 rounded-xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20">
              {error}
            </div>
          )}

          <Suspense fallback={stepFallback}>
          <div key={step} className="animate-fade-in">
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
                onAutoSelect={handleServiceAutoSelect}
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
          </div>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
