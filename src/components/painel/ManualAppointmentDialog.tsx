import { useState, useEffect, useCallback } from 'react';
import { format, addMinutes, setHours, setMinutes, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase, Barber, Service } from '@/lib/supabase';
import { useAvailability } from '@/hooks/useAvailability';
import { toast } from 'sonner';
import {
  Loader2, Clock, CalendarDays, UserCircle, Scissors, ChevronDown,
  ChevronLeft, Plus, Search, Check, Trash2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// --- Schema ---
const appointmentSchema = z.object({
  customer_name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  customer_phone: z.string().trim().max(20, 'Telefone inválido').optional().or(z.literal('')),
  service_id: z.string().min(1, 'Selecione um serviço'),
  start_time: z.string().min(1, 'Horário é obrigatório'),
  notes: z.string().max(500, 'Observações muito longas').optional(),
  repeat_weekly: z.boolean().optional(),
});
type AppointmentFormData = z.infer<typeof appointmentSchema>;

type Screen = 'main' | 'service-picker';

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

// --- Service Picker Screen ---
const ServicePickerScreen = ({
  services,
  loading,
  selectedId,
  onSelect,
  onBack,
}: {
  services: Service[];
  loading: boolean;
  selectedId: string;
  onSelect: (service: Service) => void;
  onBack: () => void;
}) => {
  const [search, setSearch] = useState('');
  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/40 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-xl hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-base font-semibold flex-1">Selecionar Serviço</h3>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviço..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
      </div>

      {/* Service List */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {search ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(service => {
              const isSelected = service.id === selectedId;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => onSelect(service)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-150",
                    "border",
                    isSelected
                      ? "bg-primary/10 border-primary/30"
                      : "bg-secondary/50 border-border/30 hover:bg-secondary active:scale-[0.98]"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{service.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {service.duration_minutes} min
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary shrink-0">
                    R$ {Number(service.price).toFixed(2)}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---
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
  const [screen, setScreen] = useState<Screen>('main');
  const [durationOverride, setDurationOverride] = useState<number | null>(null);
  const [showExtras, setShowExtras] = useState(false);

  const [targetBarberId, setTargetBarberId] = useState<string>(barber.id);
  const effectiveBarberId = canCreateForOthers ? targetBarberId : barber.id;
  const targetBarber = (canCreateForOthers ? barbers.find(b => b.id === effectiveBarberId) : barber) || barber;

  const {
    checkSlotAvailability,
    getOpeningHoursForDay,
    refetch: refetchAvailability,
  } = useAvailability({ barberId: targetBarber.id, selectedDate: internalDate });

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
      setScreen('main');
      setDurationOverride(null);
      setShowExtras(false);
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

  useEffect(() => {
    if (open) {
      fetchServices();
      refetchAvailability();
      form.setValue('start_time', preselectedTime || '');
    }
  }, [effectiveBarberId]);

  const isFirstDateRef = useRef(true);
  useEffect(() => {
    if (open) {
      refetchAvailability();
      if (isFirstDateRef.current) {
        isFirstDateRef.current = false;
        return;
      }
      form.setValue('start_time', '');
    } else {
      isFirstDateRef.current = true;
    }
  }, [internalDate, open]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      if (!targetBarber.barbershop_id) { setServices([]); return; }

      const [barberServicesRes, globalServicesRes] = await Promise.all([
        supabase.from('barber_services').select('service_id').eq('barber_id', targetBarber.id),
        supabase.from('services').select('*').eq('barbershop_id', targetBarber.barbershop_id!).eq('active', true).eq('is_global', true).order('name'),
      ]);

      if (barberServicesRes.error) throw barberServicesRes.error;
      if (globalServicesRes.error) throw globalServicesRes.error;

      const serviceIds = (barberServicesRes.data || []).map(bs => bs.service_id);
      const globalServices = (globalServicesRes.data || []) as Service[];

      if (serviceIds.length === 0) {
        const { data: allServices, error } = await supabase
          .from('services').select('*')
          .eq('barbershop_id', targetBarber.barbershop_id!)
          .eq('active', true).order('name');
        if (error) throw error;
        setServices((allServices || []) as Service[]);
      } else {
        const { data: linkedServices, error } = await supabase
          .from('services').select('*')
          .in('id', serviceIds).eq('active', true).order('name');
        if (error) throw error;
        const merged = [...(linkedServices || [])] as Service[];
        for (const gs of globalServices) {
          if (!merged.some(s => s.id === gs.id)) merged.push(gs);
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
    let h = startHour, m = startMin;
    while (h < endHour || (h === endHour && m < endMin)) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      m += 30;
      if (m >= 60) { h++; m -= 60; }
    }
    return slots;
  };

  const getSlotStatus = (timeSlot: string, durationMinutes: number) => {
    const availability = checkSlotAvailability(timeSlot, internalDate, durationMinutes);
    return { occupied: !availability.available, reason: availability.reason };
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) { setInternalDate(date); setCalendarOpen(false); }
  };

  const selectedService = services.find(s => s.id === form.watch('service_id'));
  const effectiveDuration = durationOverride ?? selectedService?.duration_minutes ?? 30;

  const handleServiceSelect = useCallback((service: Service) => {
    form.setValue('service_id', service.id);
    setDurationOverride(null); // reset override when picking new service
    setScreen('main');
  }, [form]);

  const handleRemoveService = useCallback(() => {
    form.setValue('service_id', '');
    setDurationOverride(null);
  }, [form]);

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true);
    try {
      const svc = services.find(s => s.id === data.service_id);
      if (!svc) { toast.error('Selecione um serviço'); setLoading(false); return; }

      const durationMinutes = durationOverride ?? svc.duration_minutes;
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startTime = setMinutes(setHours(internalDate, hours), minutes);
      const endTime = addMinutes(startTime, durationMinutes);

      const slotCheck = getSlotStatus(data.start_time, durationMinutes);
      if (slotCheck.occupied) {
        toast.error(`Horário indisponível (${slotCheck.reason === 'intervalo' ? 'no intervalo' : slotCheck.reason}). Escolha outro horário.`);
        setLoading(false);
        return;
      }

      const weeksToCreate = data.repeat_weekly ? 4 : 1;
      const appointments = [];
      for (let w = 0; w < weeksToCreate; w++) {
        appointments.push({
          barber_id: targetBarber.id,
          barbershop_id: targetBarber.barbershop_id || null,
          service_id: data.service_id || null,
          customer_name: data.customer_name.trim(),
          customer_phone: data.customer_phone?.trim() || '',
          start_time: addDays(startTime, w * 7).toISOString(),
          end_time: addDays(endTime, w * 7).toISOString(),
          notes: data.notes?.trim() || null,
          status: 'confirmed',
        });
      }

      const { error } = await supabase.from('appointments').insert(appointments);
      if (error) throw error;

      toast.success(weeksToCreate > 1 ? `${weeksToCreate} agendamentos criados!` : 'Agendamento criado!');
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
  const dayHours = getOpeningHoursForDay(internalDate.getDay());

  const durationOptions = [15, 20, 30, 45, 60, 90, 120];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden [&>div]:min-h-0">
        <DialogDescription className="sr-only">Criar novo agendamento manual</DialogDescription>

        {/* ===== SERVICE PICKER SCREEN ===== */}
        {screen === 'service-picker' && (
          <ServicePickerScreen
            services={services}
            loading={loadingServices}
            selectedId={form.watch('service_id')}
            onSelect={handleServiceSelect}
            onBack={() => setScreen('main')}
          />
        )}

        {/* ===== MAIN FORM SCREEN ===== */}
        {screen === 'main' && (
          <div className="flex flex-col h-full animate-in fade-in duration-150">
            <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/30">
              <DialogTitle className="text-base font-semibold">Novo Agendamento</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 space-y-4 min-h-0">
              {/* Context Banner — Date + Barber */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 p-3 rounded-2xl bg-secondary/60 border border-border/30 hover:bg-secondary transition-colors cursor-pointer text-left"
                  >
                    <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                    <span className="capitalize text-sm flex-1">
                      {format(internalDate, "EEEE, dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={internalDate}
                    onSelect={handleDateSelect}
                    disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {!dayHours && (
                <p className="text-xs text-destructive text-center py-2">
                  O barbeiro não atende neste dia da semana.
                </p>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Barber */}
                  {canCreateForOthers && barbers.length > 1 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Profissional</label>
                      <Select value={targetBarberId} onValueChange={setTargetBarberId}>
                        <SelectTrigger className="h-11 text-sm rounded-2xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {barbers.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} {b.id === barber.id ? '(você)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Customer Name */}
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs text-muted-foreground">Cliente</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nome do cliente"
                            className="h-11 text-sm rounded-2xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* SERVICE — card-style picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Serviço <span className="text-destructive">*</span>
                    </label>

                    {selectedService ? (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/60 border border-border/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedService.name}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {Number(selectedService.price).toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setScreen('service-picker')}
                          className="text-xs text-primary font-medium px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                          Trocar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveService}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive/70"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setScreen('service-picker')}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar serviço
                      </button>
                    )}

                    {/* Hidden field for form validation */}
                    <FormField
                      control={form.control}
                      name="service_id"
                      render={() => (
                        <FormItem className="space-y-0">
                          <FormControl><input type="hidden" value={form.watch('service_id')} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Duration override — only shows when a service is selected */}
                  {selectedService && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Duração
                        <span className="text-[10px] ml-1 text-muted-foreground/60">(só para este atendimento)</span>
                      </label>
                      <Select
                        value={String(effectiveDuration)}
                        onValueChange={v => {
                          const val = Number(v);
                          setDurationOverride(val === selectedService.duration_minutes ? null : val);
                        }}
                      >
                        <SelectTrigger className="h-11 text-sm rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {durationOptions.map(d => (
                            <SelectItem key={d} value={String(d)}>
                              {d} min {d === selectedService.duration_minutes ? '(padrão)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Horário */}
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs text-muted-foreground">Horário</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 text-sm rounded-2xl">
                              <SelectValue placeholder={timeSlots.length === 0 ? 'Sem horários' : 'Selecione o horário'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {timeSlots.length === 0 ? (
                              <div className="text-center py-2 text-sm text-muted-foreground">Sem horários</div>
                            ) : (
                              timeSlots.map(time => {
                                const status = getSlotStatus(time, effectiveDuration);
                                return (
                                  <SelectItem
                                    key={time}
                                    value={time}
                                    disabled={status.occupied}
                                    className={status.occupied ? 'text-muted-foreground line-through' : ''}
                                  >
                                    {time} {status.occupied && `(${status.reason})`}
                                  </SelectItem>
                                );
                              })
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Collapsible extras */}
                  <button
                    type="button"
                    onClick={() => setShowExtras(prev => !prev)}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
                  >
                    {showExtras ? 'Ocultar campos extras' : 'Mais campos (Observação, repetição...)'}
                  </button>

                  {showExtras && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Phone */}
                      <FormField
                        control={form.control}
                        name="customer_phone"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs text-muted-foreground">Telefone (opcional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="(11) 99999-9999"
                                className="h-11 text-sm rounded-2xl"
                                {...field}
                                onChange={e => {
                                  let v = e.target.value.replace(/\D/g, '');
                                  if (v.length > 11) v = v.slice(0, 11);
                                  if (v.length > 7) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
                                  else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                                  else if (v.length > 0) v = `(${v}`;
                                  field.onChange(v);
                                }}
                                maxLength={16}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Notes */}
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs text-muted-foreground">Observação (opcional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Alguma observação..."
                                className="resize-none min-h-[60px] text-sm rounded-2xl"
                                rows={2}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Repeat weekly */}
                      <FormField
                        control={form.control}
                        name="repeat_weekly"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-2xl border border-border/30 p-3">
                            <div>
                              <FormLabel className="text-xs font-medium">Repetir toda semana</FormLabel>
                              <p className="text-[10px] text-muted-foreground">Cria 4 agendamentos (1/semana)</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Submit */}
                  <div className="pt-2 sticky bottom-0 bg-background pb-1">
                    <Button
                      type="submit"
                      className="w-full h-12 text-sm font-semibold rounded-2xl"
                      disabled={loading || !form.watch('service_id') || !dayHours}
                    >
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManualAppointmentDialog;
