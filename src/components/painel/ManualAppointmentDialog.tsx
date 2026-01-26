import { useState, useEffect } from 'react';
import { format, addMinutes, parse, setHours, setMinutes } from 'date-fns';
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
  customer_phone: z.string().trim().min(1, 'Telefone é obrigatório').max(20, 'Telefone inválido'),
  service_id: z.string().optional(),
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
}

const ManualAppointmentDialog = ({
  open,
  onOpenChange,
  barber,
  selectedDate,
  onSuccess,
}: ManualAppointmentDialogProps) => {
  const [services, setServices] = useState<Service[]>([]);
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
      form.reset();
    }
  }, [open]);

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

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true);
    try {
      const selectedService = services.find((s) => s.id === data.service_id);
      const durationMinutes = selectedService?.duration_minutes || 30;

      // Parse the time and combine with selected date
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = addMinutes(startTime, durationMinutes);

      const { error } = await supabase.from('appointments').insert({
        barber_id: barber.id,
        service_id: data.service_id || null,
        customer_name: data.customer_name.trim(),
        customer_phone: data.customer_phone.trim(),
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
                  <FormLabel>Telefone</FormLabel>
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o horário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
