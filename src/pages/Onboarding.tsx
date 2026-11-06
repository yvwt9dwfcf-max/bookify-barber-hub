import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase, DAY_NAMES } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeInput } from '@/components/ui/TimeInput';
import { Switch } from '@/components/ui/switch';
import {
  Loader2, ArrowLeft, ArrowRight, Check, Scissors, Sparkles, Hand, Flower2, HeartPulse,
  PenTool, PawPrint, Car, Briefcase, UserRound, ShieldCheck, Users, Headset, Plus, Trash2, PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { SEGMENTS, type BusinessSegment } from '@/lib/segments';
import { getSteps, operationModeFor, type Management, type OnboardingStep } from '@/lib/onboardingFlow';
import { cn } from '@/lib/utils';

interface DayConfig { day_of_week: number; is_open: boolean; start_time: string; end_time: string }
interface ServiceDraft { name: string; price: string; duration: string }
interface PersonDraft { name: string; email: string; password: string }

interface Draft {
  ownerName: string; businessName: string; segment: BusinessSegment | null;
  ownerAttends: boolean | null; management: Management | null;
  receptionNow: boolean; reception: PersonDraft; team: PersonDraft[];
  services: ServiceDraft[]; servicesSegment: BusinessSegment | null; days: DayConfig[];
  stepId: OnboardingStep;
}

const defaultDays: DayConfig[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  day_of_week: d, is_open: d !== 0, start_time: '09:00', end_time: d === 6 ? '14:00' : '18:00',
}));

const emptyPerson: PersonDraft = { name: '', email: '', password: '' };

const SEGMENT_META: Record<BusinessSegment, { icon: typeof Scissors; desc: string }> = {
  barbershop: { icon: Scissors, desc: 'Cortes, barba e cuidados' },
  salon: { icon: Sparkles, desc: 'Cabelo, escova e coloração' },
  nails: { icon: Hand, desc: 'Mãos, pés e alongamento' },
  aesthetics: { icon: Flower2, desc: 'Pele, sobrancelha e cílios' },
  massage: { icon: HeartPulse, desc: 'Clínicas, terapias e saúde' },
  tattoo: { icon: PenTool, desc: 'Sessões e piercing' },
  petshop: { icon: PawPrint, desc: 'Banho e tosa' },
  automotive: { icon: Car, desc: 'Lavagem, polimento e oficina' },
  other: { icon: Briefcase, desc: 'Qualquer negócio com horário marcado' },
};

const STEP_TITLES: Record<OnboardingStep, { title: string; text?: string }> = {
  business: { title: 'Vamos configurar seu negócio.', text: 'Responda algumas perguntas rápidas para preparar seu ambiente no Bookify.' },
  segment: { title: 'Em qual segmento você atua?', text: 'Isso adapta os termos e as sugestões para o seu tipo de negócio.' },
  owner: { title: 'Você também atende clientes?' },
  management: { title: 'Quem cuida dos agendamentos?', text: 'Isso define como as comandas serão fechadas.' },
  reception: { title: 'Vamos adicionar sua recepcionista?', text: 'Ela terá acesso próprio para organizar agenda, clientes e caixa do dia.' },
  team: { title: 'Quer adicionar sua equipe?', text: 'Cada pessoa terá sua própria conta. Você pode fazer isso depois.' },
  services: { title: 'Quais serviços você oferece?', text: 'Comece com o essencial. Você pode adicionar outros depois.' },
  hours: { title: 'Qual é o horário de funcionamento?', text: 'Horário geral do negócio. A disponibilidade de cada pessoa é ajustada depois.' },
  review: { title: 'Seu negócio está quase pronto!', text: 'Confira e toque em qualquer item para editar.' },
};

const fromSuggestions = (seg: BusinessSegment): ServiceDraft[] => {
  const list = SEGMENTS[seg].suggestedServices;
  return (list.length ? list : [{ name: '', duration: 30, price: 0 }]).map((s) => ({
    name: s.name, price: s.price ? String(s.price) : '', duration: String(s.duration),
  }));
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { barber, loading: barberLoading, refetch: refetchBarber } = useBarber();
  const { barbershop, loading: roleLoading, refetch: refetchRole } = useUserRole();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const storageKey = user ? `bookify-onboarding-${user.id}` : null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [setupAttempts, setSetupAttempts] = useState(0);

  useEffect(() => { if (!authLoading && !user) navigate('/', { replace: true }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && barbershop?.onboarding_completed && !done) {
      sessionStorage.removeItem('bookify-auth-destination');
      navigate('/painel', { replace: true });
    }
  }, [barbershop, roleLoading, navigate, done]);

  useEffect(() => {
    if (authLoading || !user || barberLoading || roleLoading || (barber && barbershop) || setupAttempts >= 12) return;
    const t = window.setTimeout(async () => {
      await Promise.all([refetchBarber(), refetchRole()]);
      setSetupAttempts((c) => c + 1);
    }, 500);
    return () => window.clearTimeout(t);
  }, [authLoading, user, barberLoading, roleLoading, barber, barbershop, setupAttempts, refetchBarber, refetchRole]);

  // Restaura rascunho salvo + dados já gravados no negócio.
  useEffect(() => {
    if (draft || !storageKey || !barber || !barbershop) return;
    let saved: Partial<Draft> = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { /* rascunho inválido */ }
    const b = barbershop as any;
    setDraft({
      ownerName: barber.name === 'Profissional' ? '' : barber.name,
      businessName: b.name === 'Meu Negócio' ? '' : b.name,
      segment: null, ownerAttends: null, management: null,
      receptionNow: true, reception: { ...emptyPerson }, team: [],
      services: [], servicesSegment: null, days: defaultDays, stepId: 'business',
      ...saved,
    } as Draft);
  }, [draft, storageKey, barber, barbershop]);

  useEffect(() => {
    if (!draft || !storageKey) return;
    // Senhas nunca ficam salvas no aparelho.
    const safe = { ...draft, reception: { ...draft.reception, password: '' }, team: draft.team.map((p) => ({ ...p, password: '' })) };
    try { localStorage.setItem(storageKey, JSON.stringify(safe)); } catch { /* armazenamento indisponível */ }
  }, [draft, storageKey]);

  const set = useCallback((patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d)), []);

  const steps = useMemo(() => getSteps({ management: draft?.management ?? 'self' }), [draft?.management]);
  const stepId = draft && steps.includes(draft.stepId) ? draft.stepId : 'business';
  const index = steps.indexOf(stepId);

  const persistShop = async (patch: Record<string, unknown>) => {
    if (!barbershop) return;
    await supabase.from('barbershops').update(patch as never).eq('id', barbershop.id);
  };

  const validate = (): string | null => {
    if (!draft) return 'Carregando';
    switch (stepId) {
      case 'business':
        if (!draft.ownerName.trim()) return 'Digite seu nome';
        if (!draft.businessName.trim()) return 'Digite o nome do negócio';
        return null;
      case 'segment': return draft.segment ? null : 'Escolha um segmento';
      case 'owner': return draft.ownerAttends === null ? 'Escolha uma opção' : null;
      case 'management': return draft.management ? null : 'Escolha uma opção';
      case 'reception':
        if (!draft.receptionNow) return null;
        if (!draft.reception.name.trim() || !isEmail(draft.reception.email)) return 'Informe nome e email válidos';
        if (draft.reception.password.length < 6) return 'A senha precisa de pelo menos 6 caracteres';
        return null;
      case 'team':
        for (const p of draft.team) {
          if (!p.name.trim() || !isEmail(p.email) || p.password.length < 6) return 'Complete nome, email e senha (6+) de cada pessoa ou remova';
        }
        if (draft.ownerAttends === false && draft.team.length === 0) return null;
        return null;
      case 'services': {
        const valid = draft.services.filter((s) => s.name.trim());
        if (!valid.length) return 'Adicione pelo menos um serviço';
        if (valid.some((s) => !(Number(s.duration) >= 15))) return 'A duração mínima é de 15 minutos';
        return null;
      }
      case 'hours':
        if (!draft.days.some((d) => d.is_open)) return 'Abra pelo menos um dia';
        if (draft.days.some((d) => d.is_open && d.end_time <= d.start_time)) return 'O fechamento deve ser depois da abertura';
        return null;
      default: return null;
    }
  };

  const goTo = (target: OnboardingStep, direction: number) => { setDir(direction); set({ stepId: target }); };

  const next = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!draft) return;
    if (stepId === 'business') {
      await persistShop({ name: draft.businessName.trim() });
      if (barber) await supabase.from('barbers').update({ name: draft.ownerName.trim() }).eq('id', barber.id);
    }
    if (stepId === 'segment' && draft.segment) {
      await persistShop({ business_segment: draft.segment });
      if (draft.servicesSegment !== draft.segment) set({ services: fromSuggestions(draft.segment), servicesSegment: draft.segment });
    }
    if (stepId === 'owner') await persistShop({ owner_attends: draft.ownerAttends });
    if (stepId === 'management' && draft.management) await persistShop({ operation_mode: operationModeFor(draft.management) });
    goTo(steps[index + 1], 1);
  };

  const back = () => { if (index > 0) goTo(steps[index - 1], -1); };

  const finish = async () => {
    if (!draft || !barber || !barbershop) return;
    setSaving(true);
    const warnings: string[] = [];
    try {
      const { error: hDel } = await supabase.from('opening_hours').delete().eq('barber_id', barber.id);
      if (hDel) throw hDel;
      const { error: hIns } = await supabase.from('opening_hours').insert(draft.days.map((d) => ({
        barber_id: barber.id, barbershop_id: barbershop.id, day_of_week: d.day_of_week,
        start_time: d.start_time, end_time: d.end_time, is_open: d.is_open,
      })));
      if (hIns) throw hIns;

      const { data: existing } = await supabase.from('services').select('name').eq('barbershop_id', barbershop.id);
      const have = new Set((existing ?? []).map((s) => s.name.trim().toLowerCase()));
      const toAdd = draft.services.filter((s) => s.name.trim() && !have.has(s.name.trim().toLowerCase()));
      if (toAdd.length) {
        const { error } = await supabase.from('services').insert(toAdd.map((s) => ({
          barber_id: barber.id, barbershop_id: barbershop.id, name: s.name.trim(),
          price: Number(s.price) || 0, duration_minutes: Number(s.duration) || 30, active: true, is_global: true,
        })));
        if (error) throw error;
      }

      // Dono gestor não aparece na agenda como profissional.
      await supabase.from('barbers').update({ is_active: draft.ownerAttends !== false }).eq('id', barber.id);

      const { data: { session } } = await supabase.auth.getSession();
      for (const p of draft.team) {
        try {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-barber`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            body: JSON.stringify({ name: p.name.trim(), email: p.email.trim(), password: p.password, barbershop_id: barbershop.id }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || body?.error) warnings.push(`${p.name}: ${body?.error ?? 'não foi possível criar'}`);
        } catch { warnings.push(`${p.name}: não foi possível criar`); }
      }

      if (draft.management === 'reception' && draft.receptionNow) {
        const { data, error } = await supabase.functions.invoke('manage-receptionist', {
          body: { action: 'create', barbershop_id: barbershop.id, name: draft.reception.name.trim(), email: draft.reception.email.trim(), password: draft.reception.password },
        });
        if (error || data?.error) warnings.push(`Recepção: ${data?.error ?? 'não foi possível criar'}`);
      }

      const { error: fin } = await supabase.from('barbershops').update({
        onboarding_completed: true, operation_mode: operationModeFor(draft.management ?? 'self'),
        owner_attends: draft.ownerAttends !== false, business_segment: draft.segment ?? 'other',
      } as never).eq('id', barbershop.id);
      if (fin) throw fin;

      if (storageKey) localStorage.removeItem(storageKey);
      sessionStorage.removeItem('bookify-auth-destination');
      warnings.forEach((w) => toast.error(`${w}. Você pode tentar de novo em Equipe ou Configurações.`));
      setDone(true);
      await Promise.all([refetchBarber(), refetchRole()]);
      window.setTimeout(() => navigate('/painel', { replace: true }), 1600);
    } catch (e) {
      console.error('Erro ao concluir configuração:', e);
      toast.error('Não foi possível concluir. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || barberLoading || roleLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) return null;
  if (!barber || !barbershop || !draft) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
        <div className="max-w-sm space-y-4 text-center">
          {setupAttempts < 12 ? (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <h1 className="font-semibold text-foreground">Preparando sua conta</h1>
              <p className="text-sm text-muted-foreground">Isso leva só alguns segundos.</p>
            </>
          ) : (
            <>
              <h1 className="font-semibold text-foreground">Não foi possível preparar sua conta</h1>
              <Button onClick={() => setSetupAttempts(0)} className="w-full">Tentar novamente</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} className="max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary"><PartyPopper className="h-8 w-8" /></div>
          <h1 className="text-2xl font-semibold text-foreground">Tudo pronto!</h1>
          <p className="text-sm text-muted-foreground">Seu negócio já pode começar a usar o Bookify.</p>
        </motion.div>
      </div>
    );
  }

  const meta = STEP_TITLES[stepId];
  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 28 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -28 }),
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <header className="mx-auto w-full max-w-lg shrink-0 px-5 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="flex h-12 items-center justify-between">
          <button type="button" onClick={back} disabled={index === 0} aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground transition active:scale-95 disabled:opacity-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Logo size="sm" linkTo={undefined} />
          <span className="w-11 text-right text-xs tabular-nums text-muted-foreground">{index + 1}/{steps.length}</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary" aria-label={`Etapa ${index + 1} de ${steps.length}`}>
          <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${((index + 1) / steps.length) * 100}%` }} transition={{ duration: reduce ? 0 : 0.3 }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Etapa {index + 1} de {steps.length}</p>
      </header>

      <main className="relative mx-auto w-full max-w-lg flex-1 overflow-y-auto overscroll-contain px-5">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={stepId} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: reduce ? 0 : 0.24, ease: 'easeOut' }} className="pb-6 pt-4">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground">{meta.title}</h1>
            {meta.text && <p className="mt-2 text-sm text-muted-foreground">{meta.text}</p>}
            <div className="mt-6">{renderStep()}</div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mx-auto w-full max-w-lg shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
        {stepId === 'review' ? (
          <Button onClick={finish} disabled={saving} className="btn-primary-solid h-[52px] w-full rounded-xl text-base">
            {saving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Concluindo…</> : <><Check className="mr-2 h-5 w-5" />Concluir configuração</>}
          </Button>
        ) : (
          <Button onClick={next} className="btn-primary-solid h-[52px] w-full rounded-xl text-base">
            Continuar<ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </footer>
    </div>
  );

  function renderStep() {
    const d = draft!;
    switch (stepId) {
      case 'business':
        return (
          <div className="space-y-5">
            <Field label="Seu nome"><Input value={d.ownerName} onChange={(e) => set({ ownerName: e.target.value })} placeholder="Ex.: Ana Souza" className="h-12 rounded-xl" autoComplete="name" /></Field>
            <Field label="Nome do negócio"><Input value={d.businessName} onChange={(e) => set({ businessName: e.target.value })} placeholder="Ex.: Studio Bella" className="h-12 rounded-xl" /></Field>
          </div>
        );
      case 'segment':
        return (
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(SEGMENTS) as BusinessSegment[]).map((key) => {
              const M = SEGMENT_META[key];
              return (
                <ChoiceCard key={key} selected={d.segment === key} onClick={() => set({ segment: key })} compact>
                  <M.icon className="h-6 w-6 text-primary" />
                  <p className="mt-3 text-sm font-semibold leading-tight text-foreground">{SEGMENTS[key].label}</p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{M.desc}</p>
                </ChoiceCard>
              );
            })}
          </div>
        );
      case 'owner':
        return (
          <div className="space-y-3">
            <ChoiceCard selected={d.ownerAttends === true} onClick={() => set({ ownerAttends: true })}>
              <Row icon={UserRound} title="Sim, eu também atendo" text="Você administra e aparece na agenda como profissional." />
            </ChoiceCard>
            <ChoiceCard selected={d.ownerAttends === false} onClick={() => set({ ownerAttends: false })}>
              <Row icon={ShieldCheck} title="Não, apenas administro" text="Você gerencia tudo, sem ocupar horários na agenda nem vaga do plano." />
            </ChoiceCard>
          </div>
        );
      case 'management':
        return (
          <div className="space-y-3">
            <ChoiceCard selected={d.management === 'reception'} onClick={() => set({ management: 'reception' })}>
              <Row icon={Headset} title="Tenho recepcionista" badge="Recomendado" text="Ela organiza a agenda e fecha as comandas no caixa central." />
            </ChoiceCard>
            <ChoiceCard selected={d.management === 'self'} onClick={() => set({ management: 'self' })}>
              <Row icon={UserRound} title="Eu mesmo administro" text="Cada profissional fecha a própria comanda pelo celular." />
            </ChoiceCard>
            <ChoiceCard selected={d.management === 'team'} onClick={() => set({ management: 'team' })}>
              <Row icon={Users} title="A equipe também administra" text="Profissionais organizam os próprios horários e comandas." />
            </ChoiceCard>
          </div>
        );
      case 'reception':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
              {[true, false].map((v) => (
                <button key={String(v)} type="button" onClick={() => set({ receptionNow: v })}
                  className={cn('h-11 rounded-lg text-sm font-medium transition', d.receptionNow === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
                  {v ? 'Adicionar agora' : 'Fazer depois'}
                </button>
              ))}
            </div>
            {d.receptionNow ? (
              <PersonFields person={d.reception} onChange={(p) => set({ reception: p })} />
            ) : (
              <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Sem problema. Depois é só ir em <span className="font-medium text-foreground">Configurações → Recepção</span> e tocar em adicionar.</p>
            )}
            {d.receptionNow && <p className="text-xs text-muted-foreground">Ela entra com esse email e senha e pode trocar a senha depois. Não consome vaga de profissional.</p>}
          </div>
        );
      case 'team':
        return (
          <div className="space-y-4">
            {d.team.map((p, i) => (
              <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Profissional {i + 1}</p>
                  <button type="button" aria-label="Remover" onClick={() => set({ team: d.team.filter((_, j) => j !== i) })} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground active:scale-95"><Trash2 className="h-4 w-4" /></button>
                </div>
                <PersonFields person={p} onChange={(np) => set({ team: d.team.map((x, j) => (j === i ? np : x)) })} />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => set({ team: [...d.team, { ...emptyPerson }] })} className="h-12 w-full rounded-xl border-dashed">
              <Plus className="mr-2 h-4 w-4" />Adicionar profissional
            </Button>
            {d.team.length === 0 && <p className="text-center text-xs text-muted-foreground">Opcional — toque em continuar para pular.</p>}
          </div>
        );
      case 'services':
        return (
          <div className="space-y-3">
            {d.services.map((s, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Input value={s.name} onChange={(e) => set({ services: d.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="Nome do serviço" className="h-11 flex-1 rounded-xl" />
                  <button type="button" aria-label="Remover serviço" onClick={() => set({ services: d.services.filter((_, j) => j !== i) })} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground active:scale-95"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Field label="Preço (R$)" small><Input inputMode="decimal" value={s.price} onChange={(e) => set({ services: d.services.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d.,]/g, '').replace(',', '.') } : x)) })} placeholder="0" className="h-11 rounded-xl" /></Field>
                  <Field label="Duração (min)" small><Input inputMode="numeric" value={s.duration} onChange={(e) => set({ services: d.services.map((x, j) => (j === i ? { ...x, duration: e.target.value.replace(/\D/g, '') } : x)) })} placeholder="30" className="h-11 rounded-xl" /></Field>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => set({ services: [...d.services, { name: '', price: '', duration: '30' }] })} className="h-12 w-full rounded-xl border-dashed">
              <Plus className="mr-2 h-4 w-4" />Adicionar serviço
            </Button>
          </div>
        );
      case 'hours':
        return (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {d.days.map((day) => {
              const upd = (patch: Partial<DayConfig>) => set({ days: d.days.map((x) => (x.day_of_week === day.day_of_week ? { ...x, ...patch } : x)) });
              return (
                <div key={day.day_of_week} className="flex min-h-[56px] items-center gap-3 px-4 py-2">
                  <Switch checked={day.is_open} onCheckedChange={(v) => upd({ is_open: v })} aria-label={DAY_NAMES[day.day_of_week]} />
                  <span className="w-16 text-sm font-medium">{DAY_NAMES[day.day_of_week].slice(0, 3)}</span>
                  {day.is_open ? (
                    <div className="ml-auto flex items-center gap-1.5">
                      <TimeInput value={day.start_time} onChange={(v) => upd({ start_time: v })} className="h-10 w-[72px] rounded-lg text-center tabular-nums" />
                      <span className="text-muted-foreground">–</span>
                      <TimeInput value={day.end_time} onChange={(v) => upd({ end_time: v })} className="h-10 w-[72px] rounded-lg text-center tabular-nums" />
                    </div>
                  ) : <span className="ml-auto text-sm text-muted-foreground">Fechado</span>}
                </div>
              );
            })}
          </div>
        );
      case 'review': {
        const openDays = d.days.filter((x) => x.is_open);
        const items: { label: string; value: string; step: OnboardingStep }[] = [
          { label: 'Negócio', value: d.businessName, step: 'business' },
          { label: 'Segmento', value: d.segment ? SEGMENTS[d.segment].label : '—', step: 'segment' },
          { label: 'Você', value: d.ownerAttends ? 'Administra e atende' : 'Apenas administra', step: 'owner' },
          { label: 'Operação', value: d.management === 'reception' ? 'Com recepção' : d.management === 'team' ? 'Equipe administra' : 'Você administra', step: 'management' },
          ...(d.management === 'reception' ? [{ label: 'Recepcionista', value: d.receptionNow ? d.reception.name : 'Adicionar depois', step: 'reception' as OnboardingStep }] : []),
          { label: 'Equipe', value: d.team.length ? d.team.map((p) => p.name).join(', ') : 'Nenhum por enquanto', step: 'team' },
          { label: 'Serviços', value: d.services.filter((s) => s.name.trim()).map((s) => s.name).join(', '), step: 'services' },
          { label: 'Horários', value: `${openDays.length} dias abertos`, step: 'hours' },
        ];
        return (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {items.map((it) => (
              <button key={it.label} type="button" onClick={() => goTo(it.step, -1)} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition active:bg-secondary">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{it.label}</span>
                <span className="flex-1 truncate text-sm font-medium text-foreground">{it.value}</span>
                <span className="text-xs text-primary">Editar</span>
              </button>
            ))}
          </div>
        );
      }
    }
  }
};

function Field({ label, children, small }: { label: string; children: React.ReactNode; small?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className={cn('font-medium text-muted-foreground', small ? 'text-[11px]' : 'text-xs')}>{label}</span>
      {children}
    </label>
  );
}

function ChoiceCard({ selected, onClick, children, compact }: { selected: boolean; onClick: () => void; children: React.ReactNode; compact?: boolean }) {
  return (
    <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.97 }} aria-pressed={selected}
      className={cn('relative w-full rounded-2xl border bg-card text-left transition-colors', compact ? 'p-4' : 'p-4',
        selected ? 'border-primary bg-primary/[0.08] ring-1 ring-primary' : 'border-border')}>
      {selected && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </motion.span>
      )}
      {children}
    </motion.button>
  );
}

function Row({ icon: Icon, title, text, badge }: { icon: typeof Scissors; title: string; text: string; badge?: string }) {
  return (
    <div className="flex items-start gap-3 pr-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"><Icon className="h-5 w-5" /></span>
      <div>
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-foreground">{title}{badge && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">{badge}</span>}</p>
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function PersonFields({ person, onChange }: { person: PersonDraft; onChange: (p: PersonDraft) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Nome"><Input value={person.name} onChange={(e) => onChange({ ...person, name: e.target.value })} className="h-12 rounded-xl" /></Field>
      <Field label="Email"><Input type="email" inputMode="email" autoCapitalize="none" value={person.email} onChange={(e) => onChange({ ...person, email: e.target.value })} className="h-12 rounded-xl" /></Field>
      <Field label="Senha de acesso (mín. 6)"><Input type="password" autoComplete="new-password" value={person.password} onChange={(e) => onChange({ ...person, password: e.target.value })} className="h-12 rounded-xl" /></Field>
    </div>
  );
}

export default Onboarding;
