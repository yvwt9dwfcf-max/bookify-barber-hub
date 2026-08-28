import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Mail, Lock, User, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { OAuthButtons } from './OAuthButtons';

export function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (!acceptedTerms) {
      toast.error('Você precisa aceitar os Termos de Uso e Política de Privacidade');
      return;
    }

    setIsLoading(true);
    sessionStorage.setItem('bookify-auth-destination', 'onboarding');
    try {
      const { data, error } = await signUp(email, password, {
        name: name.trim() || undefined,
        selected_plan: 'pro',
      });
      if (error) {
        sessionStorage.removeItem('bookify-auth-destination');
        toast.error(error.message);
        return;
      }

      localStorage.removeItem('selected_plan');

      const signUpSession = (data as { session?: unknown } | null)?.session ?? null;
      if (signUpSession) {
        toast.success('Conta criada! Vamos configurar sua barbearia.');
        navigate('/onboarding', { replace: true });
        return;
      }

      // Sem sessão imediata: tenta entrar (caso a confirmação de e-mail esteja desativada)
      const { data: signInData, error: signInError } = await signIn(email, password);
      const signedIn = (signInData as { session?: unknown } | null)?.session ?? null;

      if (!signInError && signedIn) {
        toast.success('Conta criada! Vamos configurar sua barbearia.');
        navigate('/onboarding', { replace: true });
        return;
      }

      // Confirmação de e-mail obrigatória: mostra estado claro, sem voltar para a tela inicial
      setAwaitingConfirmation(true);
    } catch {
      sessionStorage.removeItem('bookify-auth-destination');
      toast.error('Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  if (awaitingConfirmation) {
    return (
      <div className="space-y-4 text-center py-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Confirme seu e-mail</h2>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para <span className="font-medium text-foreground">{email}</span>.
            Toque no link e você entrará direto na configuração da sua barbearia.
          </p>
        </div>
        <p className="text-xs text-muted-foreground/80">
          Não recebeu? Verifique a caixa de spam.
        </p>
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl"
          onClick={() => setAwaitingConfirmation(false)}
        >
          Voltar
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      <OAuthButtons mode="signup" />

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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-11"
              required
            />
          </div>
        </div>

        <div className="flex items-start gap-2 py-1">
          <Checkbox
            id="accept-terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            className="mt-0.5 h-3.5 w-3.5"
          />
          <label htmlFor="accept-terms" className="text-[11px] text-muted-foreground/80 cursor-pointer leading-relaxed">
            Li e concordo com os{' '}
            <Link to="/termos-de-uso" target="_blank" className="underline text-primary hover:text-primary/80">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link to="/politica-de-privacidade" target="_blank" className="underline text-primary hover:text-primary/80">
              Política de Privacidade
            </Link>.
          </label>
        </div>

        {!acceptedTerms && email && password && (
          <p className="text-[11px] text-muted-foreground/70 text-center">
            É necessário aceitar os termos para criar a conta.
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
  );
}
