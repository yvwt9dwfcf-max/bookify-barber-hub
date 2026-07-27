import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff, Check, MailCheck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-10 h-10 rounded-xl"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
};

export const ChangePasswordDialog = ({ open, onOpenChange }: ChangePasswordDialogProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  const rules = [
    { label: 'Mínimo de 6 caracteres', ok: newPassword.length >= 6 },
    { label: 'Diferente da senha atual', ok: newPassword.length > 0 && newPassword !== currentPassword },
    { label: 'As duas senhas coincidem', ok: newPassword.length > 0 && newPassword === confirmPassword },
  ];

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setDone(false);
    setResetSentTo(null);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const handleForgot = async () => {
    setSendingReset(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) {
        toast.error('Não foi possível identificar seu e-mail');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message || 'Erro ao enviar o link');
        return;
      }
      setResetSentTo(email);
    } catch {
      toast.error('Erro ao enviar o link de recuperação');
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha precisa ter no mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('A nova senha precisa ser diferente da atual');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;

      if (!email) {
        toast.error('Não foi possível identificar o usuário');
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error('Senha atual incorreta');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error(updateError.message || 'Erro ao alterar senha');
        setLoading(false);
        return;
      }

      setDone(true);
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      toast.error('Erro inesperado ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {done ? (
          <div className="py-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-base font-semibold mb-1">Senha alterada</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Sua nova senha já está ativa. Use ela no próximo acesso.
            </p>
            <Button className="w-full h-10 rounded-xl" onClick={close}>Concluir</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base">Alterar senha</DialogTitle>
              <DialogDescription className="text-xs">
                Confirme sua senha atual e defina uma nova senha de acesso.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                id="current-password"
                label="Senha atual"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                placeholder="Sua senha de hoje"
              />

              <div className="h-px bg-border/60" />

              <div className="space-y-3">
                <PasswordField
                  id="new-password"
                  label="Nova senha"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                />
                <PasswordField
                  id="confirm-password"
                  label="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                />
              </div>

              <ul className="space-y-1.5 rounded-xl bg-muted/40 p-3">
                {rules.map((r) => (
                  <li key={r.label} className="flex items-center gap-2 text-[11px]">
                    <span
                      className={cn(
                        'h-3.5 w-3.5 rounded-full flex items-center justify-center border transition-colors',
                        r.ok ? 'bg-primary border-primary' : 'border-border'
                      )}
                    >
                      {r.ok && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </span>
                    <span className={cn(r.ok ? 'text-foreground' : 'text-muted-foreground')}>{r.label}</span>
                  </li>
                ))}
              </ul>

              <DialogFooter className="gap-2 pt-1 sm:flex-row-reverse">
                <Button type="submit" className="h-10 rounded-xl w-full sm:w-auto" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Alterar senha
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl w-full sm:w-auto"
                  onClick={close}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </form>

            <div className="pt-3 border-t border-border/60 text-center">
              {resetSentTo ? (
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <MailCheck className="h-3.5 w-3.5 text-primary" />
                  Link de redefinição enviado para <strong className="text-foreground">{resetSentTo}</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleForgot}
                  disabled={sendingReset}
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors disabled:opacity-60"
                >
                  {sendingReset ? 'Enviando link...' : 'Esqueci minha senha atual'}
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
