import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

interface LoginProps {
  initialTab?: 'login' | 'signup';
}

const Login = ({ initialTab = 'login' }: LoginProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { user, loading: authLoading } = useAuth();
  const { barbershop, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      const destination = sessionStorage.getItem('bookify-auth-destination');
      if (destination === 'onboarding') {
        navigate('/onboarding', { replace: true });
        return;
      }

      if (!roleLoading && barbershop) {
        navigate(barbershop.onboarding_completed ? '/painel' : '/onboarding', { replace: true });
      }
    }
  }, [user, authLoading, roleLoading, barbershop, navigate]);

  if (authLoading || (!!user && roleLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:py-14">
        <div className="w-full max-w-[420px] space-y-9 animate-fade-in">
          <h1 className="sr-only">Acesse sua conta no Bookify</h1>
          <div className="text-center">
            <a href="/" className="font-display text-3xl font-bold text-foreground" aria-label="Bookify — página inicial">Bookify</a>
          </div>

          <section className="border-y border-border py-7 sm:px-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
                <TabsList className="mb-8 grid h-10 w-full grid-cols-2 rounded-none border-b border-border bg-transparent p-0">
                  <TabsTrigger value="login" className="h-full rounded-none border-b border-transparent bg-transparent font-editorial-mono text-[11px] uppercase text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">Entrar</TabsTrigger>
                  <TabsTrigger value="signup" className="h-full rounded-none border-b border-transparent bg-transparent font-editorial-mono text-[11px] uppercase text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <LoginForm />
                </TabsContent>

                <TabsContent value="signup">
                  <SignupForm />
                </TabsContent>
              </Tabs>
          </section>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bookify. Todos os direitos reservados.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
