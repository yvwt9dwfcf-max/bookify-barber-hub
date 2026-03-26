import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, 
  Sparkles, 
  Timer, 
  User, 
  SlidersHorizontal, 
  LogOut, 
  Menu,
  X,
  CalendarX2,
  UsersRound,
  Crown,
  MessageCircle,
  PieChart,
  Share2,
  Percent,
  Stamp,
  Contact,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDayClosing } from '@/hooks/useDayClosing';
import DayClosingModal from '@/components/painel/DayClosingModal';
import AppTutorial from '@/components/painel/AppTutorial';

const Painel = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { barber, loading: barberLoading } = useBarber();
  const { barbershop, isMaster, loading: roleLoading, refetch: refetchRole } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Show tutorial for new accounts after onboarding
  useEffect(() => {
    if (!roleLoading && barbershop?.onboarding_completed && !(barbershop as any).tutorial_completed) {
      setShowTutorial(true);
    }
  }, [roleLoading, barbershop]);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
  }, []);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [sidebarOpen]);

  const {
    showModal: showDayClosing,
    pendingAppointments,
    isPastDays,
    handleClose: closeDayClosing,
    handleCompleted: completedDayClosing,
  } = useDayClosing({
    barbershopId: barbershop?.id,
    barberId: barber?.id,
  });

  // Build menu items based on role
  const menuItems = [
    { icon: CalendarDays, label: 'Agenda', path: '/painel' },
    { icon: Sparkles, label: 'Serviços', path: '/painel/servicos' },
    { icon: Timer, label: 'Horários', path: '/painel/horarios' },
    { icon: CalendarX2, label: 'Bloqueios', path: '/painel/bloqueios' },
    ...(isMaster ? [{ icon: UsersRound, label: 'Equipe', path: '/painel/barbeiros' }] : []),
    { icon: PieChart, label: 'Relatórios', path: '/painel/relatorios' },
    ...(isMaster ? [{ icon: Contact, label: 'Clientes', path: '/painel/clientes' }] : []),
    ...(isMaster ? [{ icon: Percent, label: 'Comissões', path: '/painel/comissoes' }] : []),
    { icon: Stamp, label: 'Fidelidade', path: '/painel/fidelidade' },
    
    { icon: MessageCircle, label: 'WhatsApp', path: '/painel/whatsapp' },
    ...(isMaster ? [{ icon: Share2, label: 'Perfil Público', path: '/painel/perfil-publico' }] : []),
    { icon: SlidersHorizontal, label: 'Configurações', path: '/painel/configuracoes' },
  ];

  // Check onboarding status using the flag
  const onboardingChecked = !roleLoading && barbershop?.onboarding_completed === true;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Check subscription status - redirect if expired
  useEffect(() => {
    if (!roleLoading && barbershop) {
      // Auto-expire trial
      if (
        barbershop.subscription_status === 'trial' &&
        barbershop.trial_ends_at &&
        new Date(barbershop.trial_ends_at) <= new Date()
      ) {
        // Update status in DB
        supabase
          .from('barbershops')
          .update({ subscription_status: 'expired', subscription_active: false })
          .eq('id', barbershop.id)
          .then(() => {
            navigate('/trial-expirado', { replace: true });
          });
        return;
      }

      if (barbershop.subscription_status === 'expired') {
        navigate('/trial-expirado', { replace: true });
        return;
      }

      if (!barbershop.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [barbershop, roleLoading, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  if (authLoading || barberLoading || roleLoading || !onboardingChecked) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Skeleton sidebar - desktop */}
        <aside className="hidden lg:block w-[270px] bg-sidebar border-r border-sidebar-border p-6 space-y-6">
          <div className="h-8 w-28 rounded-lg bg-muted/50 animate-pulse" />
          <div className="flex items-center gap-3 pt-2">
            <div className="w-10 h-10 rounded-xl bg-muted/50 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-muted/50 animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 pt-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl">
                <div className="w-5 h-5 rounded bg-muted/40 animate-pulse" />
                <div className="h-4 rounded bg-muted/40 animate-pulse" style={{ width: `${60 + Math.random() * 40}%`, animationDelay: `${i * 0.08}s` }} />
              </div>
            ))}
          </div>
        </aside>
        {/* Skeleton main content */}
        <main className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8 space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-muted/50 animate-pulse" />
            <div className="h-4 w-72 rounded bg-muted/30 animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-3" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="h-8 w-8 rounded-xl bg-muted/50 animate-pulse" />
                <div className="h-6 w-12 rounded bg-muted/50 animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted/30 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/20 bg-card/40">
                <div className="w-14 h-5 rounded bg-muted/50 animate-pulse" style={{ animationDelay: `${i * 0.06}s` }} />
                <div className="w-px h-6 bg-border/20" />
                <div className="flex-1 h-4 rounded bg-muted/30 animate-pulse" style={{ animationDelay: `${i * 0.06}s` }} />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 px-3 py-2 flex items-center justify-between">
        <Logo size="sm" linkTo="/painel" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-9 w-9 rounded-xl"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5 transition-transform duration-200 active:rotate-90" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpen(false)}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[270px] bg-sidebar text-sidebar-foreground shadow-2xl',
          'lg:translate-x-0 lg:shadow-xl',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-sidebar-border">
            <Logo size="md" linkTo="/painel" />
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              {barbershop?.photo_url ? (
                <img src={barbershop.photo_url} alt={barbershop.name} className="w-10 h-10 rounded-xl object-cover" />
              ) : barber?.photo_url ? (
                <img src={barber.photo_url} alt={barber.name} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-gradient)' }}>
                  {isMaster ? <Crown className="h-5 w-5 text-primary-foreground" /> : <User className="h-5 w-5 text-primary-foreground" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{barber?.name || 'Barbeiro'}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {isMaster ? 'Administrador' : 'Barbeiro'}
                </p>
              </div>
            </div>
            {barbershop && (
              <div className="mt-3">
                <Badge variant="outline" className="text-xs border-sidebar-border text-sidebar-foreground/70">
                  {barbershop.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Navigation with scroll indicator */}
          <div className="flex-1 relative overflow-hidden">
            <nav className="h-full p-3 space-y-1 overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }}>
              {menuItems.map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold sidebar-active-indicator'
                        : 'hover:bg-secondary active:scale-[0.98] text-sidebar-foreground/70 hover:text-sidebar-foreground'
                    )}
                    style={{
                      animationDelay: sidebarOpen ? `${index * 0.05}s` : '0s',
                      animation: sidebarOpen ? 'fade-in 0.3s ease-out backwards' : 'none'
                    }}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 transition-all duration-200 ease-out",
                      isActive
                        ? "text-primary scale-110"
                        : "group-hover:scale-125 group-hover:-rotate-6 group-active:scale-95"
                    )} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            {/* Bottom fade indicator for scroll */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-sidebar to-transparent" />
          </div>

          {/* Logout Button */}
          <div className="p-3 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-[270px] pt-14 lg:pt-0 min-h-screen">
        <div className="p-3 md:p-5 lg:p-8 max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
            >
              <Outlet context={{ barber, barbershop, isMaster, refetchRole }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Tutorial for new accounts */}
      {showTutorial && barbershop && (
        <AppTutorial
          barbershopId={barbershop.id}
          onComplete={handleTutorialComplete}
        />
      )}

      {/* Day Closing Modal */}
      <DayClosingModal
        open={showDayClosing}
        onClose={closeDayClosing}
        pendingAppointments={pendingAppointments}
        isPastDays={isPastDays}
        onCompleted={completedDayClosing}
      />
    </div>
  );
};

export default Painel;
