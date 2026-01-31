import { useState, useEffect } from 'react';
import { format, addMinutes, setHours, setMinutes, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase, Barber, Service } from '@/lib/supabase';
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
  service_id: z.string().optional(),
  start_time: z.string().min(1, 'Horário é obrigatório'),
  notes: z.string().max(500, 'Observações muito longas').optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface ManualAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: Barber;
  selectedDate: Date;
  onSuccess: () => void;
}

const ManualAppointmentDialog = ({
  open,
  onOpenChange,
  barber,
  selectedDate,
  onSuccess,
}: ManualAppointmentDialogProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);

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

  useEffect(() => {
    if (open) {
      fetchServices();
      fetchExistingAppointments();
      form.reset();
    }
  }, [open, selectedDate]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barber.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchExistingAppointments = async () => {
    try {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, status')
        .eq('barber_id', barber.id)
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd)
        .in('status', ['confirmed', 'completed']);

      if (error) throw error;
      setExistingAppointments(data || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos existentes:', error);
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

  const isTimeSlotOccupied = (timeSlot: string, durationMinutes: number): boolean => {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotStart = setMinutes(setHours(selectedDate, hours), minutes);
    const slotEnd = addMinutes(slotStart, durationMinutes);

    return existingAppointments.some((apt) => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      // Check for overlap: new slot starts before existing ends AND new slot ends after existing starts
      return slotStart < aptEnd && slotEnd > aptStart;
    });
  };

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true);
    try {
      const selectedService = services.find((s) => s.id === data.service_id);
      const durationMinutes = selectedService?.duration_minutes || 30;

      // Parse the time and combine with selected date
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = addMinutes(startTime, durationMinutes);

      // Check for conflicts before submitting
      if (isTimeSlotOccupied(data.start_time, durationMinutes)) {
        toast.error('Este horário já está ocupado. Escolha outro horário.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('appointments').insert({
        barber_id: barber.id,
        barbershop_id: barber.barbershop_id || null,
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
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>Serviço (opcional)</FormLabel>
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
                          const isOccupied = isTimeSlotOccupied(time, durationMinutes);
                          return (
                            <SelectItem 
                              key={time} 
                              value={time} 
                              disabled={isOccupied}
                              className={isOccupied ? 'text-muted-foreground line-through' : ''}
                            >
                              {time} {isOccupied && '(ocupado)'}
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
              <Button type="submit" disabled={loading}>
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
