import { useState } from 'react';
import { addDays, format, isToday, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Menu, Plus } from 'lucide-react';
import type { Barber } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getInitials } from './agendaUtils';
import AgendaAppearance from './AgendaAppearance';
import type { AgendaMode, AgendaFilter, AgendaPreferences } from './timelineUtils';

export function AgendaAvatar({ barber, size = 'normal' }: { barber?: Barber; size?: 'normal' | 'small' }) {
  const [failed, setFailed] = useState(false);
  return <span className={cn('agenda-avatar', size === 'small' && 'agenda-avatar-small')}>
    {barber?.photo_url && !failed ? <img src={barber.photo_url} alt={barber.name} onError={() => setFailed(true)} /> : <span>{getInitials(barber?.name || 'Bookify')}</span>}
  </span>;
}
interface Props {
  mode: AgendaMode; onModeChange: (mode: AgendaMode) => void; selectedDate: Date; onDateChange: (date: Date) => void;
  canViewOthers: boolean; barbers: Barber[]; selectedBarber?: Barber; onBarberChange: (id: string) => void;
  filter: AgendaFilter; onFilterChange: (filter: AgendaFilter) => void; preferences: AgendaPreferences;
  onPreferencesChange: (preferences: AgendaPreferences) => void; refreshing: boolean; onRefresh: () => void;
  onNew: () => void; canCreate: boolean; onOpenMenu?: () => void; onMonthView: () => void;
}
export default function AgendaToolbar(p: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const week = startOfWeek(p.selectedDate, { weekStartsOn: 1 });
  return <header className="agenda-toolbar">
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {p.onOpenMenu && <Button variant="ghost" size="icon" className="agenda-icon lg:hidden" onClick={p.onOpenMenu} aria-label="Abrir menu"><Menu /></Button>}
        <div className="min-w-0"><h1 className="agenda-title">Agenda</h1><p className="agenda-subtitle truncate">{p.mode === 'team' ? 'Toda a equipe' : p.selectedBarber?.name || 'Bookify'}</p></div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" className="agenda-icon" onClick={p.onRefresh} disabled={p.refreshing} aria-label="Atualizar agenda" title="Atualizar agenda"><RefreshCw className={cn(p.refreshing && 'animate-spin')} /></Button>
        <AgendaAppearance preferences={p.preferences} onChange={p.onPreferencesChange} />
        <AgendaAvatar key={p.selectedBarber?.id} barber={p.selectedBarber} />
      </div>
    </div>
    <div className="agenda-tabs" role="tablist" aria-label="Visualização da agenda">
      {([{ id: 'individual', label: 'Individual' }, ...(p.canViewOthers ? [{ id: 'team', label: 'Equipe' }] : []), { id: 'week', label: 'Semana' }] as { id: AgendaMode; label: string }[]).map(tab => <Button key={tab.id} variant="ghost" role="tab" aria-selected={p.mode === tab.id} className={cn('agenda-tab', p.mode === tab.id && 'is-active')} onClick={() => p.onModeChange(tab.id)}>{tab.label}</Button>)}
    </div>
    <div className="agenda-controls">
      <div className="flex min-w-0 items-center gap-0.5">
        <Button variant="ghost" size="icon" className="agenda-icon" onClick={() => p.onDateChange(addDays(p.selectedDate, p.mode === 'week' ? -7 : -1))} aria-label={p.mode === 'week' ? 'Semana anterior' : 'Dia anterior'}><ChevronLeft /></Button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild><Button variant="ghost" className="agenda-date" aria-label="Escolher data"><CalendarDays className="hidden sm:block" /><span>{p.mode === 'week' ? `${format(week, 'd')} – ${format(addDays(week, 6), 'd MMM', { locale: ptBR })}` : format(p.selectedDate, "EEE, d MMM", { locale: ptBR })}</span></Button></PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0"><Calendar mode="single" selected={p.selectedDate} locale={ptBR} onSelect={date => { if (date) { p.onDateChange(date); setCalendarOpen(false); } }} /><Button variant="ghost" className="w-full border-t border-border" onClick={() => { p.onMonthView(); setCalendarOpen(false); }}>Visão mensal</Button></PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" className="agenda-icon" onClick={() => p.onDateChange(addDays(p.selectedDate, p.mode === 'week' ? 7 : 1))} aria-label={p.mode === 'week' ? 'Próxima semana' : 'Próximo dia'}><ChevronRight /></Button>
        {!isToday(p.selectedDate) && <Button variant="ghost" className="agenda-today" onClick={() => p.onDateChange(new Date())}>Hoje</Button>}
      </div>
      <div className="agenda-selects">
        {p.mode !== 'team' && p.canViewOthers && p.barbers.length > 1 && <Select value={p.selectedBarber?.id} onValueChange={p.onBarberChange}><SelectTrigger className="agenda-select" aria-label="Profissional"><SelectValue placeholder="Profissional" /></SelectTrigger><SelectContent>{p.barbers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>}
        <Select value={p.filter} onValueChange={v => p.onFilterChange(v as AgendaFilter)}><SelectTrigger className="agenda-select" aria-label="Filtrar agendamentos"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="active">Ativos</SelectItem><SelectItem value="all">Todos os status</SelectItem><SelectItem value="confirmed">Confirmados</SelectItem><SelectItem value="completed">Concluídos</SelectItem><SelectItem value="cancelled">Cancelados</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="manual">Manuais</SelectItem>
        </SelectContent></Select>
        <Button variant="secondary" className="agenda-add hidden sm:inline-flex btn-primary-solid" onClick={p.onNew} disabled={!p.canCreate}><Plus />Agendar</Button>
      </div>
    </div>
  </header>;
}
