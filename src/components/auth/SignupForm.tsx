import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MailCheck } from 'lucide-react';
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
      <div className="space-y-5 py-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-primary/10">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="font-editorial-mono text-[11px] uppercase text-primary">— Último passo</p>
          <h2 className="font-display text-3xl font-semibold">Confirme seu e-mail</h2>
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
          className="h-12 w-full rounded-lg border-border bg-transparent font-editorial-mono text-xs uppercase"
          onClick={() => setAwaitingConfirmation(false)}
        >
          Voltar
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-7">
      <header className="space-y-2 text-center">
        <p className="font-editorial-mono text-[11px] uppercase text-primary">— Comece agora</p>
        <h2 className="font-display text-3xl font-semibold text-foreground">Crie sua conta</h2>
        <p className="text-sm text-muted-foreground">Sua barbearia organizada desde o primeiro dia.</p>
      </header>

      <OAuthButtons mode="signup" />

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="font-editorial-mono text-[10px] uppercase text-muted-foreground">ou use seu e-mail</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSignup} className="space-y-5">
        <div className="border-y border-border py-3 text-center font-editorial-mono text-[10px] uppercase text-primary">
          Teste grátis por 3 dias. Após isso, escolha um plano para continuar.
        </div>
        <div className="space-y-1">
          <Label htmlFor="signup-name" className="font-editorial-mono text-[10px] uppercase text-muted-foreground">Seu nome</Label>
          <Input id="signup-name" type="text" placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="signup-email" className="font-editorial-mono text-[10px] uppercase text-muted-foreground">E-mail *</Label>
          <Input id="signup-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="signup-password" className="font-editorial-mono text-[10px] uppercase text-muted-foreground">Senha *</Label>
          <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="signup-confirm" className="font-editorial-mono text-[10px] uppercase text-muted-foreground">Confirmar senha *</Label>
          <Input id="signup-confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0" required />
        </div>

        <div className="flex items-start gap-2 py-1">
          <Checkbox
            id="accept-terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            className="mt-0.5 h-4 w-4 rounded-[3px] border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <label htmlFor="accept-terms" className="cursor-pointer text-[11px] leading-relaxed text-muted-foreground">
            Li e concordo com os{' '}
            <Link to="/termos-de-uso" target="_blank" className="text-foreground underline underline-offset-2 hover:text-primary">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link to="/politica-de-privacidade" target="_blank" className="text-foreground underline underline-offset-2 hover:text-primary">
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
          className="h-12 w-full rounded-lg btn-primary-gradient font-editorial-mono text-xs uppercase"
          disabled={isLoading || !acceptedTerms}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar conta grátis'
          )}
        </Button>
      </form>
    </div>
  );
}
