import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Building2, Crown, Link2, Copy, CircleCheck as CheckCircle, CreditCard, ChevronRight, Sun, Moon, TriangleAlert as AlertTriangle, Trash2, Camera, CircleHelp as HelpCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { useAutoSave } from '@/hooks/useAutoSave';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
  refetchRole: () => Promise<void>;
}

const Configuracoes = () => {
  const { barber, refetchRole } = useOutletContext<ContextType>();
  const { updateBarber } = useBarber();
  const { barbershop, isMaster, refetch: refetchUserRole } = useUserRole();
  const navigate = useNavigate();
  
  const [copied, setCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const barbershopFileInputRef = useRef<HTMLInputElement>(null);
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

  // Sync photo when barbershop data loads
  useEffect(() => {
    if (barbershop) {
      setPhotoUrl(barbershop.photo_url || '');
    }
  }, [barbershop]);

  // Auto-save: barbershop name
  const saveBarbershopName = useCallback(async (val: string) => {
    if (!barbershop) return;
    const { error } = await supabase
      .from('barbershops')
      .update({ name: val })
      .eq('id', barbershop.id);
    if (error) throw error;
    await refetchUserRole();
    await refetchRole();
  }, [barbershop, refetchUserRole, refetchRole]);

  const barbershopNameAutoSave = useAutoSave({
    serverValue: barbershop?.name || '',
    onSave: saveBarbershopName,
  });

  // Auto-save: barber name
  const saveBarberName = useCallback(async (val: string) => {
    const { error } = await updateBarber({ name: val });
    if (error) throw error;
  }, [updateBarber]);

  const barberNameAutoSave = useAutoSave({
    serverValue: barber?.name || '',
    onSave: saveBarberName,
  });

  // Auto-save: barber phone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const saveBarberPhone = useCallback(async (val: string) => {
    const { error } = await updateBarber({ phone: val || null });
    if (error) throw error;
  }, [updateBarber]);

  const barberPhoneAutoSave = useAutoSave({
    serverValue: barber?.phone || '',
    onSave: saveBarberPhone,
  });

  // Combined auto-save status for the indicator
  const combinedStatus = 
    barbershopNameAutoSave.status === 'saving' || barberNameAutoSave.status === 'saving' || barberPhoneAutoSave.status === 'saving'
      ? 'saving' as const
      : barbershopNameAutoSave.status === 'error' || barberNameAutoSave.status === 'error' || barberPhoneAutoSave.status === 'error'
        ? 'error' as const
        : barbershopNameAutoSave.status === 'saved' || barberNameAutoSave.status === 'saved' || barberPhoneAutoSave.status === 'saved'
          ? 'saved' as const
          : 'idle' as const;

  const barbershopSlug = barbershop?.slug || barbershop?.id || '';
  const publicLinkReal = barbershop
    ? `${window.location.origin}/barbearia/${barbershopSlug}`
    : '';
  const publicLinkDisplay = barbershopSlug ? `bookify.app/${barbershopSlug}` : '';

  const handleCopyLink = async () => {
    if (!publicLinkReal) return;
    try {
      await navigator.clipboard.writeText(publicLinkReal);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const handleBarbershopPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !barbershop) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${barbershop.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('barbershop-photos')
        .upload(fileName, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('barbershop-photos')
        .getPublicUrl(fileName);

      const newUrl = urlData.publicUrl;
      const { error } = await supabase
        .from('barbershops')
        .update({ photo_url: newUrl })
        .eq('id', barbershop.id);
      if (error) throw error;

      setPhotoUrl(newUrl);
      await refetchUserRole();
      await refetchRole();
      toast.success('Foto atualizada!');
    } catch (err) {
      toast.error('Erro ao enviar foto');
      console.error(err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const planLabel = barbershop?.plan
    ? barbershop.plan.charAt(0).toUpperCase() + barbershop.plan.slice(1)
    : 'Basic';

  return (
    <div className="space-y-8 max-w-2xl pb-12">
      {/* Header com foto e nome da barbearia */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="relative group">
          <div
            className="relative w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-muted/30"
            onClick={() => barbershopFileInputRef.current?.click()}
          >
            {uploadingPhoto ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : photoUrl ? (
              <img src={photoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Camera className="h-5 w-5 text-muted-foreground/60" />
            )}
            <input
              ref={barbershopFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBarbershopPhotoUpload}
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
              <Camera className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
          </div>
          {photoUrl && (
            <button
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive border-2 border-background flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const { error } = await supabase
                    .from('barbershops')
                    .update({ photo_url: null })
                    .eq('id', barbershop!.id);
                  if (error) throw error;
                  setPhotoUrl('');
                  await refetchUserRole();
                  await refetchRole();
                  toast.success('Foto removida!');
                } catch {
                  toast.error('Erro ao remover foto');
                }
              }}
            >
              <Trash2 className="h-2.5 w-2.5 text-destructive-foreground" />
            </button>
          )}
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold">{barbershop?.name || 'Configurações'}</h1>
          {barbershop && (
            <Badge variant="outline" className="text-xs font-medium mt-1">
              Plano {planLabel}
            </Badge>
          )}
        </div>
      </div>

      {/* Public Booking Link */}
      {publicLinkDisplay && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-primary" />
            Link público de agendamento
          </div>
          <div className="flex gap-2">
            <Input
              value={publicLinkDisplay}
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

      {/* Seção Barbearia (Master) */}
      {isMaster && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Barbearia
              </h2>
              <p className="text-xs text-muted-foreground">Configurações da sua barbearia</p>
            </div>
            <AutoSaveIndicator status={combinedStatus} />
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="barbershop-name" className="text-xs">Nome da barbearia</Label>
              <Input
                id="barbershop-name"
                placeholder="Nome da barbearia"
                value={barbershopNameAutoSave.value}
                onChange={(e) => barbershopNameAutoSave.setValue(e.target.value)}
                onBlur={barbershopNameAutoSave.onBlur}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Seu nome</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={barberNameAutoSave.value}
                onChange={(e) => barberNameAutoSave.setValue(e.target.value)}
                onBlur={barberNameAutoSave.onBlur}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={barberPhoneAutoSave.value}
                onChange={(e) => barberPhoneAutoSave.setValue(formatPhone(e.target.value))}
                onBlur={barberPhoneAutoSave.onBlur}
              />
            </div>
          </div>
        </section>
      )}

      {/* Seção Perfil (Funcionário) */}
      {!isMaster && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Meu perfil
              </h2>
              <p className="text-xs text-muted-foreground">Suas informações pessoais</p>
            </div>
            <AutoSaveIndicator status={combinedStatus} />
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Seu nome</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={barberNameAutoSave.value}
                onChange={(e) => barberNameAutoSave.setValue(e.target.value)}
                onBlur={barberNameAutoSave.onBlur}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={barberPhoneAutoSave.value}
                onChange={(e) => barberPhoneAutoSave.setValue(formatPhone(e.target.value))}
                onBlur={barberPhoneAutoSave.onBlur}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input
                value={barber?.email || ''}
                readOnly
                disabled
                className="opacity-60"
              />
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

      {/* Seção Ajuda */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Ajuda
        </h2>

        <div className="rounded-lg border divide-y">
          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate('/painel/suporte')}
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium flex-1">Central de ajuda</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>

          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => window.open('mailto:suporte.bookifybarber@gmail.com?subject=Reportar%20problema%20-%20Bookify', '_self')}
          >
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium flex-1">Reportar problema</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>

          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => window.open('mailto:suporte.bookifybarber@gmail.com?subject=Contato%20Suporte%20-%20Bookify', '_self')}
          >
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium flex-1">Contatar suporte</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </section>

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

        <div
          className="rounded-lg border border-destructive/15 p-4 flex items-center justify-between cursor-pointer hover:bg-destructive/5 transition-colors"
          onClick={() => navigate('/painel/excluir-conta')}
        >
          <div className="flex items-center gap-3">
            <Trash2 className="h-4 w-4 text-destructive/70" />
            <div>
              <p className="text-sm font-medium">Exclusão de conta</p>
              <p className="text-xs text-muted-foreground">Remove permanentemente sua conta e todos os dados</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </section>
    </div>
  );
};

export default Configuracoes;
