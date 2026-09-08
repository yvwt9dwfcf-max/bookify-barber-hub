import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { OAuthButtons } from './OAuthButtons';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    sessionStorage.removeItem('bookify-auth-destination');
    try {
      const { error } = await signIn(email, password);
      if (error) {
        const message = error.message || '';

        if (message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else if (message.includes('Email not confirmed')) {
          toast.error('Confirme seu email antes de entrar');
        } else if (message.includes('Load failed') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
          toast.error('Não foi possível conectar ao servidor agora. Tente novamente em instantes.');
        } else {
          toast.error(message);
        }
      } else {
        toast.success('Login realizado com sucesso!');
        // Navigation is handled by Login.tsx useEffect when user state updates
      }
    } catch {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <header className="space-y-2 text-center">
        <p className="font-editorial-mono text-[11px] uppercase text-primary">— Bem-vindo de volta</p>
        <h2 className="font-display text-3xl font-semibold text-foreground">Acesse sua conta</h2>
        <p className="text-sm text-muted-foreground">Entre para continuar cuidando da sua barbearia.</p>
      </header>

      <OAuthButtons mode="login" />

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="font-editorial-mono text-[10px] uppercase text-muted-foreground">ou use seu e-mail</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-1">
          <Label htmlFor="login-email" className="font-editorial-mono text-[10px] uppercase text-muted-foreground">E-mail</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="login-password" className="font-editorial-mono text-[10px] uppercase text-muted-foreground">Senha</Label>
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 text-base shadow-none focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
        <Button
          type="submit"
          className="h-12 w-full rounded-lg btn-primary-gradient font-editorial-mono text-xs uppercase"
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
          <Link to="/esqueci-senha" className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground">
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </div>
  );
}
