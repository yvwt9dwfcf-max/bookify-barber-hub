import { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Loader2, Scissors } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

interface LoginProps {
  initialTab?: 'login' | 'signup';
}

const Login = ({ initialTab = 'login' }: LoginProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/painel', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo & Branding */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Logo size="lg" linkTo="/" />
            </div>
            <p className="text-muted-foreground">
              Gerencie sua barbearia de forma simples e profissional
            </p>
          </div>

          {/* Auth Card */}
          <Card className="shadow-card-lg border-border/40 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-gradient)' }}>
                  <Scissors className="h-4 w-4 text-primary-foreground" />
                </div>
                Área do Profissional
              </CardTitle>
              <CardDescription>
                {activeTab === 'login' 
                  ? 'Entre para acessar seu painel' 
                  : 'Crie sua conta para começar'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2 mb-6 h-11 rounded-lg p-1">
                  <TabsTrigger value="login" className="rounded-md text-sm">Entrar</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-md text-sm">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <LoginForm />
                </TabsContent>

                <TabsContent value="signup">
                  <SignupForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bookify. Todos os direitos reservados.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
