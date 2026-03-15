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
  Loader2, Building2, Timer as Clock, CalendarDays as Calendar, 
  CircleCheck as CheckCircle, ArrowRight, ArrowLeft, UserRound as User, 
  Phone, Sparkles, Rocket, Scissors, DollarSign
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

const TOTAL_CONFIG_STEPS = 4;

type OnboardingPhase = 'welcome' | 'config' | 'complete';

const stepIcons = [Building2, User, Scissors, Clock];
const stepTitles = ['Nome da Barbearia', 'Seu Perfil', 'Primeiro Serviço', 'Horário de Funcionamento'];
const stepDescriptions = [
  'Como sua barbearia será conhecida pelos clientes',
  'Informações do barbeiro principal',
  'Crie o primeiro serviço para seus clientes agendarem',
  'Defina os dias e horários de atendimento',
];

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { barber, loading: barberLoading } = useBarber();
  const { barbershop, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<OnboardingPhase>('welcome');
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Barbershop
  const [barbershopName, setBarbershopName] = useState('');
  const [barbershopPhone, setBarbershopPhone] = useState('');

  // Step 2: Barber
  const [barberName, setBarberName] = useState('');

  // Step 3: Service
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('30');

  // Step 4: Days and hours
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
      if (!barbershopName.trim()) {
        toast.error('Digite o nome da barbearia');
        return;
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
      if (!barberName.trim()) {
        toast.error('Digite seu nome');
        return;
      }
      if (barber) {
        await supabase
          .from('barbers')
          .update({ name: barberName.trim() })
          .eq('id', barber.id);
      }
      setStep(3);
    } else if (step === 3) {
      if (!serviceName.trim()) {
        toast.error('Digite o nome do serviço');
        return;
      }
      if (!servicePrice.trim() || parseFloat(servicePrice) <= 0) {
        toast.error('Digite um preço válido');
        return;
      }
      // Save service
      if (barber && barbershop) {
        const { error } = await supabase
          .from('services')
          .insert({
            barber_id: barber.id,
            barbershop_id: barbershop.id,
            name: serviceName.trim(),
            price: parseFloat(servicePrice),
            duration_minutes: parseInt(serviceDuration),
            is_global: true,
            active: true,
          });
        if (error) {
          toast.error('Erro ao criar serviço');
          console.error(error);
          return;
        }
      }
      setStep(4);
    } else if (step === 4) {
      const hasOpenDay = days.some(d => d.is_open);
      if (!hasOpenDay) {
        toast.error('Selecione pelo menos um dia de atendimento');
        return;
      }
      await handleFinish();
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

      setPhase('complete');
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

  // Welcome Screen
  if (phase === 'welcome') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />
        </div>

        <div className="relative z-10 text-center space-y-8 max-w-md animate-fade-in">
          <div className="flex justify-center">
            <Logo size="lg" linkTo={undefined} />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Bem-vindo ao Bookify
            </h1>
            <p className="text-muted-foreground text-lg">
              Vamos preparar sua barbearia em poucos passos.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            {[
              { icon: Building2, text: 'Nome da barbearia' },
              { icon: User, text: 'Seu perfil de barbeiro' },
              { icon: Scissors, text: 'Primeiro serviço' },
              { icon: Clock, text: 'Horários de funcionamento' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-left px-4 py-3 rounded-xl border border-border/30 bg-card/50"
                style={{ animationDelay: `${(i + 1) * 0.1}s`, animation: 'fade-in 0.4s ease-out backwards' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => setPhase('config')}
            className="w-full btn-primary-gradient h-12 rounded-xl text-base"
          >
            Começar configuração
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative z-10 text-center space-y-8 max-w-md animate-fade-in">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/20">
              <Rocket className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Sua barbearia está pronta!
            </h1>
            <p className="text-muted-foreground text-lg">
              Tudo configurado! Agora seus clientes já podem agendar horários.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm">Barbearia configurada</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm">Serviço criado</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm">Horários definidos</span>
            </div>
          </div>

          <Button
            onClick={() => navigate('/painel', { replace: true })}
            className="w-full btn-primary-gradient h-12 rounded-xl text-base"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Ir para agenda
          </Button>
        </div>
      </div>
    );
  }

  // Configuration Steps
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
              Passo {step} de {TOTAL_CONFIG_STEPS}
            </p>
          </div>

          {/* Progress */}
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_CONFIG_STEPS }).map((_, i) => (
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
              {/* Step 1: Barbershop Name */}
              {step === 1 && (
                <>
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
                        autoFocus
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

              {/* Step 2: Barber Profile */}
              {step === 2 && (
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
              )}

              {/* Step 3: First Service */}
              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="service-name">Nome do serviço *</Label>
                    <div className="relative">
                      <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="service-name"
                        placeholder="Ex: Corte masculino"
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        className="pl-10 h-11"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="service-price">Preço (R$) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="service-price"
                          type="number"
                          placeholder="35.00"
                          value={servicePrice}
                          onChange={(e) => setServicePrice(e.target.value)}
                          className="pl-10 h-11"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service-duration">Duração (min)</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="service-duration"
                          type="number"
                          placeholder="30"
                          value={serviceDuration}
                          onChange={(e) => setServiceDuration(e.target.value)}
                          className="pl-10 h-11"
                          min="5"
                          step="5"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Schedule */}
              {step === 4 && (
                <div className="space-y-3">
                  {days.map(day => (
                    <div
                      key={day.day_of_week}
                      className={`rounded-xl border transition-all duration-200 ${
                        day.is_open 
                          ? 'border-primary/30 bg-primary/5 shadow-sm' 
                          : 'border-border/50 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between p-3.5">
                        <span className="font-medium text-sm">{DAY_NAMES[day.day_of_week]}</span>
                        <Switch
                          checked={day.is_open}
                          onCheckedChange={(checked) => updateDay(day.day_of_week, 'is_open', checked)}
                        />
                      </div>
                      {day.is_open && (
                        <div className="px-3.5 pb-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">Início</Label>
                              <Input
                                type="time"
                                value={day.start_time}
                                onChange={(e) => updateDay(day.day_of_week, 'start_time', e.target.value)}
                                className="h-9"
                              />
                            </div>
                            <span className="text-muted-foreground mt-4">—</span>
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">Fim</Label>
                              <Input
                                type="time"
                                value={day.end_time}
                                onChange={(e) => updateDay(day.day_of_week, 'end_time', e.target.value)}
                                className="h-9"
                              />
                            </div>
                          </div>
                        </div>
                      )}
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
                <Button 
                  onClick={handleNext} 
                  disabled={saving} 
                  className="flex-1 btn-primary-gradient h-11 rounded-xl"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : step < TOTAL_CONFIG_STEPS ? (
                    <>
                      Continuar
                      <ArrowRight className="ml-2 h-4 w-4" />
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
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
