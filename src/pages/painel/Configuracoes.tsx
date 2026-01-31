import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Loader2, Save, Link as LinkIcon, Copy, Check, ExternalLink, Building2, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

const Configuracoes = () => {
  const { barber } = useOutletContext<ContextType>();
  const { updateBarber } = useBarber();
  const { barbershop, isMaster } = useUserRole();
  const { barbers } = useBarbershopBarbers();
  
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [name, setName] = useState(barber?.name || '');
  const [phone, setPhone] = useState(barber?.phone || '');

  // Generate links
  const barbershopLink = barbershop 
    ? `${window.location.origin}/agendar/${barbershop.id}`
    : '';
  
  const myBarberLink = barber 
    ? `${window.location.origin}/b/${barber.id}`
    : '';

  const copyLink = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(id);
      toast.success('Link copiado!');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const shareLink = async (link: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Agende seu horário`,
          url: link,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      copyLink(link, 'share');
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

      {/* Barbershop Link - Show for all users */}
      {barbershop && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Link da Barbearia
            </CardTitle>
            <CardDescription>
              Link para agendamento com qualquer barbeiro da equipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={barbershopLink}
                readOnly
                className="font-mono text-sm bg-background"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyLink(barbershopLink, 'barbershop')}
                className="shrink-0"
              >
                {copiedLink === 'barbershop' ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Barber Link */}
      <Card className="border-secondary/20 bg-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Meu Link de Agendamento
          </CardTitle>
          <CardDescription>
            Compartilhe para que clientes agendem diretamente com você
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={myBarberLink}
              readOnly
              className="font-mono text-sm bg-background"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyLink(myBarberLink, 'mylink')}
              className="shrink-0"
            >
              {copiedLink === 'mylink' ? (
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
              onClick={() => copyLink(myBarberLink, 'mylink')}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
            <Button
              className="flex-1 btn-primary-gradient"
              onClick={() => shareLink(myBarberLink, `Agende com ${barber?.name}`)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Barber Links - Only for Master */}
      {isMaster && barbers.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Links da Equipe
            </CardTitle>
            <CardDescription>
              Links individuais de cada barbeiro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {barbers.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{b.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {`${window.location.origin}/b/${b.id}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyLink(`${window.location.origin}/b/${b.id}`, b.id)}
                >
                  {copiedLink === b.id ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Configuracoes;
