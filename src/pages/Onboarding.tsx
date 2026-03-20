import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase, DAY_NAMES } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeInput } from '@/components/ui/TimeInput';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Loader2, Building2, Timer as Clock, CalendarDays as Calendar, CircleCheck as CheckCircle, ArrowRight, ArrowLeft, UserRound as User, Phone
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

const TOTAL_STEPS = 4;

const stepIcons = [Building2, Calendar, Clock, Clock];
const stepTitles = ['Seus dados e barbearia', 'Dias de Atendimento', 'Horários de Funcionamento', 'Intervalos / Almoço'];
const stepDescriptions = [
  'Informações básicas para começar',
  'Selecione os dias em que você atende',
  'Configure o horário de cada dia',
  'Configure os intervalos de cada dia (opcional)',
];

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { barber, loading: barberLoading } = useBarber();
  const { barbershop, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Personal info + Barbershop
  const [barberName, setBarberName] = useState('');
  const [barbershopName, setBarbershopName] = useState('');
  const [barbershopPhone, setBarbershopPhone] = useState('');

  // Step 2 & 3: Days and hours
  const [days, setDays] = useState<DayConfig[]>(defaultDays);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Initialize with existing data
  useEffect(() => {
    if (barbershop) {
      setBarbershopName(barbershop.name === 'Minha Barbearia' ? '' : barbershop.name);
      setBarbershopPhone(barbershop.phone || '');
    }
  }, [barbershop]);

  useEffect(() => {
    if (barber) {
      setBarberName(barber.name === 'Barbeiro' ? '' : barber.name);
    }
  }, [barber]);

  // Check if onboarding already completed
  useEffect(() => {
    if (!roleLoading && barbershop) {
      if (barbershop.onboarding_completed) {
        navigate('/painel', { replace: true });
      }
    }
  }, [barbershop, roleLoading, navigate]);

  const updateDay = (dayOfWeek: number, field: keyof DayConfig, value: string | boolean) => {
    setDays(prev => prev.map(d => 
      d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d
    ));
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!barberName.trim()) {
        toast.error('Digite seu nome');
        return;
      }
      if (!barbershopName.trim()) {
        toast.error('Digite o nome da barbearia');
        return;
      }

      if (barber) {
        await supabase
          .from('barbers')
          .update({ name: barberName.trim() })
          .eq('id', barber.id);
      }

      if (barbershop) {
        await supabase
          .from('barbershops')
          .update({ 
            name: barbershopName.trim(),
            phone: barbershopPhone.trim() || null,
          })
          .eq('id', barbershop.id);
      }

      setStep(2);
    } else if (step === 2) {
      const hasOpenDay = days.some(d => d.is_open);
      if (!hasOpenDay) {
        toast.error('Selecione pelo menos um dia de atendimento');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleFinish = async () => {
    if (!barber || !barbershop) return;

    setSaving(true);
    try {
      // Delete any existing opening_hours for this barber (in case of retry)
      await supabase
        .from('opening_hours')
        .delete()
        .eq('barber_id', barber.id);

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

      const { error: hoursError } = await supabase
        .from('opening_hours')
        .insert(toInsert);

      if (hoursError) throw hoursError;

      const { error: updateError } = await supabase
        .from('barbershops')
        .update({ onboarding_completed: true })
        .eq('id', barbershop.id);

      if (updateError) throw updateError;

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

  const StepIcon = stepIcons[step - 1];

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-lg space-y-6 animate-fade-in">
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
                className="h-1.5 flex-1 rounded-full transition-all duration-500"
                style={{
                  background: i < step ? 'var(--primary-gradient)' : undefined,
                }}
              >
                {i >= step && <div className="h-full w-full rounded-full bg-muted" />}
              </div>
            ))}
          </div>

          {/* Step Card */}
          <Card className="shadow-card-lg border-border/40 bg-card/80 backdrop-blur-sm animate-fade-in" key={step}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-gradient)' }}>
                  <StepIcon className="h-4 w-4 text-primary-foreground" />
                </div>
                {stepTitles[step - 1]}
              </CardTitle>
              <CardDescription>
                {stepDescriptions[step - 1]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Personal Info + Barbershop */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="barber-name">Seu nome *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="barber-name"
                        placeholder="Seu nome completo"
                        value={barberName}
                        onChange={(e) => setBarberName(e.target.value)}
                        className="pl-10 h-11"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-name">Nome da barbearia *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="barbershop-name"
                        placeholder="Ex: Barbearia do João"
                        value={barbershopName}
                        onChange={(e) => setBarbershopName(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-phone">Telefone da barbearia</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="barbershop-phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={barbershopPhone}
                        onChange={(e) => {
                          const numbers = e.target.value.replace(/\D/g, '');
                          let formatted = numbers;
                          if (numbers.length > 2) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
                          if (numbers.length > 7) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
                          setBarbershopPhone(formatted);
                        }}
                        className="pl-10 h-11"
                        maxLength={15}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Working Days */}
              {step === 2 && (
                <div className="space-y-2">
                  {days.map(day => (
                    <div
                      key={day.day_of_week}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                        day.is_open 
                          ? 'border-primary/30 bg-primary/5 shadow-sm' 
                          : 'border-border/50 hover:border-border'
                      }`}
                    >
                      <span className="font-medium text-sm">{DAY_NAMES[day.day_of_week]}</span>
                      <Switch
                        checked={day.is_open}
                        onCheckedChange={(checked) => updateDay(day.day_of_week, 'is_open', checked)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3: Hours */}
              {step === 3 && (
                <div className="space-y-3">
                  {days.filter(d => d.is_open).map(day => (
                    <div key={day.day_of_week} className="p-3.5 rounded-xl border border-border/50 space-y-3 bg-secondary/20">
                      <p className="font-medium text-sm">{DAY_NAMES[day.day_of_week]}</p>
                      <div className="flex items-center gap-2">
                         <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Início</Label>
                          <TimeInput
                            value={day.start_time}
                            onChange={(val) => updateDay(day.day_of_week, 'start_time', val)}
                            className="h-10"
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">—</span>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Fim</Label>
                          <TimeInput
                            value={day.end_time}
                            onChange={(val) => updateDay(day.day_of_week, 'end_time', val)}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 4: Breaks */}
              {step === 4 && (
                <div className="space-y-3">
                  {days.filter(d => d.is_open).map(day => (
                    <div key={day.day_of_week} className="p-3.5 rounded-xl border border-border/50 space-y-3 bg-secondary/20">
                      <p className="font-medium text-sm">{DAY_NAMES[day.day_of_week]}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Intervalo início</Label>
                          <TimeInput
                            value={day.break_start}
                            onChange={(val) => updateDay(day.day_of_week, 'break_start', val)}
                            className="h-10"
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">—</span>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Intervalo fim</Label>
                          <TimeInput
                            value={day.break_end}
                            onChange={(val) => updateDay(day.day_of_week, 'break_end', val)}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-2">
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-11 rounded-xl">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                )}
                {step < TOTAL_STEPS ? (
                  <Button onClick={handleNext} className="flex-1 btn-primary-gradient h-11 rounded-xl">
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleFinish} disabled={saving} className="flex-1 btn-primary-gradient h-11 rounded-xl">
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
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
