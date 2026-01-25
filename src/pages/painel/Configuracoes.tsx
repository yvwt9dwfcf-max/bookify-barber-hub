import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Barber } from '@/lib/supabase';
import { useBarber } from '@/hooks/useBarber';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Mail, Loader2, Save, Link as LinkIcon, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ContextType {
  barber: Barber | null;
}

const Configuracoes = () => {
  const { barber } = useOutletContext<ContextType>();
  const { updateBarber } = useBarber();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState(barber?.name || '');
  const [phone, setPhone] = useState(barber?.phone || '');

  // Generate the public booking link
  const publicLink = barber 
    ? `${window.location.origin}/b/${barber.id}`
    : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Agende com ${barber?.name} - Bookify`,
          text: `Agende seu horário com ${barber?.name}`,
          url: publicLink,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      copyLink();
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

      {/* Public Link Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Seu link de agendamento
          </CardTitle>
          <CardDescription>
            Compartilhe esse link para que clientes agendem diretamente com você
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={publicLink}
              readOnly
              className="font-mono text-sm bg-background"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyLink}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={copyLink}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
            <Button
              className="flex-1 btn-primary-gradient"
              onClick={shareLink}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Quando alguém acessar este link, poderá agendar diretamente com você, 
            sem precisar escolher o profissional.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;
