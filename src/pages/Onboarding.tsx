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
import { 
  Loader2, CircleCheck as CheckCircle, ArrowRight, ArrowLeft
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

const stepTitles = ['Seus dados e barbearia', 'Dias de Atendimento', 'Horários de Funcionamento', 'Intervalos / Almoço'];
const stepDescriptions = [
  'Informações básicas para começar',
  'Selecione os dias em que você atende',
  'Configure o horário de cada dia',
  'Configure os intervalos de cada dia (opcional)',
];

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { barber, loading: barberLoading, refetch: refetchBarber } = useBarber();
  const { barbershop, loading: roleLoading, refetch: refetchRole } = useUserRole();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [setupAttempts, setSetupAttempts] = useState(0);

  // Step 1: Personal info + Barbershop
  const [barberName, setBarberName] = useState('');
  const [barbershopName, setBarbershopName] = useState('');
  const [barbershopPhone, setBarbershopPhone] = useState('');

  // Step 2 & 3: Days and hours
  const [days, setDays] = useState<DayConfig[]>(defaultDays);

  // Step 4: Closing time
  const [closingTime, setClosingTime] = useState<string>('');

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
        sessionStorage.removeItem('bookify-auth-destination');
        navigate('/painel', { replace: true });
      }
    }
  }, [barbershop, roleLoading, navigate]);

  // The account trigger may finish a moment after Supabase returns the new session.
  useEffect(() => {
    if (authLoading || !user || barberLoading || roleLoading || (barber && barbershop) || setupAttempts >= 12) return;

    const timer = window.setTimeout(async () => {
      await Promise.all([refetchBarber(), refetchRole()]);
      setSetupAttempts((current) => current + 1);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [authLoading, user, barberLoading, roleLoading, barber, barbershop, setupAttempts, refetchBarber, refetchRole]);

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
        const { error: barberError } = await supabase
          .from('barbers')
          .update({ name: barberName.trim() })
          .eq('id', barber.id);
        if (barberError) throw barberError;
      }

      if (barbershop) {
        const { error: shopError } = await supabase
          .from('barbershops')
          .update({ 
            name: barbershopName.trim(),
            phone: barbershopPhone.trim() || null,
          })
          .eq('id', barbershop.id);
        if (shopError) throw shopError;
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
      const { error: deleteHoursError } = await supabase
        .from('opening_hours')
        .delete()
        .eq('barber_id', barber.id);
      if (deleteHoursError) throw deleteHoursError;

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
        .update({ onboarding_completed: true, closing_time: closingTime || null } as any)
        .eq('id', barbershop.id);

      if (updateError) throw updateError;

      await Promise.all([refetchBarber(), refetchRole()]);
      sessionStorage.removeItem('bookify-auth-destination');
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

  if (!barber || !barbershop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          {setupAttempts < 12 ? (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <div>
                <h1 className="font-semibold text-foreground">Preparando sua conta</h1>
                <p className="mt-1 text-sm text-muted-foreground">Estamos configurando sua barbearia. Isso leva só alguns segundos.</p>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-semibold text-foreground">Não foi possível preparar sua conta</h1>
              <p className="text-sm text-muted-foreground">Tente novamente para concluir a configuração.</p>
              <Button onClick={() => setSetupAttempts(0)} className="w-full">Tentar novamente</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg space-y-7 animate-fade-in">
          {/* Logo */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" linkTo={undefined} />
            </div>
            <h1 className="font-display text-3xl font-semibold">Configure sua barbearia</h1>
            <p className="mt-2 font-editorial-mono text-[10px] uppercase text-muted-foreground">Uma configuração simples, passo a passo</p>
          </div>

          {/* Progress */}
          <div className="flex gap-2" aria-label={`Passo ${step} de ${TOTAL_STEPS}`}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 transition-colors duration-300 ${i < step ? 'bg-primary' : 'bg-border'}`}
              >
              </div>
            ))}
          </div>

          {/* Step Card */}
          <section className="animate-fade-in rounded-[14px] border border-border bg-[hsl(var(--editorial-surface))] p-5 sm:p-7" key={step}>
            <header className="mb-7 space-y-2">
              <p className="font-editorial-mono text-[11px] uppercase text-[hsl(var(--bordeaux))]">Passo {String(step).padStart(2, '0')}</p>
              <h2 className="font-display text-2xl font-semibold text-foreground">{stepTitles[step - 1]}</h2>
              <p className="text-sm text-muted-foreground">{stepDescriptions[step - 1]}</p>
            </header>
            <div className="space-y-5">
              {/* Step 1: Personal Info + Barbershop */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="barber-name">Seu nome *</Label>
                    <div>
                      <Input
                        id="barber-name"
                        placeholder="Seu nome completo"
                        value={barberName}
                        onChange={(e) => setBarberName(e.target.value)}
                        className="h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-name">Nome da barbearia *</Label>
                    <div>
                      <Input
                        id="barbershop-name"
                        placeholder="Ex: Barbearia do João"
                        value={barbershopName}
                        onChange={(e) => setBarbershopName(e.target.value)}
                        className="h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-phone">Telefone da barbearia</Label>
                    <div>
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
                        className="h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0"
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
                       className={`flex items-center justify-between border-b py-3.5 transition-colors duration-200 ${
                        day.is_open 
                           ? 'border-primary/30' 
                           : 'border-border'
                      }`}
                    >
                      <span className="font-medium text-sm">{DAY_NAMES[day.day_of_week]}</span>
                      <Switch
                        checked={day.is_open}
                        onCheckedChange={(checked) => updateDay(day.day_of_week, 'is_open', checked)}
                        className="h-5 w-9 border-0 data-[state=unchecked]:bg-muted [&>span]:h-4 [&>span]:w-4 [&>span]:bg-foreground [&>span]:data-[state=checked]:translate-x-4"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3: Hours */}
              {step === 3 && (
                <div className="space-y-3">
                  {days.filter(d => d.is_open).map(day => (
                    <div key={day.day_of_week} className="space-y-3 border-b border-border py-3.5">
                      <p className="font-medium text-sm">{DAY_NAMES[day.day_of_week]}</p>
                      <div className="flex items-center gap-2">
                         <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Início</Label>
                          <TimeInput
                            value={day.start_time}
                            onChange={(val) => updateDay(day.day_of_week, 'start_time', val)}
                            className="h-11 w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent font-editorial-mono text-lg tracking-normal shadow-none focus-visible:border-primary focus-visible:ring-0"
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">—</span>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Fim</Label>
                          <TimeInput
                            value={day.end_time}
                            onChange={(val) => updateDay(day.day_of_week, 'end_time', val)}
                            className="h-11 w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent font-editorial-mono text-lg tracking-normal shadow-none focus-visible:border-primary focus-visible:ring-0"
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
                    <div key={day.day_of_week} className="space-y-3 border-b border-border py-3.5">
                      <p className="font-medium text-sm">{DAY_NAMES[day.day_of_week]}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Intervalo início</Label>
                          <TimeInput
                            value={day.break_start}
                            onChange={(val) => updateDay(day.day_of_week, 'break_start', val)}
                            className="h-11 w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent font-editorial-mono text-lg tracking-normal shadow-none focus-visible:border-primary focus-visible:ring-0"
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">—</span>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Intervalo fim</Label>
                          <TimeInput
                            value={day.break_end}
                            onChange={(val) => updateDay(day.day_of_week, 'break_end', val)}
                            className="h-11 w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent font-editorial-mono text-lg tracking-normal shadow-none focus-visible:border-primary focus-visible:ring-0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="space-y-2 border-t border-border pt-4">
                    <Label className="text-sm font-medium">Encerramento do dia</Label>
                    <p className="text-xs text-muted-foreground">
                      Horário em que o sistema sugere fechar o caixa do dia (opcional).
                    </p>
                    <TimeInput
                      value={closingTime}
                      onChange={setClosingTime}
                      className="h-11 w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent font-editorial-mono text-lg tracking-normal shadow-none focus-visible:border-primary focus-visible:ring-0"
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-2">
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="h-12 flex-1 rounded-lg border-border bg-transparent font-editorial-mono text-xs uppercase">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                )}
                {step < TOTAL_STEPS ? (
                  <Button onClick={handleNext} className="h-12 flex-1 rounded-lg btn-primary-gradient font-editorial-mono text-xs uppercase">
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleFinish} disabled={saving} className="h-12 flex-1 rounded-lg btn-primary-gradient font-editorial-mono text-xs uppercase">
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
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
