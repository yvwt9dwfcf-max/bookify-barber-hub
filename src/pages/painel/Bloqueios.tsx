import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, BlockedSlot, Barber } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarOff, 
  Loader2, 
  Plus, 
  Trash2, 
  CalendarIcon,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SkeletonCard } from '@/components/ui/premium-skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ContextType {
  barber: Barber | null;
  barbershop: { id: string } | null;
  isMaster: boolean;
}

type BlockType = 'single' | 'range';

const BLOCK_PRESETS = [
  { label: 'Almoço', reason: 'Intervalo para almoço' },
  { label: 'Folga', reason: 'Dia de folga' },
  { label: 'Férias', reason: 'Período de férias' },
  { label: 'Consulta', reason: 'Consulta médica' },
  { label: 'Outro', reason: '' },
];

const Bloqueios = () => {
  const { barber } = useOutletContext<ContextType>();
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [blockType, setBlockType] = useState<BlockType>('single');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [reason, setReason] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);

  useEffect(() => {
    if (barber) {
      fetchBlockedSlots();
    }
  }, [barber]);

  const fetchBlockedSlots = async () => {
    if (!barber) return;

    try {
      const { data, error } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('barber_id', barber.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBlockedSlots(data || []);
    } catch (error) {
      console.error('Erro ao buscar bloqueios:', error);
      toast.error('Erro ao carregar bloqueios');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBlockType('single');
    setSelectedDate(undefined);
    setEndDate(undefined);
    setStartTime('09:00');
    setEndTime('18:00');
    setReason('');
    setIsFullDay(true);
  };

  const handleAddBlock = async () => {
    if (!barber || !selectedDate) {
      toast.error('Selecione uma data');
      return;
    }

    if (blockType === 'range' && !endDate) {
      toast.error('Selecione a data final');
      return;
    }

    if (!isFullDay && startTime >= endTime) {
      toast.error('O horário final deve ser maior que o inicial');
      return;
    }

    setSaving(true);
    try {
      const blocks: { barber_id: string; barbershop_id: string | null; start_time: string; end_time: string; reason: string | null }[] = [];

      if (blockType === 'single') {
        // Single day block
        const startDateTime = isFullDay 
          ? new Date(selectedDate.setHours(0, 0, 0, 0))
          : new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${startTime}:00`);
        
        const endDateTime = isFullDay
          ? new Date(selectedDate.setHours(23, 59, 59, 999))
          : new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${endTime}:00`);

        blocks.push({
          barber_id: barber.id,
          barbershop_id: barber.barbershop_id || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          reason: reason || null,
        });
      } else {
        // Date range (full days only)
        let currentDate = new Date(selectedDate);
        const finalDate = endDate!;

        while (currentDate <= finalDate) {
          const startDateTime = new Date(currentDate);
          startDateTime.setHours(0, 0, 0, 0);
          
          const endDateTime = new Date(currentDate);
          endDateTime.setHours(23, 59, 59, 999);

          blocks.push({
            barber_id: barber.id,
            barbershop_id: barber.barbershop_id || null,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            reason: reason || null,
          });

          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        }
      }

      const { error } = await supabase
        .from('blocked_slots')
        .insert(blocks);

      if (error) throw error;

      toast.success(blocks.length > 1 
        ? `${blocks.length} dias bloqueados com sucesso!` 
        : 'Horário bloqueado com sucesso!'
      );
      
      resetForm();
      setDialogOpen(false);
      fetchBlockedSlots();
    } catch (error) {
      console.error('Erro ao adicionar bloqueio:', error);
      toast.error('Erro ao adicionar bloqueio');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Bloqueio removido com sucesso!');
      fetchBlockedSlots();
    } catch (error) {
      console.error('Erro ao remover bloqueio:', error);
      toast.error('Erro ao remover bloqueio');
    }
  };

  const isFullDayBlock = (slot: BlockedSlot) => {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    return start.getHours() === 0 && end.getHours() === 23;
  };

  const formatBlockTime = (slot: BlockedSlot) => {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    
    if (isFullDayBlock(slot)) {
      return 'Dia inteiro';
    }
    
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  // Group blocks by date
  const groupedBlocks = blockedSlots.reduce((acc, slot) => {
    const dateKey = format(new Date(slot.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, BlockedSlot[]>);

  // Separate future and past blocks
  const today = startOfDay(new Date());
  const futureBlocks = Object.entries(groupedBlocks)
    .filter(([date]) => !isBefore(parseISO(date), today))
    .sort(([a], [b]) => a.localeCompare(b));
  
  const pastBlocks = Object.entries(groupedBlocks)
    .filter(([date]) => isBefore(parseISO(date), today))
    .sort(([a], [b]) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="space-y-6 animate-page-enter">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-muted/30 rounded-lg animate-pulse" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bloqueios de Horário</h1>
          <p className="text-muted-foreground">
            Bloqueie horários para férias, folgas ou intervalos
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary-gradient">
              <Plus className="mr-2 h-4 w-4" />
              Novo bloqueio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Bloqueio</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Block Type */}
              <div className="space-y-2">
                <Label>Tipo de bloqueio</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={blockType === 'single' ? 'default' : 'outline'}
                    onClick={() => setBlockType('single')}
                    className={cn(blockType === 'single' && 'btn-primary-gradient')}
                  >
                    Um dia
                  </Button>
                  <Button
                    type="button"
                    variant={blockType === 'range' ? 'default' : 'outline'}
                    onClick={() => {
                      setBlockType('range');
                      setIsFullDay(true);
                    }}
                    className={cn(blockType === 'range' && 'btn-primary-gradient')}
                  >
                    Período
                  </Button>
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label>{blockType === 'range' ? 'Data inicial' : 'Data'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate 
                        ? format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Selecione a data'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => isBefore(date, startOfDay(new Date()))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date for Range */}
              {blockType === 'range' && (
                <div className="space-y-2">
                  <Label>Data final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate 
                          ? format(endDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                          : 'Selecione a data final'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => 
                          isBefore(date, startOfDay(new Date())) ||
                          (selectedDate ? isBefore(date, selectedDate) : false)
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Time Selection for Single Day */}
              {blockType === 'single' && (
                <>
                  <div className="flex items-center gap-4">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFullDay}
                        onChange={(e) => setIsFullDay(e.target.checked)}
                        className="rounded border-input"
                      />
                      Dia inteiro
                    </Label>
                  </div>

                  {!isFullDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Horário inicial</Label>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horário final</Label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Reason Presets */}
              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {BLOCK_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReason(preset.reason)}
                      className={cn(
                        reason === preset.reason && preset.reason !== '' && 
                        'border-primary bg-primary/10'
                      )}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo do bloqueio..."
                  rows={2}
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleAddBlock}
                disabled={saving || !selectedDate}
                className="w-full btn-primary-gradient"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CalendarOff className="mr-2 h-4 w-4" />
                    Bloquear {blockType === 'range' ? 'período' : 'horário'}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Future Blocks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Bloqueios ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {futureBlocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum bloqueio ativo.</p>
              <p className="text-sm">Use o botão acima para bloquear horários.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {futureBlocks.map(([dateKey, slots]) => (
                <div key={dateKey} className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(parseISO(dateKey), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </div>
                  <div className="divide-y divide-border">
                    {slots.map((slot) => (
                      <div 
                        key={slot.id} 
                        className="px-4 py-3 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatBlockTime(slot)}</span>
                          </div>
                          {slot.reason && (
                            <span className="text-sm text-muted-foreground truncate">
                              — {slot.reason}
                            </span>
                          )}
                        </div>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover bloqueio?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso irá liberar o horário para agendamentos. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteBlock(slot.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Blocks (collapsed by default) */}
      {pastBlocks.length > 0 && (
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-5 w-5" />
              Bloqueios passados ({pastBlocks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Estes bloqueios já passaram e podem ser removidos para limpeza.
            </p>
            <div className="space-y-2">
              {pastBlocks.slice(0, 5).map(([dateKey, slots]) => (
                <div key={dateKey} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {format(parseISO(dateKey), "d 'de' MMMM", { locale: ptBR })} 
                    ({slots.length} bloqueio{slots.length > 1 ? 's' : ''})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => slots.forEach(s => handleDeleteBlock(s.id))}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {pastBlocks.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  + {pastBlocks.length - 5} mais...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted-foreground text-center">
        Os horários bloqueados não aparecerão disponíveis para os clientes.
      </p>
    </div>
  );
};

export default Bloqueios;
