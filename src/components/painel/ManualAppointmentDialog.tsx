import { useState, useEffect } from 'react';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase, Barber, Service } from '@/lib/supabase';
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

const appointmentSchema = z.object({
  customer_name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  customer_phone: z.string().trim().max(20, 'Telefone inválido').optional().or(z.literal('')),
  service_id: z.string().min(1, 'Selecione um serviço'),
  start_time: z.string().min(1, 'Horário é obrigatório'),
  notes: z.string().max(500, 'Observações muito longas').optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface ManualAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: Barber;
  selectedDate: Date;
  onSuccess: () => void;
  canCreateForOthers?: boolean;
  barbers?: Barber[];
}

const ManualAppointmentDialog = ({
  open,
  onOpenChange,
  barber,
  selectedDate,
  onSuccess,
  canCreateForOthers = false,
  barbers = [],
}: ManualAppointmentDialogProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  
  // Selected barber for appointment (can be different from current barber if has permission)
  const [targetBarberId, setTargetBarberId] = useState<string>(barber.id);
  const targetBarber = (canCreateForOthers ? barbers.find(b => b.id === targetBarberId) : barber) || barber;

  // Use the unified availability hook
  const { 
    checkSlotAvailability, 
    refetch: refetchAvailability 
  } = useAvailability({ 
    barberId: targetBarber.id, 
    selectedDate 
  });

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      service_id: '',
      start_time: '',
      notes: '',
    },
  });

  // Reset target barber when dialog opens
  useEffect(() => {
    if (open) {
      setTargetBarberId(barber.id);
      fetchServices();
      refetchAvailability();
      form.reset();
    }
  }, [open, selectedDate]);

  // Refetch when target barber changes
  useEffect(() => {
    if (open) {
      fetchServices();
      refetchAvailability();
      form.setValue('start_time', '');
    }
  }, [targetBarberId]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      if (!targetBarber.barbershop_id) {
        setServices([]);
        return;
      }

      // Buscar serviços vinculados ao barbeiro alvo
      const { data: barberServicesData, error: bsError } = await supabase
        .from('barber_services')
        .select('service_id')
        .eq('barber_id', targetBarber.id);

      if (bsError) throw bsError;

      const serviceIds = (barberServicesData || []).map(bs => bs.service_id);

      if (serviceIds.length === 0) {
        // Se não há vínculos, buscar todos os serviços da barbearia
        const { data: allServices, error: allError } = await supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', targetBarber.barbershop_id!)
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
        setServices(linkedServices || []);
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
    const availability = checkSlotAvailability(timeSlot, selectedDate, durationMinutes);
    return {
      occupied: !availability.available,
      reason: availability.reason,
    };
  };

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true);
    try {
      const selectedService = services.find((s) => s.id === data.service_id);
      
      // Serviço é obrigatório - garantir duração correta
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

      // Check for conflicts before submitting using unified availability check
      const slotCheck = getSlotStatus(data.start_time, durationMinutes);
      if (slotCheck.occupied) {
        const reasonText = slotCheck.reason === 'intervalo' ? 'no intervalo' : slotCheck.reason;
        toast.error(`Horário indisponível (${reasonText}). Escolha outro horário.`);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('appointments').insert({
        barber_id: targetBarber.id,
        barbershop_id: targetBarber.barbershop_id || null,
        service_id: data.service_id || null,
        customer_name: data.customer_name.trim(),
        customer_phone: data.customer_phone?.trim() || '',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: data.notes?.trim() || null,
        status: 'confirmed',
      });

      if (error) throw error;

      toast.success('Agendamento criado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao criar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = generateTimeSlots();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <DialogDescription>
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} - {targetBarber.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Barber selector - only when user can create for others */}
            {canCreateForOthers && barbers.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Profissional</label>
                <Select
                  value={targetBarberId}
                  onValueChange={setTargetBarberId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.id === barber.id ? '(você)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do cliente</FormLabel>
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

            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => {
                const selectedService = services.find((s) => s.id === form.watch('service_id'));
                const durationMinutes = selectedService?.duration_minutes || 30;
                
                return (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
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
                Criar Agendamento
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualAppointmentDialog;
