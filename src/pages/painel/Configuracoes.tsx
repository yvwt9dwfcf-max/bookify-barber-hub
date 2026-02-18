import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Loader2, Save, Building2, Crown, Link2, Copy, CheckCircle, CreditCard, ChevronRight, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

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
  
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Digite seu nome');
      return;
    }

    setSaving(true);
    try {
      const { error } = await updateBarber({
        name: name.trim(),
        phone: phone || null,
      });

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações de perfil
        </p>
      </div>

      {/* Role Badge */}
      <div className="flex items-center gap-2">
        {isMaster ? (
          <Badge className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            Administrador
          </Badge>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Barbeiro
          </Badge>
        )}
        {barbershop && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {barbershop.name}
          </Badge>
        )}
      </div>

      {/* Public Booking Link */}
      {publicLink && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5 text-primary" />
              Link Público de Agendamento
            </CardTitle>
            <CardDescription>
              Compartilhe este link com seus clientes para que agendem online
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={publicLink}
                readOnly
                className="font-mono text-sm bg-background"
              />
              <Button
                onClick={handleCopyLink}
                variant={copied ? 'default' : 'outline'}
                className={copied ? 'btn-primary-gradient' : ''}
                size="icon"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription */}
      {isMaster && (
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.99]"
          onClick={() => navigate('/painel/assinatura')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-gradient)' }}>
              <CreditCard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Assinatura</h3>
              <p className="text-sm text-muted-foreground">Gerencie seu plano</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* Theme Toggle */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent">
            {isDarkMode ? <Moon className="h-5 w-5 text-accent-foreground" /> : <Sun className="h-5 w-5 text-accent-foreground" />}
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Tema</h3>
            <p className="text-sm text-muted-foreground">{isDarkMode ? 'Modo escuro' : 'Modo claro'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <Switch checked={!isDarkMode} onCheckedChange={handleToggleTheme} />
            <Sun className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados do perfil
          </CardTitle>
          <CardDescription>
            Essas informações serão exibidas para os clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={barber?.email || ''}
                disabled
                className="pl-10 bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={handlePhoneChange}
                className="pl-10"
                maxLength={15}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full btn-primary-gradient">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar alterações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;
