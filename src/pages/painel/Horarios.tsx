import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, OpeningHours, Barber, DAY_NAMES } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { TimeInput } from '@/components/ui/TimeInput';
import { Timer as Clock, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ContextType {
  barber: Barber | null;
  barbershop: { id: string } | null;
  isMaster: boolean;
}

interface BarbershopClosingConfig {
  closing_time: string | null;
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

const Horarios = () => {
  const { barber, barbershop } = useOutletContext<ContextType>();
  const [hours, setHours] = useState<DayHours[]>(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closingTime, setClosingTime] = useState<string>('');
  const [savingClosing, setSavingClosing] = useState(false);

  useEffect(() => {
    if (barber) {
      fetchHours();
    }
  }, [barber]);

  useEffect(() => {
    if (barbershop?.id) {
      fetchClosingTime();
    }
  }, [barbershop]);

  const fetchClosingTime = async () => {
    if (!barbershop?.id) return;
    try {
      const { data, error } = await supabase
        .from('barbershops')
        .select('closing_time')
        .eq('id', barbershop.id)
        .maybeSingle();
      if (error) throw error;
      setClosingTime((data as any)?.closing_time || '');
    } catch (error) {
      console.error('Erro ao buscar horário de encerramento:', error);
    }
  };

  const handleSaveClosingTime = async () => {
    if (!barbershop?.id) return;
    setSavingClosing(true);
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ closing_time: closingTime || null } as any)
        .eq('id', barbershop.id);
      if (error) throw error;
      toast.success('Horário de encerramento salvo!');
    } catch (error) {
      console.error('Erro ao salvar horário de encerramento:', error);
      toast.error('Erro ao salvar horário de encerramento');
    } finally {
      setSavingClosing(false);
    }
  };

  const fetchHours = async () => {
    if (!barber) return;

    try {
      const { data, error } = await supabase
        .from('opening_hours')
        .select('*')
        .eq('barber_id', barber.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const mergedHours = defaultHours.map((defaultDay) => {
          const savedDay = data.find((d) => d.day_of_week === defaultDay.day_of_week);
          if (savedDay) {
            return {
              ...defaultDay,
              start_time: savedDay.start_time.slice(0, 5),
              end_time: savedDay.end_time.slice(0, 5),
              is_open: savedDay.is_open,
              break_start: savedDay.break_start ? savedDay.break_start.slice(0, 5) : null,
              break_end: savedDay.break_end ? savedDay.break_end.slice(0, 5) : null,
              id: savedDay.id,
            };
          }
          return defaultDay;
        });
        setHours(mergedHours);
      }
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      toast.error('Erro ao carregar horários');
    } finally {
      setLoading(false);
    }
  };

  const updateHour = (dayOfWeek: number, field: keyof DayHours, value: string | boolean | null) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  };

  const handleSave = async () => {
    if (!barber) return;

    setSaving(true);
    try {
      // Delete existing hours
      await supabase
        .from('opening_hours')
        .delete()
        .eq('barber_id', barber.id);

      // Insert new hours
      const toInsert = hours.map((h) => ({
        barber_id: barber.id,
        barbershop_id: barber.barbershop_id || null,
        day_of_week: h.day_of_week,
        start_time: h.start_time,
        end_time: h.end_time,
        is_open: h.is_open,
        break_start: h.break_start || null,
        break_end: h.break_end || null,
      }));

      const { error } = await supabase
        .from('opening_hours')
        .insert(toInsert);

      if (error) throw error;
      toast.success('Horários salvos com sucesso!');
      fetchHours();
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      toast.error('Erro ao salvar horários');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-page-enter">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <PremiumSkeleton className="h-7 w-48" />
            <PremiumSkeleton className="h-4 w-72" />
          </div>
          <PremiumSkeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/20">
              <PremiumSkeleton className="h-5 w-10 rounded-full" />
              <PremiumSkeleton className="h-4 w-24" />
              <div className="flex-1" />
              <PremiumSkeleton className="h-8 w-20 rounded-lg" />
              <PremiumSkeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Horários de Atendimento</h1>
          <p className="text-muted-foreground">
            Configure seus horários de funcionamento
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="btn-primary-gradient">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar horários
            </>
          )}
        </Button>
      </div>

      {/* Hours Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horários por dia da semana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hours.map((day) => (
            <div
              key={day.day_of_week}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border"
            >
              <div className="flex items-center gap-4 flex-1">
                <Switch
                  checked={day.is_open}
                  onCheckedChange={(checked) =>
                    updateHour(day.day_of_week, 'is_open', checked)
                  }
                />
                <span className="font-medium min-w-[120px]">
                  {DAY_NAMES[day.day_of_week]}
                </span>
              </div>

              {day.is_open ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground min-w-[50px]">Início</Label>
                    <TimeInput
                      value={day.start_time}
                      onChange={(val) =>
                        updateHour(day.day_of_week, 'start_time', val)
                      }
                    />
                    <span className="text-muted-foreground">-</span>
                    <TimeInput
                      value={day.end_time}
                      onChange={(val) =>
                        updateHour(day.day_of_week, 'end_time', val)
                      }
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground min-w-[50px]">Intervalo</Label>
                    <TimeInput
                      value={day.break_start || ''}
                      onChange={(val) =>
                        updateHour(day.day_of_week, 'break_start', val || null)
                      }
                    />
                    <span className="text-muted-foreground">-</span>
                    <TimeInput
                      value={day.break_end || ''}
                      onChange={(val) =>
                        updateHour(day.day_of_week, 'break_end', val || null)
                      }
                    />
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground flex-1">Fechado</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Os clientes só poderão agendar nos dias e horários configurados acima.
      </p>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* Closing Time Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Encerramento do dia
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Horário em que o sistema irá sugerir o fechamento dos atendimentos do dia.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="closing-time" className="text-sm font-medium">
                Horário de encerramento
              </Label>
              <Input
                id="closing-time"
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="mt-1.5 w-auto"
                placeholder="18:00"
              />
            </div>
            <Button
              onClick={handleSaveClosingTime}
              disabled={savingClosing}
              size="sm"
              className="btn-primary-gradient"
            >
              {savingClosing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </div>
          {closingTime && (
            <p className="text-xs text-muted-foreground mt-3">
              Ao abrir o painel após as {closingTime}, você receberá um lembrete para concluir os atendimentos do dia.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Horarios;
