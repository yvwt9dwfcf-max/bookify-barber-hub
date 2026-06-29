import { useState, useEffect } from 'react';
import { format, addMinutes, setHours, setMinutes, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase, Service, Appointment } from '@/lib/supabase';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { useAvailability } from '@/hooks/useAvailability';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

const appointmentSchema = z.object({
  customer_name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  customer_phone: z.string().trim().max(20, 'Telefone inválido').optional().or(z.literal('')),
  service_id: z.string().min(1, 'Selecione um serviço'),
  barber_id: z.string().min(1, 'Selecione um profissional'),
  start_time: z.string().min(1, 'Horário é obrigatório'),
  notes: z.string().max(500, 'Observações muito longas').optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface EditAppointmentDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isMaster: boolean;
}

const EditAppointmentDialog = ({
  appointment,
  open,
  onOpenChange,
  onSuccess,
  isMaster,
}: EditAppointmentDialogProps) => {
  const { barbers } = useBarbershopBarbers();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');

  // Use the unified availability hook
  const { checkSlotAvailability, refetch: refetchAvailability } = useAvailability({
    barberId: selectedBarberId,
    selectedDate,
  });

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      service_id: '',
      barber_id: '',
      start_time: '',
      notes: '',
    },
  });

  // Reset form when appointment changes
  useEffect(() => {
    if (appointment && open) {
      const appointmentDate = new Date(appointment.start_time);
      setSelectedDate(startOfDay(appointmentDate));
      setSelectedBarberId(appointment.barber_id);
      
      form.reset({
        customer_name: appointment.customer_name,
        customer_phone: appointment.customer_phone || '',
        service_id: appointment.service_id || '',
        barber_id: appointment.barber_id,
        start_time: format(appointmentDate, 'HH:mm'),
        notes: appointment.notes || '',
      });
    }
  }, [appointment, open, form]);

  // Fetch services when barber changes
  useEffect(() => {
    if (selectedBarberId && open) {
      fetchServices(selectedBarberId);
      refetchAvailability();
    }
  }, [selectedBarberId, open, selectedDate]);

  const fetchServices = async (barberId: string) => {
    setLoadingServices(true);
    try {
      const barber = barbers.find(b => b.id === barberId);
      if (!barber?.barbershop_id) {
        setServices([]);
        return;
      }

      // Buscar serviços vinculados ao barbeiro + serviços globais da barbearia
      const [barberServicesRes, globalServicesRes] = await Promise.all([
        supabase
          .from('barber_services')
          .select('service_id')
          .eq('barber_id', barberId),
        supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', barber.barbershop_id)
          .eq('active', true)
          .eq('is_global', true)
          .order('name'),
      ]);

      if (barberServicesRes.error) throw barberServicesRes.error;
      if (globalServicesRes.error) throw globalServicesRes.error;

      const serviceIds = (barberServicesRes.data || []).map(bs => bs.service_id);
      const globalServices = globalServicesRes.data || [];

      if (serviceIds.length === 0) {
        // Sem vínculos específicos — mostrar todos os serviços ativos da barbearia
        const { data: allServices, error: allError } = await supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', barber.barbershop_id)
          .eq('active', true)
          .order('name');

        if (allError) throw allError;
        setServices(allServices || []);
      } else {
        // Buscar serviços vinculados
        const { data: linkedServices, error: linkedError } = await supabase
          .from('services')
          .select('*')
          .in('id', serviceIds)
          .eq('active', true)
          .order('name');

        if (linkedError) throw linkedError;

        // Mesclar globais + vinculados sem duplicatas
        const merged = [...(linkedServices || [])];
        for (const gs of globalServices) {
          if (!merged.some(s => s.id === gs.id)) {
            merged.push(gs);
          }
        }
        merged.sort((a, b) => a.name.localeCompare(b.name));
        setServices(merged);
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoadingServices(false);
    }
  };

  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 6; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const getSlotStatus = (timeSlot: string, durationMinutes: number) => {
    // Permitir o horário atual do agendamento
    if (appointment) {
      const currentTime = format(new Date(appointment.start_time), 'HH:mm');
      const currentDate = startOfDay(new Date(appointment.start_time));
      if (timeSlot === currentTime && selectedDate.getTime() === currentDate.getTime() && selectedBarberId === appointment.barber_id) {
        return { occupied: false, reason: '' };
      }
    }

    const availability = checkSlotAvailability(timeSlot, selectedDate, durationMinutes);
    return {
      occupied: !availability.available,
      reason: availability.reason,
    };
  };

  const onSubmit = async (data: AppointmentFormData) => {
    if (!appointment) return;
    
    setLoading(true);
    try {
      const selectedService = services.find((s) => s.id === data.service_id);

      if (!selectedService) {
        toast.error('Selecione um serviço para continuar');
        setLoading(false);
        return;
      }

      const durationMinutes = selectedService.duration_minutes;

      // Parse the time and combine with selected date
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = addMinutes(startTime, durationMinutes);

      // Check for conflicts before submitting
      const slotCheck = getSlotStatus(data.start_time, durationMinutes);
      if (slotCheck.occupied) {
        const reasonText = slotCheck.reason === 'intervalo' ? 'no intervalo' : slotCheck.reason;
        toast.error(`Horário indisponível (${reasonText}). Escolha outro horário.`);
        setLoading(false);
        return;
      }

      const barber = barbers.find(b => b.id === data.barber_id);

      const { error } = await supabase
        .from('appointments')
        .update({
          barber_id: data.barber_id,
          barbershop_id: barber?.barbershop_id || null,
          service_id: data.service_id,
          customer_name: data.customer_name.trim(),
          customer_phone: data.customer_phone?.trim() || '',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: data.notes?.trim() || null,
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success('Agendamento atualizado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error('Erro ao atualizar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleBarberChange = (barberId: string) => {
    setSelectedBarberId(barberId);
    form.setValue('barber_id', barberId);
    form.setValue('service_id', ''); // Reset service when barber changes
    form.setValue('start_time', ''); // Reset time when barber changes
  };

  const timeSlots = generateTimeSlots();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
          <DialogDescription>
            Altere as informações do agendamento
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do cliente <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Profissional - só mostra se master ou se há mais de um barbeiro */}
            {(isMaster || barbers.length > 1) && (
              <FormField
                control={form.control}
                name="barber_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissional <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={handleBarberChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o profissional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {barbers.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingServices ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : services.length === 0 ? (
                        <div className="text-center py-2 text-sm text-muted-foreground">
                          Nenhum serviço cadastrado
                        </div>
                      ) : (
                        services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - R$ {Number(service.price).toFixed(2)} ({service.duration_minutes}min)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data */}
            <FormItem>
              <FormLabel>Data <span className="text-destructive">*</span></FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione uma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        form.setValue('start_time', ''); // Reset time when date changes
                      }
                    }}
                    locale={ptBR}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </FormItem>

            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => {
                const selectedService = services.find((s) => s.id === form.watch('service_id'));
                const durationMinutes = selectedService?.duration_minutes || 30;

                return (
                  <FormItem>
                    <FormLabel>Horário <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o horário" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        {timeSlots.map((time) => {
                          const slotStatus = getSlotStatus(time, durationMinutes);
                          return (
                            <SelectItem
                              key={time}
                              value={time}
                              disabled={slotStatus.occupied}
                              className={slotStatus.occupied ? 'text-muted-foreground line-through' : ''}
                            >
                              {time} {slotStatus.occupied && `(${slotStatus.reason})`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Alguma observação sobre o agendamento..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !form.watch('service_id')}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentDialog;
