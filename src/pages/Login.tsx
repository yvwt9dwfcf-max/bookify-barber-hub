import { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Mail, Lock, Scissors, User } from 'lucide-react';
import { toast } from 'sonner';
import { lovable } from '@/integrations/lovable/index';
import { Checkbox } from '@/components/ui/checkbox';

interface LoginProps {
  initialTab?: 'login' | 'signup';
}

const Login = ({ initialTab = 'login' }: LoginProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async (isSignup = false) => {
    if (isSignup) {
      const selectedPlan = localStorage.getItem('selected_plan');
      if (!selectedPlan) {
        toast.error('Escolha um plano antes de criar sua conta.');
        navigate('/#pricing');
        return;
      }
    }
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error('Erro ao entrar com Google');
      }
    } catch {
      toast.error('Erro ao entrar com Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // If already authenticated, redirect to panel
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/painel', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Login realizado com sucesso!');
        navigate('/painel');
      }
    } catch (err: any) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Você precisa aceitar os Termos de Uso e Política de Privacidade');
      return;
    }

    const selectedPlan = localStorage.getItem('selected_plan');
    if (!selectedPlan) {
      toast.error('Escolha um plano antes de criar sua conta.');
      navigate('/#pricing');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(signupEmail, signupPassword, {
        name: signupName.trim() || undefined,
        selected_plan: selectedPlan,
      });
      if (error) {
        toast.error(error.message);
      } else {
        localStorage.removeItem('selected_plan');
        toast.success('Conta criada com sucesso! Você já pode acessar o painel.');
        navigate('/painel');
      }
    } catch (err: any) {
      toast.error('Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
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

      {/* Main Content */}
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
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 rounded-xl"
                      onClick={() => handleGoogleLogin(false)}
                      disabled={isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      Entrar com Google
                    </Button>

                    <div className="relative">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        ou
                      </span>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="pl-10 h-11"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="pl-10 h-11"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full btn-primary-gradient h-11 rounded-xl"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Entrando...
                          </>
                        ) : (
                          'Entrar'
                        )}
                      </Button>
                      <div className="text-center">
                        <Link
                          to="/esqueci-senha"
                          className="text-sm text-primary hover:underline"
                        >
                          Esqueci minha senha
                        </Link>
                      </div>
                    </form>
                  </div>
                </TabsContent>

                <TabsContent value="signup">
                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 rounded-xl"
                      onClick={() => handleGoogleLogin(true)}
                      disabled={isGoogleLoading}
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      Criar conta com Google
                    </Button>

                    <div className="relative">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        ou
                      </span>
                    </div>

                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="rounded-lg bg-primary/10 text-primary text-sm p-3 text-center font-medium">
                      Teste grátis por 3 dias. Após isso, escolha um plano para continuar.
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Seu nome</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirmar senha *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm"
                          type="password"
                          placeholder="••••••••"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>

                    {/* Terms checkbox */}
                    <div className="flex items-start gap-3 py-2">
                      <Checkbox
                        id="accept-terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                        className="mt-0.5 border-[#ff3b3b] data-[state=checked]:bg-[#ff3b3b] data-[state=checked]:border-[#ff3b3b]"
                      />
                      <label htmlFor="accept-terms" className="text-sm font-semibold cursor-pointer" style={{ color: '#ff3b3b' }}>
                        Li e concordo com os{' '}
                        <Link to="/termos-de-uso" target="_blank" className="underline hover:opacity-80" style={{ color: '#ff0000' }}>
                          Termos de Uso
                        </Link>{' '}
                        e{' '}
                        <Link to="/politica-de-privacidade" target="_blank" className="underline hover:opacity-80" style={{ color: '#ff0000' }}>
                          Política de Privacidade
                        </Link>.
                      </label>
                    </div>

                    {!acceptedTerms && (
                      <p className="text-xs font-semibold text-center" style={{ color: '#ff3b3b' }}>
                        ⚠ É obrigatório aceitar os termos para continuar.
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full btn-primary-gradient h-11 rounded-xl"
                      disabled={isLoading || !acceptedTerms}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        'Criar conta'
                      )}
                    </Button>
                  </form>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bookify. Todos os direitos reservados.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
