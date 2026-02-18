import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Scissors, 
  Clock, 
  User, 
  Settings, 
  LogOut, 
  Menu,
  X,
  CalendarOff,
    Users,
    Crown,
    MessageCircle,
    BarChart3,
    Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useDayClosing } from '@/hooks/useDayClosing';
import DayClosingModal from '@/components/painel/DayClosingModal';

const Painel = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { barber, loading: barberLoading } = useBarber();
  const { barbershop, isMaster, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { icon: Calendar, label: 'Agenda', path: '/painel' },
    { icon: Scissors, label: 'Serviços', path: '/painel/servicos' },
    { icon: Clock, label: 'Horários', path: '/painel/horarios' },
    { icon: CalendarOff, label: 'Bloqueios', path: '/painel/bloqueios' },
    ...(isMaster ? [{ icon: Users, label: 'Equipe', path: '/painel/barbeiros' }] : []),
    ...(isMaster ? [{ icon: BarChart3, label: 'Relatórios', path: '/painel/relatorios' }] : []),
    { icon: MessageCircle, label: 'WhatsApp', path: '/painel/whatsapp' },
    ...(isMaster ? [{ icon: Globe, label: 'Perfil Público', path: '/painel/perfil-publico' }] : []),
    { icon: Settings, label: 'Configurações', path: '/painel/configuracoes' },
  ];

  // Check onboarding status using the flag
  const onboardingChecked = !roleLoading && barbershop?.onboarding_completed === true;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && barbershop && !barbershop.onboarding_completed) {
      navigate('/onboarding', { replace: true });
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
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
              {barber?.photo_url ? (
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

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                    isActive
                      ? 'text-primary-foreground shadow-lg'
                      : 'hover:bg-sidebar-accent active:scale-[0.98] text-sidebar-foreground/80 hover:text-sidebar-foreground'
                  )}
                  style={{
                    background: isActive ? 'var(--primary-gradient)' : undefined,
                    boxShadow: isActive ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none',
                    animationDelay: sidebarOpen ? `${index * 0.05}s` : '0s',
                    animation: sidebarOpen ? 'fade-in 0.3s ease-out backwards' : 'none'
                  }}
                >
                  <item.icon className={cn("h-5 w-5 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

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
      <main className="lg:ml-[270px] pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl">
          <Outlet context={{ barber, barbershop, isMaster }} />
        </div>
      </main>

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
