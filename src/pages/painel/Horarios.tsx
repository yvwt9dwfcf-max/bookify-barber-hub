import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, Barber, DAY_NAMES } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { TimeInput } from '@/components/ui/TimeInput';
import { Timer as Clock, Check, Loader2, CircleAlert } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContextType {
  barber: Barber | null;
  barbershop: { id: string } | null;
  isMaster: boolean;
}

interface DayHours {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
  break_start: string | null;
  break_end: string | null;
  id?: string;
}

const defaultHours: DayHours[] = [
  { day_of_week: 0, start_time: '09:00', end_time: '18:00', is_open: false, break_start: null, break_end: null },
  { day_of_week: 1, start_time: '09:00', end_time: '18:00', is_open: true, break_start: null, break_end: null },
  { day_of_week: 2, start_time: '09:00', end_time: '18:00', is_open: true, break_start: null, break_end: null },
  { day_of_week: 3, start_time: '09:00', end_time: '18:00', is_open: true, break_start: null, break_end: null },
  { day_of_week: 4, start_time: '09:00', end_time: '18:00', is_open: true, break_start: null, break_end: null },
  { day_of_week: 5, start_time: '09:00', end_time: '18:00', is_open: true, break_start: null, break_end: null },
  { day_of_week: 6, start_time: '09:00', end_time: '14:00', is_open: true, break_start: null, break_end: null },
];

type DayStatus = 'idle' | 'saving' | 'saved' | 'error';

const Horarios = () => {
  const { barber, barbershop } = useOutletContext<ContextType>();
  const [hours, setHours] = useState<DayHours[]>(defaultHours);
  const [loading, setLoading] = useState(true);
  const [serverClosingTime, setServerClosingTime] = useState<string>('');
  const [dayStatus, setDayStatus] = useState<Record<number, DayStatus>>({});
  const debounceRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (barber) fetchHours();
  }, [barber]);

  useEffect(() => {
    if (barbershop?.id) fetchClosingTime();
  }, [barbershop]);

  const fetchClosingTime = async () => {
    if (!barbershop?.id) return;
    const { data } = await supabase
      .from('barbershops')
      .select('closing_time')
      .eq('id', barbershop.id)
      .maybeSingle();
    setServerClosingTime((data as any)?.closing_time || '');
  };

  const saveClosingTime = useCallback(async (val: string) => {
    if (!barbershop?.id) return;
    const { error } = await supabase
      .from('barbershops')
      .update({ closing_time: val || null } as any)
      .eq('id', barbershop.id);
    if (error) throw error;
  }, [barbershop?.id]);

  const closingTimeAutoSave = useAutoSave({
    serverValue: serverClosingTime,
    onSave: saveClosingTime,
    debounceMs: 1500,
  });

  const fetchHours = async () => {
    if (!barber) return;
    try {
      const { data, error } = await supabase
        .from('opening_hours')
        .select('*')
        .eq('barber_id', barber.id);
      if (error) throw error;

      if (data && data.length > 0) {
        const merged = defaultHours.map((d) => {
          const saved = data.find((x) => x.day_of_week === d.day_of_week);
          if (!saved) return d;
          return {
            ...d,
            start_time: saved.start_time.slice(0, 5),
            end_time: saved.end_time.slice(0, 5),
            is_open: saved.is_open,
            break_start: saved.break_start ? saved.break_start.slice(0, 5) : null,
            break_end: saved.break_end ? saved.break_end.slice(0, 5) : null,
            id: saved.id,
          };
        });
        setHours(merged);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar horários');
    } finally {
      setLoading(false);
    }
  };

  const persistDay = useCallback(async (day: DayHours) => {
    if (!barber) return;
    setDayStatus((s) => ({ ...s, [day.day_of_week]: 'saving' }));

    const payload = {
      barber_id: barber.id,
      barbershop_id: barber.barbershop_id || null,
      day_of_week: day.day_of_week,
      start_time: day.start_time,
      end_time: day.end_time,
      is_open: day.is_open,
      break_start: day.break_start || null,
      break_end: day.break_end || null,
    };

    try {
      if (day.id) {
        const { error } = await supabase
          .from('opening_hours')
          .update(payload)
          .eq('id', day.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('opening_hours')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        if (data?.id) {
          setHours((prev) =>
            prev.map((h) => (h.day_of_week === day.day_of_week ? { ...h, id: data.id } : h))
          );
        }
      }
      setDayStatus((s) => ({ ...s, [day.day_of_week]: 'saved' }));
      setTimeout(() => setDayStatus((s) => ({ ...s, [day.day_of_week]: 'idle' })), 1500);
    } catch (e) {
      console.error(e);
      setDayStatus((s) => ({ ...s, [day.day_of_week]: 'error' }));
      toast.error('Erro ao salvar horário');
    }
  }, [barber]);

  const scheduleSave = useCallback((dayOfWeek: number, updated: DayHours) => {
    if (debounceRefs.current[dayOfWeek]) {
      clearTimeout(debounceRefs.current[dayOfWeek]);
    }
    debounceRefs.current[dayOfWeek] = setTimeout(() => {
      persistDay(updated);
    }, 700);
  }, [persistDay]);

  const updateHour = (dayOfWeek: number, field: keyof DayHours, value: string | boolean | null, immediate = false) => {
    setHours((prev) => {
      const next = prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      );
      const updated = next.find((h) => h.day_of_week === dayOfWeek)!;
      if (immediate) {
        if (debounceRefs.current[dayOfWeek]) clearTimeout(debounceRefs.current[dayOfWeek]);
        persistDay(updated);
      } else {
        scheduleSave(dayOfWeek, updated);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-page-enter">
        <PremiumSkeleton className="h-7 w-48" />
        <div className="rounded-xl border border-border/30 bg-card/60 p-3 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <PremiumSkeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const StatusBadge = ({ status }: { status: DayStatus }) => {
    if (status === 'saving') return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    if (status === 'saved') return <Check className="h-3 w-3 text-emerald-500" />;
    if (status === 'error') return <CircleAlert className="h-3 w-3 text-destructive" />;
    return <span className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4 animate-page-enter pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Horários</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Alterações são salvas automaticamente.
        </p>
      </div>

      {/* Hours list */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-primary" />
            Funcionamento semanal
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2 pt-0 space-y-1">
          {hours.map((day) => {
            const status = dayStatus[day.day_of_week] || 'idle';
            return (
              <div
                key={day.day_of_week}
                className={cn(
                  'rounded-xl border transition-colors px-3 py-2.5',
                  day.is_open
                    ? 'border-border/40 bg-background/40'
                    : 'border-border/20 bg-muted/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={day.is_open}
                    onCheckedChange={(checked) =>
                      updateHour(day.day_of_week, 'is_open', checked, true)
                    }
                  />
                  <span className={cn('font-medium text-sm flex-1', !day.is_open && 'text-muted-foreground')}>
                    {DAY_NAMES[day.day_of_week]}
                  </span>
                  <StatusBadge status={status} />
                </div>

                {day.is_open && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Abertura</Label>
                      <div className="flex items-center gap-1.5 mt-1">
                        <TimeInput
                          value={day.start_time}
                          onChange={(val) => updateHour(day.day_of_week, 'start_time', val)}
                          className="w-full h-9 text-sm"
                        />
                        <span className="text-[10px] text-muted-foreground">às</span>
                        <TimeInput
                          value={day.end_time}
                          onChange={(val) => updateHour(day.day_of_week, 'end_time', val)}
                          className="w-full h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Intervalo</Label>
                      <div className="flex items-center gap-1.5 mt-1">
                        <TimeInput
                          value={day.break_start || ''}
                          onChange={(val) => updateHour(day.day_of_week, 'break_start', val || null)}
                          className="w-full h-9 text-sm"
                        />
                        <span className="text-[10px] text-muted-foreground">às</span>
                        <TimeInput
                          value={day.break_end || ''}
                          onChange={(val) => updateHour(day.day_of_week, 'break_end', val || null)}
                          className="w-full h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Closing Time */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              Encerramento do dia
            </CardTitle>
            <AutoSaveIndicator status={closingTimeAutoSave.status} />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-2">
          <p className="text-xs text-muted-foreground">
            Horário em que o sistema sugere o fechamento dos atendimentos.
          </p>
          <TimeInput
            value={closingTimeAutoSave.value}
            onChange={(val) => closingTimeAutoSave.setValue(val)}
            className="h-10"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Horarios;
