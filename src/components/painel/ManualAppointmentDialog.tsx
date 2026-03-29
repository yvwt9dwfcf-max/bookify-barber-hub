import { useState, useEffect } from 'react';
import { format, addMinutes, setHours, setMinutes, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase, Barber, Service } from '@/lib/supabase';
import { useAvailability } from '@/hooks/useAvailability';
import { toast } from 'sonner';
import { Loader2, Timer as Clock, CalendarDays as Calendar, UserCircle, Sparkles as Scissors, ChevronDown } from 'lucide-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const appointmentSchema = z.object({
  customer_name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  customer_phone: z.string().trim().max(20, 'Telefone inválido').optional().or(z.literal('')),
  service_id: z.string().min(1, 'Selecione um serviço'),
  start_time: z.string().min(1, 'Horário é obrigatório'),
  notes: z.string().max(500, 'Observações muito longas').optional(),
  repeat_weekly: z.boolean().optional(),
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
  selectedDate: initialDate,
  onSuccess,
  canCreateForOthers = false,
  barbers = [],
  preselectedTime = null,
}: ManualAppointmentDialogProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [internalDate, setInternalDate] = useState<Date>(initialDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const [targetBarberId, setTargetBarberId] = useState<string>(barber.id);
  const effectiveBarberId = canCreateForOthers ? targetBarberId : barber.id;
  const targetBarber = (canCreateForOthers ? barbers.find(b => b.id === effectiveBarberId) : barber) || barber;

  const { 
    checkSlotAvailability, 
    getOpeningHoursForDay,
    refetch: refetchAvailability 
  } = useAvailability({ 
    barberId: targetBarber.id, 
    selectedDate: internalDate 
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

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setTargetBarberId(barber.id);
      setInternalDate(initialDate);
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
  }, [open, initialDate, preselectedTime]);

  // Refetch when effective target barber changes
  useEffect(() => {
    if (open) {
      fetchServices();
      refetchAvailability();
      form.setValue('start_time', preselectedTime || '');
    }
  }, [effectiveBarberId]);

  // When internal date changes, clear time and refetch
  useEffect(() => {
    if (open) {
      refetchAvailability();
      // Only clear time if the date actually changed from initial
      form.setValue('start_time', '');
    }
  }, [internalDate]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      if (!targetBarber.barbershop_id) {
        setServices([]);
        return;
      }

      // Fetch barber-specific links and global services in parallel
      const [barberServicesRes, globalServicesRes] = await Promise.all([
        supabase
          .from('barber_services')
          .select('service_id')
          .eq('barber_id', targetBarber.id),
        supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', targetBarber.barbershop_id!)
          .eq('active', true)
          .eq('is_global', true)
          .order('name'),
      ]);

      if (barberServicesRes.error) throw barberServicesRes.error;
      if (globalServicesRes.error) throw globalServicesRes.error;

      const serviceIds = (barberServicesRes.data || []).map(bs => bs.service_id);
      const globalServices = (globalServicesRes.data || []) as Service[];

      if (serviceIds.length === 0) {
        // No specific links — show ALL active services for the barbershop
        const { data: allServices, error: allError } = await supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', targetBarber.barbershop_id!)
          .eq('active', true)
          .order('name');

        if (allError) throw allError;
        setServices((allServices || []) as Service[]);
      } else {
        // Fetch linked services
        const { data: linkedServices, error: linkedError } = await supabase
          .from('services')
          .select('*')
          .in('id', serviceIds)
          .eq('active', true)
          .order('name');

        if (linkedError) throw linkedError;

        // Merge linked + global without duplicates
        const merged = [...(linkedServices || [])] as Service[];
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
    const dayOfWeek = internalDate.getDay();
    const dayHours = getOpeningHoursForDay(dayOfWeek);
    
    if (!dayHours) return [];

    const [startHour, startMin] = dayHours.start_time.split(':').map(Number);
    const [endHour, endMin] = dayHours.end_time.split(':').map(Number);

    const slots: string[] = [];
    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const time = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push(time);
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentHour += 1;
        currentMin -= 60;
      }
    }
    
    return slots;
  };

  const getSlotStatus = (timeSlot: string, durationMinutes: number) => {
    const availability = checkSlotAvailability(timeSlot, internalDate, durationMinutes);
    return {
      occupied: !availability.available,
      reason: availability.reason,
    };
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setInternalDate(date);
      setCalendarOpen(false);
    }
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
      const startTime = setMinutes(setHours(internalDate, hours), minutes);
      const endTime = addMinutes(startTime, durationMinutes);

      const slotCheck = getSlotStatus(data.start_time, durationMinutes);
      if (slotCheck.occupied) {
        const reasonText = slotCheck.reason === 'intervalo' ? 'no intervalo' : slotCheck.reason;
        toast.error(`Horário indisponível (${reasonText}). Escolha outro horário.`);
        setLoading(false);
        return;
      }

      const weeksToCreate = data.repeat_weekly ? 4 : 1;
      const appointments = [];

      for (let w = 0; w < weeksToCreate; w++) {
        const weekStart = addDays(startTime, w * 7);
        const weekEnd = addDays(endTime, w * 7);
        appointments.push({
          barber_id: targetBarber.id,
          barbershop_id: targetBarber.barbershop_id || null,
          service_id: data.service_id || null,
          customer_name: data.customer_name.trim(),
          customer_phone: data.customer_phone?.trim() || '',
          start_time: weekStart.toISOString(),
          end_time: weekEnd.toISOString(),
          notes: data.notes?.trim() || null,
          status: 'confirmed',
        });
      }

      const { error } = await supabase.from('appointments').insert(appointments);

      if (error) throw error;

      toast.success(weeksToCreate > 1 ? `${weeksToCreate} agendamentos criados com sucesso!` : 'Agendamento criado com sucesso!');
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
  const dayHours = getOpeningHoursForDay(internalDate.getDay());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">Novo Agendamento</DialogTitle>
          <DialogDescription className="sr-only">
            Criar novo agendamento manual
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {/* Context Banner */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <UserCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium truncate">{targetBarber.name}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                  <Calendar className="h-3 w-3" />
                  <span className="capitalize text-[11px]">
                    {format(internalDate, "EEE, d MMM", { locale: ptBR })}
                  </span>
                </div>
                {form.watch('start_time') && (
                  <div className="flex items-center gap-1 text-primary font-semibold shrink-0">
                    <Clock className="h-3 w-3" />
                    <span className="text-[11px]">{form.watch('start_time')}</span>
                  </div>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarComponent
                mode="single"
                selected={internalDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {!dayHours && (
            <p className="text-xs text-destructive text-center">
              O barbeiro não atende neste dia da semana.
            </p>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {/* Barber selector */}
              {canCreateForOthers && barbers.length > 1 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Profissional</label>
                  <Select
                    value={targetBarberId}
                    onValueChange={setTargetBarberId}
                  >
                    <SelectTrigger className="h-9 text-sm">
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Nome do cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" className="h-9 text-sm" {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Telefone (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(11) 99999-9999"
                        className="h-9 text-sm"
                        {...field}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 11) value = value.slice(0, 11);
                          if (value.length > 7) {
                            value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                          } else if (value.length > 2) {
                            value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                          } else if (value.length > 0) {
                            value = `(${value}`;
                          }
                          field.onChange(value);
                        }}
                        maxLength={16}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Serviço <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
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
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Scissors className="h-2.5 w-2.5" />
                        <span>{selectedService.duration_minutes}min • R$ {Number(selectedService.price).toFixed(2)}</span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time slot */}
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => {
                  const durationMinutes = selectedService?.duration_minutes || 30;
                  
                  return (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Horário</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder={timeSlots.length === 0 ? "Sem horários" : "Selecione o horário"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {timeSlots.length === 0 ? (
                            <div className="text-center py-2 text-sm text-muted-foreground">
                              Nenhum horário disponível
                            </div>
                          ) : (
                            timeSlots.map((time) => {
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
                            })
                          )}
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Alguma observação..."
                        className="resize-none min-h-[60px] text-sm"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Repeat weekly toggle */}
              <FormField
                control={form.control}
                name="repeat_weekly"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-2.5">
                    <div>
                      <FormLabel className="text-xs font-medium">Repetir toda semana</FormLabel>
                      <p className="text-[10px] text-muted-foreground">Cria 4 agendamentos (1 por semana)</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-background pb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={loading || !form.watch('service_id') || !dayHours}>
                  {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Confirmar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualAppointmentDialog;
