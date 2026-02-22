import { useState, useEffect } from 'react';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase, Barber, Service } from '@/lib/supabase';
import { useAvailability } from '@/hooks/useAvailability';
import { toast } from 'sonner';
import { Loader2, Clock, Calendar, UserCircle, Scissors } from 'lucide-react';
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
  preselectedTime?: string | null;
}

const ManualAppointmentDialog = ({
  open,
  onOpenChange,
  barber,
  selectedDate,
  onSuccess,
  canCreateForOthers = false,
  barbers = [],
  preselectedTime = null,
}: ManualAppointmentDialogProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  
  const [targetBarberId, setTargetBarberId] = useState<string>(barber.id);
  const effectiveBarberId = canCreateForOthers ? targetBarberId : barber.id;
  const targetBarber = (canCreateForOthers ? barbers.find(b => b.id === effectiveBarberId) : barber) || barber;

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
      start_time: preselectedTime || '',
      notes: '',
    },
  });

  // Reset target barber when dialog opens
  useEffect(() => {
    if (open) {
      setTargetBarberId(barber.id);
      fetchServices();
      refetchAvailability();
      form.reset({
        customer_name: '',
        customer_phone: '',
        service_id: '',
        start_time: preselectedTime || '',
        notes: '',
      });
    }
  }, [open, selectedDate, preselectedTime]);

  // Refetch when effective target barber changes
  useEffect(() => {
    if (open) {
      fetchServices();
      refetchAvailability();
      form.setValue('start_time', preselectedTime || '');
    }
  }, [effectiveBarberId]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      if (!targetBarber.barbershop_id) {
        setServices([]);
        return;
      }

      // 1. Fetch global services
      const { data: globalServices, error: globalError } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', targetBarber.barbershop_id!)
        .eq('active', true)
        .eq('is_global', true)
        .order('name');

      if (globalError) throw globalError;

      // 2. Fetch specific services linked to this barber
      const { data: barberServicesData, error: bsError } = await supabase
        .from('barber_services')
        .select('service_id')
        .eq('barber_id', targetBarber.id);

      if (bsError) throw bsError;

      const specificIds = (barberServicesData || []).map(bs => bs.service_id);
      let specificServices: Service[] = [];

      if (specificIds.length > 0) {
        const { data: linked, error: linkedError } = await supabase
          .from('services')
          .select('*')
          .in('id', specificIds)
          .eq('active', true)
          .eq('is_global', false)
          .order('name');

        if (linkedError) throw linkedError;
        specificServices = (linked || []) as Service[];
      }

      // Merge and deduplicate
      const all = [...(globalServices || []), ...specificServices] as Service[];
      const unique = all.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
      setServices(unique);
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
      
      if (!selectedService) {
        toast.error('Selecione um serviço para continuar');
        setLoading(false);
        return;
      }
      
      const durationMinutes = selectedService.duration_minutes;

      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = addMinutes(startTime, durationMinutes);

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
  const selectedService = services.find((s) => s.id === form.watch('service_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Novo Agendamento</DialogTitle>
          <DialogDescription className="sr-only">
            Criar novo agendamento manual
          </DialogDescription>
        </DialogHeader>

        {/* Context Banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <UserCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{targetBarber.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            <span className="capitalize text-xs">
              {format(selectedDate, "EEE, d MMM", { locale: ptBR })}
            </span>
          </div>
          {(preselectedTime || form.watch('start_time')) && (
            <div className="flex items-center gap-1.5 text-sm text-primary font-semibold shrink-0">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">{preselectedTime || form.watch('start_time')}</span>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Barber selector */}
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
                    <Input placeholder="João Silva" {...field} autoFocus />
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
                  {selectedService && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Scissors className="h-3 w-3" />
                      <span>{selectedService.duration_minutes} minutos • R$ {Number(selectedService.price).toFixed(2)}</span>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time slot - hidden if preselected, otherwise show select */}
            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => {
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
                Confirmar Agendamento
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualAppointmentDialog;
