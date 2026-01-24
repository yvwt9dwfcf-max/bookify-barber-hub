import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, OpeningHours, Barber, DAY_NAMES } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ContextType {
  barber: Barber | null;
}

interface DayHours {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
  id?: string;
}

const defaultHours: DayHours[] = [
  { day_of_week: 0, start_time: '09:00', end_time: '18:00', is_open: false },
  { day_of_week: 1, start_time: '09:00', end_time: '18:00', is_open: true },
  { day_of_week: 2, start_time: '09:00', end_time: '18:00', is_open: true },
  { day_of_week: 3, start_time: '09:00', end_time: '18:00', is_open: true },
  { day_of_week: 4, start_time: '09:00', end_time: '18:00', is_open: true },
  { day_of_week: 5, start_time: '09:00', end_time: '18:00', is_open: true },
  { day_of_week: 6, start_time: '09:00', end_time: '14:00', is_open: true },
];

const Horarios = () => {
  const { barber } = useOutletContext<ContextType>();
  const [hours, setHours] = useState<DayHours[]>(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (barber) {
      fetchHours();
    }
  }, [barber]);

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

  const updateHour = (dayOfWeek: number, field: keyof DayHours, value: string | boolean) => {
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
        day_of_week: h.day_of_week,
        start_time: h.start_time,
        end_time: h.end_time,
        is_open: h.is_open,
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="sr-only">Início</Label>
                    <Input
                      type="time"
                      value={day.start_time}
                      onChange={(e) =>
                        updateHour(day.day_of_week, 'start_time', e.target.value)
                      }
                      className="w-auto"
                    />
                  </div>
                  <span className="text-muted-foreground">até</span>
                  <div className="flex items-center gap-2">
                    <Label className="sr-only">Fim</Label>
                    <Input
                      type="time"
                      value={day.end_time}
                      onChange={(e) =>
                        updateHour(day.day_of_week, 'end_time', e.target.value)
                      }
                      className="w-auto"
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
    </div>
  );
};

export default Horarios;
