import { useState, useRef, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Loader2, Save, Building2, Crown, Link2, Copy, CheckCircle, CreditCard, ChevronRight, Sun, Moon, AlertTriangle, Trash2, Camera, HelpCircle } from 'lucide-react';
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
  refetchRole: () => Promise<void>;
}

const Configuracoes = () => {
  const { barber, refetchRole } = useOutletContext<ContextType>();
  const { updateBarber } = useBarber();
  const { barbershop, isMaster, refetch: refetchUserRole } = useUserRole();
  const navigate = useNavigate();
  
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingBarbershop, setSavingBarbershop] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const [name, setName] = useState(barber?.name || '');
  const [phone, setPhone] = useState(barber?.phone || '');
  const [barbershopName, setBarbershopName] = useState(barbershop?.name || '');

  // Sync state when barbershop/barber data loads or changes
  useEffect(() => {
    if (barbershop) {
      setBarbershopName(barbershop.name || '');
      setPhotoUrl(barbershop.photo_url || '');
    }
  }, [barbershop]);

  useEffect(() => {
    if (barber) {
      setName(barber.name || '');
      setPhone(barber.phone || '');
    }
  }, [barber]);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !barber) return;

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
      const fileName = `barbers/${barber.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('barbershop-photos')
        .upload(fileName, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('barbershop-photos')
        .getPublicUrl(fileName);

      const newUrl = urlData.publicUrl;
      await updateBarber({ photo_url: newUrl });
      toast.success('Foto atualizada!');
    } catch (err) {
      toast.error('Erro ao enviar foto');
      console.error(err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      await refetchUserRole();
      await refetchRole();
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
      {/* Header com foto e nome da barbearia */}
      <div className="flex flex-col items-center gap-3 pt-2">
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

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Seu nome</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                onClick={async () => {
                  await handleSaveAccount();
                  await handleSaveBarbershop();
                }}
                disabled={savingAccount || savingBarbershop}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
              >
                {(savingAccount || savingBarbershop) ? (
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
