import { Check, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AgendaPreferences, AgendaPalette } from './timelineUtils';

const palettes: { id: AgendaPalette; name: string; colors: string[] }[] = [
  { id: 'original', name: 'Original', colors: ['green', 'cyan', 'amber'] },
  { id: 'ocean', name: 'Oceano', colors: ['cyan', 'violet', 'green'] },
  { id: 'warm', name: 'Contraste', colors: ['rose', 'cyan', 'amber'] },
];
export default function AgendaAppearance({ preferences, onChange }: { preferences: AgendaPreferences; onChange: (value: AgendaPreferences) => void }) {
  return <Popover>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" className="agenda-icon" aria-label="Aparência da agenda" title="Aparência da agenda"><SlidersHorizontal /></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-72 space-y-5">
      <div><h3 className="text-sm font-semibold">Aparência da agenda</h3><p className="mt-1 text-xs text-muted-foreground">Neste aparelho</p></div>
      <fieldset className="space-y-2"><legend className="mb-2 text-xs font-medium text-muted-foreground">Cores das fitinhas</legend>
        {palettes.map(p => <Button key={p.id} variant="ghost" onClick={() => onChange({ ...preferences, palette: p.id })} aria-pressed={preferences.palette === p.id} className="h-12 w-full justify-start rounded-lg border border-border">
          <span className="flex gap-1">{p.colors.map(c => <span key={c} className={cn('agenda-swatch', `agenda-color-${c}`)} />)}</span>
          <span className="flex-1 text-left">{p.name}</span>{preferences.palette === p.id && <Check className="text-primary" />}
        </Button>)}
      </fieldset>
    </PopoverContent>
  </Popover>;
}
