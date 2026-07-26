import { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    const resolveRecovery = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(window.location.search);

      // Erro explícito vindo do link (expirado / já usado)
      const errDesc = hash.get('error_description') || query.get('error_description');
      if (errDesc) {
        if (!active) return;
        setLinkError(decodeURIComponent(errDesc));
        setChecking(false);
        return;
      }

      try {
        // 1) Fluxo hash (implicit): access_token + refresh_token
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          if (!active) return;
          setIsRecovery(true);
          setChecking(false);
          return;
        }

        // 2) Fluxo PKCE: ?code=
        const code = query.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!active) return;
          setIsRecovery(true);
          setChecking(false);
          return;
        }

        // 3) Fluxo token_hash: ?token_hash=...&type=recovery
        const tokenHash = query.get('token_hash') || hash.get('token_hash');
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
          if (error) throw error;
          if (!active) return;
          setIsRecovery(true);
          setChecking(false);
          return;
        }

        // 4) Sessão já ativa (detectSessionInUrl processou antes)
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) {
          setIsRecovery(true);
        }
        setChecking(false);
      } catch (err) {
        if (!active) return;
        setLinkError(err instanceof Error ? err.message : 'Link inválido');
        setChecking(false);
      }
    };

    void resolveRecovery();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error('Digite a nova senha');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success('Senha atualizada com sucesso!');
      }
    } catch {
      toast.error('Erro ao atualizar senha');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="section-padding py-4 border-b border-border/50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Logo linkTo="/" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-card-lg text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Senha atualizada!</h2>
              <p className="text-muted-foreground mb-6">
                Sua senha foi alterada com sucesso. Você já pode acessar sua conta.
              </p>
              <Button className="btn-primary-gradient" onClick={() => navigate('/painel')}>
                Ir para o painel
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="section-padding py-4 border-b border-border/50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Logo linkTo="/" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-card-lg text-center">
            <CardContent className="pt-8 pb-8">
              <h2 className="text-xl font-semibold mb-2">Link inválido</h2>
              <p className="text-muted-foreground mb-6">
                {linkError || 'Este link de recuperação de senha é inválido ou já expirou. Solicite um novo link.'}
              </p>

              <Button asChild variant="outline">
                <Link to="/esqueci-senha">Solicitar novo link</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="section-padding py-4 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo linkTo="/" />
          <Button variant="ghost" asChild>
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Nova senha</CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Atualizando...
                  </>
                ) : (
                  'Atualizar senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ResetPassword;
