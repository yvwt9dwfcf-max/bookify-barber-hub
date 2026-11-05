import { useMemo, useState } from 'react';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarX2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { getHolidayName } from '@/lib/holidays';
import { nextHolidayToRemind, type ReminderChoice } from '@/lib/holidayReminder';

const key = (shopId: string) => `bookify-holiday-reminder:${shopId}`;
const read = (shopId: string): Record<string, ReminderChoice> => {
  try { return JSON.parse(localStorage.getItem(key(shopId)) || '{}'); } catch { return {}; }
};

/** Manager-only nudge a few days before a national holiday: close the whole agenda, keep it open, or ask again tomorrow. */
export default function HolidayReminder({ shopId }: { shopId: string }) {
  const [choices, setChoices] = useState(() => read(shopId));
  const [busy, setBusy] = useState(false);
  const holiday = useMemo(() => nextHolidayToRemind(new Date(), choices, getHolidayName), [choices]);
  if (!holiday) return null;

  const save = (choice: ReminderChoice) => {
    const next = { ...choices, [holiday.date]: choice };
    try { localStorage.setItem(key(shopId), JSON.stringify(next)); } catch { /* storage unavailable */ }
    setChoices(next);
  };

  const closeDay = async () => {
    setBusy(true);
    const day = new Date(`${holiday.date}T12:00:00`);
    const { data: barbers, error } = await supabase.from('barbers').select('id').eq('barbershop_id', shopId).eq('is_active', true);
    if (!error && barbers?.length) {
      const { error: e2 } = await supabase.from('blocked_slots').insert(barbers.map(b => ({
        barber_id: b.id, barbershop_id: shopId, start_time: startOfDay(day).toISOString(), end_time: endOfDay(day).toISOString(), reason: `Feriado · ${holiday.name}`,
      })));
      setBusy(false);
      if (e2) { toast.error('Não foi possível fechar a agenda'); return; }
      toast.success('Agenda fechada no feriado'); save('closed'); return;
    }
    setBusy(false); toast.error('Não foi possível fechar a agenda');
  };

  return (
    <div className="my-2 rounded-2xl border border-warning/30 bg-warning/10 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold"><CalendarX2 className="h-4 w-4 text-warning" /> Feriado chegando: {holiday.name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground capitalize">{format(new Date(`${holiday.date}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })} · Quer fechar a agenda nesse dia?</p>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <Button size="sm" className="btn-primary-solid h-10" disabled={busy} onClick={closeDay}>Sim, fechar</Button>
        <Button size="sm" variant="outline" className="h-10 rounded-xl" onClick={() => save('open')}>Não</Button>
        <Button size="sm" variant="ghost" className="h-10 rounded-xl text-xs" onClick={() => save(`later:${format(addDays(new Date(), 1), 'yyyy-MM-dd')}`)}>Lembrar depois</Button>
      </div>
    </div>
  );
}
