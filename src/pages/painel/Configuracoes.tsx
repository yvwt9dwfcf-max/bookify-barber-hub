import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Loader2, Save, Building2, Crown, Link2, Copy, CheckCircle, CreditCard, ChevronRight, Sun, Moon, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

const Configuracoes = () => {
  const { barber } = useOutletContext<ContextType>();
  const { updateBarber } = useBarber();
  const { barbershop, isMaster } = useUserRole();
  const navigate = useNavigate();
  
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingBarbershop, setSavingBarbershop] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('bookify-theme');
    if (saved) return saved === 'dark';
    return !document.documentElement.classList.contains('light');
  });

  const handleToggleTheme = (checked: boolean) => {
    const dark = !checked;
    setIsDarkMode(dark);
    if (dark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('bookify-theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('bookify-theme', 'light');
    }
  };

  const [name, setName] = useState(barber?.name || '');
  const [phone, setPhone] = useState(barber?.phone || '');
  const [barbershopName, setBarbershopName] = useState(barbershop?.name || '');

  const publicLink = barbershop
    ? `${window.location.origin}/barbearia/${barbershop.slug || barbershop.id}`
    : '';

  const handleCopyLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSaveAccount = async () => {
    if (!name.trim()) {
      toast.error('Digite seu nome');
      return;
    }

    setSavingAccount(true);
    try {
      const { error } = await updateBarber({
        name: name.trim(),
        phone: phone || null,
      });

      if (error) throw error;
      toast.success('Dados da conta atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSaveBarbershop = async () => {
    if (!barbershopName.trim()) {
      toast.error('Digite o nome da barbearia');
      return;
    }

    setSavingBarbershop(true);
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ name: barbershopName.trim() })
        .eq('id', barbershop!.id);

      if (error) throw error;
      toast.success('Nome da barbearia atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar barbearia');
    } finally {
      setSavingBarbershop(false);
    }
  };

  const planLabel = barbershop?.plan
    ? barbershop.plan.charAt(0).toUpperCase() + barbershop.plan.slice(1)
    : 'Basic';

  return (
    <div className="space-y-8 max-w-2xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        {barbershop && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground text-sm">{barbershop.name}</span>
            <span className="text-muted-foreground/40">·</span>
            <Badge variant="outline" className="text-xs font-medium">
              Plano {planLabel}
            </Badge>
          </div>
        )}
      </div>

      {/* Public Booking Link */}
      {publicLink && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-primary" />
            Link público de agendamento
          </div>
          <div className="flex gap-2">
            <Input
              value={publicLink}
              readOnly
              className="font-mono text-xs bg-background"
            />
            <Button
              onClick={handleCopyLink}
              variant={copied ? 'default' : 'outline'}
              size="icon"
              className="shrink-0"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Theme Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          {isDarkMode ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="text-xs text-muted-foreground">{isDarkMode ? 'Modo escuro' : 'Modo claro'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Moon className="h-3.5 w-3.5 text-muted-foreground/60" />
          <Switch checked={!isDarkMode} onCheckedChange={handleToggleTheme} />
          <Sun className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
      </div>

      {/* Seção Conta */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            Conta
          </h2>
          <p className="text-xs text-muted-foreground">Informações pessoais da sua conta</p>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Nome</Label>
            <Input
              id="name"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs">Telefone</Label>
            <Input
              id="phone"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={15}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              value={barber?.email || ''}
              disabled
              className="bg-muted/50 text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground/60">O email não pode ser alterado</p>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleSaveAccount}
              disabled={savingAccount}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
            >
              {savingAccount ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Salvar alterações
            </Button>
          </div>
        </div>
      </section>

      {/* Seção Barbearia */}
      {isMaster && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Barbearia
            </h2>
            <p className="text-xs text-muted-foreground">Configurações da sua barbearia</p>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="barbershop-name" className="text-xs">Nome da barbearia</Label>
              <Input
                id="barbershop-name"
                placeholder="Nome da barbearia"
                value={barbershopName}
                onChange={(e) => setBarbershopName(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleSaveBarbershop}
                disabled={savingBarbershop}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
              >
                {savingBarbershop ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar alterações
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Seção Assinatura */}
      {isMaster && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Assinatura
            </h2>
            <p className="text-xs text-muted-foreground">Gerencie seu plano atual</p>
          </div>

          <div
            className="rounded-lg border p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/painel/assinatura')}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
                <Crown className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Plano {planLabel}</p>
                <p className="text-xs text-muted-foreground">Clique para alterar seu plano</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </section>
      )}

      {/* Termos e Política */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <a href="/termos-de-uso" target="_blank" className="text-xs text-muted-foreground/60 hover:text-primary transition-colors">
          Termos de uso
        </a>
        <span className="text-muted-foreground/30 text-xs">•</span>
        <a href="/politica-de-privacidade" target="_blank" className="text-xs text-muted-foreground/60 hover:text-primary transition-colors">
          Política de privacidade
        </a>
      </div>

      {/* Zona de Risco */}
      <section className="space-y-3">
        <Separator className="opacity-30" />
        <div>
          <h2 className="text-xs font-medium text-destructive/70 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="h-3 w-3" />
            Zona de risco
          </h2>
        </div>

        <div className="rounded-lg border border-destructive/15 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Excluir conta</p>
              <p className="text-xs text-muted-foreground">Remove permanentemente sua conta e todos os dados</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive text-xs gap-1.5"
                  disabled={deleting}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conta</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>Esta ação é permanente e não pode ser desfeita.</p>
                      <p>Ao continuar:</p>
                      <ul className="space-y-1 text-sm">
                        <li>• Sua assinatura ativa será cancelada imediatamente</li>
                        <li>• Todos os agendamentos e dados serão removidos</li>
                        <li>• Sua conta será excluída permanentemente do sistema</li>
                      </ul>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) throw new Error('Não autenticado');

                        const { data, error } = await supabase.functions.invoke('delete-account', {
                          headers: { Authorization: `Bearer ${session.access_token}` },
                        });

                        if (error) throw error;

                        await supabase.auth.signOut();
                        toast.success('Conta excluída com sucesso.');
                        navigate('/');
                      } catch (err: any) {
                        toast.error('Erro ao excluir conta. Tente novamente.');
                        console.error(err);
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    Excluir conta permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Configuracoes;
