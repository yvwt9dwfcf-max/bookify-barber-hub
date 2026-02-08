import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase, DAY_NAMES } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Loader2, Building2, Clock, Calendar, CheckCircle, ArrowRight, ArrowLeft 
} from 'lucide-react';
import { toast } from 'sonner';

interface DayConfig {
  day_of_week: number;
  is_open: boolean;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
}

const defaultDays: DayConfig[] = [
  { day_of_week: 0, is_open: false, start_time: '09:00', end_time: '18:00', break_start: '', break_end: '' },
  { day_of_week: 1, is_open: true, start_time: '09:00', end_time: '18:00', break_start: '', break_end: '' },
  { day_of_week: 2, is_open: true, start_time: '09:00', end_time: '18:00', break_start: '', break_end: '' },
  { day_of_week: 3, is_open: true, start_time: '09:00', end_time: '18:00', break_start: '', break_end: '' },
  { day_of_week: 4, is_open: true, start_time: '09:00', end_time: '18:00', break_start: '', break_end: '' },
  { day_of_week: 5, is_open: true, start_time: '09:00', end_time: '18:00', break_start: '', break_end: '' },
  { day_of_week: 6, is_open: true, start_time: '09:00', end_time: '14:00', break_start: '', break_end: '' },
];

const TOTAL_STEPS = 3;

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { barber, loading: barberLoading } = useBarber();
  const { barbershop, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Barbershop name
  const [barbershopName, setBarbershopName] = useState('');

  // Step 2 & 3: Days and hours
  const [days, setDays] = useState<DayConfig[]>(defaultDays);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Initialize barbershop name
  useEffect(() => {
    if (barbershop) {
      setBarbershopName(barbershop.name);
    }
  }, [barbershop]);

  // Check if onboarding already completed
  useEffect(() => {
    if (!barberLoading && barber && !roleLoading && barbershop) {
      checkOnboardingStatus();
    }
  }, [barber, barberLoading, barbershop, roleLoading]);

  const checkOnboardingStatus = async () => {
    if (!barber) return;
    
    const { data } = await supabase
      .from('opening_hours')
      .select('id')
      .eq('barber_id', barber.id)
      .limit(1);

    if (data && data.length > 0) {
      // Already has opening hours, skip onboarding
      navigate('/painel', { replace: true });
    }
  };

  const updateDay = (dayOfWeek: number, field: keyof DayConfig, value: string | boolean) => {
    setDays(prev => prev.map(d => 
      d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d
    ));
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!barbershopName.trim()) {
        toast.error('Digite o nome da barbearia');
        return;
      }
      // Save barbershop name if changed
      if (barbershop && barbershopName.trim() !== barbershop.name) {
        const { error } = await supabase
          .from('barbershops')
          .update({ name: barbershopName.trim() })
          .eq('id', barbershop.id);
        if (error) {
          toast.error('Erro ao salvar nome da barbearia');
          return;
        }
      }
      setStep(2);
    } else if (step === 2) {
      const hasOpenDay = days.some(d => d.is_open);
      if (!hasOpenDay) {
        toast.error('Selecione pelo menos um dia de atendimento');
        return;
      }
      setStep(3);
    }
  };

  const handleFinish = async () => {
    if (!barber || !barbershop) return;

    setSaving(true);
    try {
      // Save opening hours
      const toInsert = days.map(d => ({
        barber_id: barber.id,
        barbershop_id: barbershop.id,
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
        is_open: d.is_open,
        break_start: d.break_start || null,
        break_end: d.break_end || null,
      }));

      const { error } = await supabase
        .from('opening_hours')
        .insert(toInsert);

      if (error) throw error;

      toast.success('Barbearia configurada com sucesso! 🎉');
      navigate('/painel', { replace: true });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || barberLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" linkTo={undefined} />
            </div>
            <h1 className="text-2xl font-bold">Configure sua barbearia</h1>
            <p className="text-muted-foreground mt-1">
              Passo {step} de {TOTAL_STEPS}
            </p>
          </div>

          {/* Progress */}
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  i < step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Barbershop Name */}
          {step === 1 && (
            <Card className="shadow-card-lg animate-in fade-in-50 duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Nome da Barbearia
                </CardTitle>
                <CardDescription>
                  Como seus clientes conhecem sua barbearia?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barbershop-name">Nome</Label>
                  <Input
                    id="barbershop-name"
                    placeholder="Ex: Barbearia do João"
                    value={barbershopName}
                    onChange={(e) => setBarbershopName(e.target.value)}
                    className="text-lg"
                    autoFocus
                  />
                </div>
                <Button onClick={handleNext} className="w-full btn-primary-gradient">
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Working Days */}
          {step === 2 && (
            <Card className="shadow-card-lg animate-in fade-in-50 duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Dias de Atendimento
                </CardTitle>
                <CardDescription>
                  Selecione os dias em que você atende
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {days.map(day => (
                  <div
                    key={day.day_of_week}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      day.is_open ? 'border-primary/30 bg-primary/5' : 'border-border'
                    }`}
                  >
                    <span className="font-medium">{DAY_NAMES[day.day_of_week]}</span>
                    <Switch
                      checked={day.is_open}
                      onCheckedChange={(checked) => updateDay(day.day_of_week, 'is_open', checked)}
                    />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button onClick={handleNext} className="flex-1 btn-primary-gradient">
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Hours & Breaks */}
          {step === 3 && (
            <Card className="shadow-card-lg animate-in fade-in-50 duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Horários e Intervalos
                </CardTitle>
                <CardDescription>
                  Configure o horário de cada dia de atendimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {days.filter(d => d.is_open).map(day => (
                  <div key={day.day_of_week} className="p-3 rounded-lg border border-border space-y-3">
                    <p className="font-medium text-sm">{DAY_NAMES[day.day_of_week]}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Início</Label>
                        <Input
                          type="time"
                          value={day.start_time}
                          onChange={(e) => updateDay(day.day_of_week, 'start_time', e.target.value)}
                        />
                      </div>
                      <span className="text-muted-foreground mt-5">—</span>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Fim</Label>
                        <Input
                          type="time"
                          value={day.end_time}
                          onChange={(e) => updateDay(day.day_of_week, 'end_time', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Intervalo início</Label>
                        <Input
                          type="time"
                          value={day.break_start}
                          onChange={(e) => updateDay(day.day_of_week, 'break_start', e.target.value)}
                          placeholder="--:--"
                        />
                      </div>
                      <span className="text-muted-foreground mt-5">—</span>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Intervalo fim</Label>
                        <Input
                          type="time"
                          value={day.break_end}
                          onChange={(e) => updateDay(day.day_of_week, 'break_end', e.target.value)}
                          placeholder="--:--"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button onClick={handleFinish} disabled={saving} className="flex-1 btn-primary-gradient">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Finalizar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
