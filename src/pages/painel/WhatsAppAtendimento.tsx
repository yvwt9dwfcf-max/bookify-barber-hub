import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  MessageCircle, 
  Phone, 
  Loader2, 
  Save, 
  Copy,
  CheckCircle2,
  Building2,
  User,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

interface WhatsAppSettings {
  id?: string;
  barbershop_id: string;
  mode: 'global' | 'individual';
  global_phone: string | null;
  global_message: string;
}

interface BarberWhatsApp {
  id?: string;
  barber_id: string;
  phone: string | null;
  message: string;
}

const DEFAULT_MESSAGE = `Olá 👋
Para agendar seu horário, clique no link abaixo:
{{LINK_AGENDAMENTO}}`;

const WhatsAppAtendimento = () => {
  const { barber } = useOutletContext<ContextType>();
  const { barbershop, isMaster } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Global settings (only master can change mode)
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [mode, setMode] = useState<'global' | 'individual'>('global');
  const [globalPhone, setGlobalPhone] = useState('');
  const [globalMessage, setGlobalMessage] = useState(DEFAULT_MESSAGE);
  
  // Individual barber settings
  const [myWhatsApp, setMyWhatsApp] = useState<BarberWhatsApp | null>(null);
  const [myPhone, setMyPhone] = useState('');
  const [myMessage, setMyMessage] = useState(DEFAULT_MESSAGE);

  // Links
  const barbershopLink = barbershop 
    ? `${window.location.origin}/agendar/${barbershop.slug || barbershop.id}`
    : '';
  
  const myBarberLink = barber 
    ? `${window.location.origin}/b/${barber.id}`
    : '';

  // Fetch settings
  useEffect(() => {
    if (!barbershop?.id) return;
    
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // Fetch global settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('whatsapp_settings')
          .select('*')
          .eq('barbershop_id', barbershop.id)
          .maybeSingle();

        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }

        if (settingsData) {
          setSettings({
            ...settingsData,
            mode: settingsData.mode as 'global' | 'individual'
          });
          setMode(settingsData.mode as 'global' | 'individual');
          setGlobalPhone(settingsData.global_phone || '');
          setGlobalMessage(settingsData.global_message || DEFAULT_MESSAGE);
        }

        // Fetch my barber whatsapp settings
        if (barber?.id) {
          const { data: myData, error: myError } = await supabase
            .from('barber_whatsapp')
            .select('*')
            .eq('barber_id', barber.id)
            .maybeSingle();

          if (myError && myError.code !== 'PGRST116') {
            throw myError;
          }

          if (myData) {
            setMyWhatsApp(myData);
            setMyPhone(myData.phone || '');
            setMyMessage(myData.message || DEFAULT_MESSAGE);
          }
        }
      } catch (error) {
        console.error('Error fetching whatsapp settings:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [barbershop?.id, barber?.id]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const getResolvedMessage = (message: string, link: string) => {
    return message.replace('{{LINK_AGENDAMENTO}}', link);
  };

  // Message based on current mode and user type
  const currentMessage = useMemo(() => {
    if (mode === 'global') {
      return globalMessage;
    } else {
      return myMessage;
    }
  }, [mode, globalMessage, myMessage]);

  const currentLink = useMemo(() => {
    if (mode === 'global') {
      return barbershopLink;
    } else {
      return myBarberLink;
    }
  }, [mode, barbershopLink, myBarberLink]);

  // Preview message with resolved link
  const previewMessage = useMemo(() => {
    return getResolvedMessage(currentMessage, currentLink);
  }, [currentMessage, currentLink]);

  // Can edit based on mode and role
  const canEdit = useMemo(() => {
    if (mode === 'global') {
      return isMaster;
    } else {
      return true; // In individual mode, barber can edit their own
    }
  }, [mode, isMaster]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(previewMessage);
      setCopied(true);
      toast.success('Mensagem copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar mensagem');
    }
  };

  const handleSaveGlobalSettings = async () => {
    if (!barbershop?.id) return;
    
    setSaving(true);
    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('whatsapp_settings')
          .update({
            mode,
            global_phone: globalPhone || null,
            global_message: globalMessage,
          })
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_settings')
          .insert({
            barbershop_id: barbershop.id,
            mode,
            global_phone: globalPhone || null,
            global_message: globalMessage,
          });
        
        if (error) throw error;
      }
      
      toast.success('Configurações salvas!');
    } catch (error) {
      console.error('Error saving global settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMySettings = async () => {
    if (!barber?.id) return;
    
    setSaving(true);
    try {
      if (myWhatsApp?.id) {
        const { error } = await supabase
          .from('barber_whatsapp')
          .update({
            phone: myPhone || null,
            message: myMessage,
          })
          .eq('id', myWhatsApp.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('barber_whatsapp')
          .insert({
            barber_id: barber.id,
            phone: myPhone || null,
            message: myMessage,
          });
        
        if (error) throw error;
      }
      
      toast.success('Suas configurações foram salvas!');
    } catch (error) {
      console.error('Error saving my whatsapp settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-green-500" />
          WhatsApp e atendimento
        </h1>
        <p className="text-muted-foreground">
          Escolha como seus clientes vão receber a mensagem para agendar: automaticamente pelo WhatsApp Business ou manualmente copiando a mensagem.
        </p>
      </div>

      {/* BLOCK 1 - WhatsApp Business (Recommended) */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Usando WhatsApp Business (recomendado)</CardTitle>
          </div>
          <CardDescription>
            Configure uma mensagem automática para responder todos os clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="instructions" className="border-none">
              <AccordionTrigger className="hover:no-underline py-2">
                <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <ChevronRight className="h-4 w-4" />
                  Como configurar no WhatsApp Business
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ Este método funciona somente no aplicativo WhatsApp Business (não funciona no WhatsApp comum).
                  </p>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-bold text-green-600">1.</span>
                      <span>Instale o <strong>WhatsApp Business</strong> no seu celular.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-green-600">2.</span>
                      <span>Vá em <strong>Ferramentas</strong> no menu.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-green-600">3.</span>
                      <span>Acesse <strong>Mensagens automáticas</strong>.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-green-600">4.</span>
                      <span>Configure a <strong>Mensagem de saudação</strong>.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-green-600">5.</span>
                      <span>Cole a mensagem abaixo <strong>exatamente como está</strong>.</span>
                    </li>
                  </ol>
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                    <p className="text-xs text-green-700 dark:text-green-400">
                      💡 Este é o método <strong>recomendado</strong> para automatizar seu atendimento.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* BLOCK 2 - Manual Message Copy */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Mensagem para enviar manualmente no WhatsApp
          </CardTitle>
          <CardDescription>
            Copie e cole esta mensagem quando um cliente entrar em contato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Message Editor - Only if user can edit */}
          {canEdit && (
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                placeholder="Digite a mensagem..."
                value={mode === 'global' ? globalMessage : myMessage}
                onChange={(e) => {
                  if (mode === 'global') {
                    setGlobalMessage(e.target.value);
                  } else {
                    setMyMessage(e.target.value);
                  }
                }}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{'{{LINK_AGENDAMENTO}}'}</code> para inserir o link automaticamente
              </p>
            </div>
          )}

          {/* Preview Box */}
          <div className="p-4 bg-muted rounded-lg border">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Preview da mensagem:</p>
            <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
          </div>

          {/* Copy Button */}
          <Button 
            onClick={handleCopyMessage}
            className="w-full"
            variant={copied ? "secondary" : "default"}
          >
            {copied ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                Mensagem copiada!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copiar mensagem
              </>
            )}
          </Button>

          {/* Save button for editable message */}
          {canEdit && (
            <Button 
              onClick={mode === 'global' ? handleSaveGlobalSettings : handleSaveMySettings} 
              disabled={saving} 
              variant="outline"
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar mensagem
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* BLOCK 3 - Mode Selector (Master Only) */}
      {isMaster && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Modo de funcionamento
            </CardTitle>
            <CardDescription>
              Escolha como o WhatsApp será configurado na barbearia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as 'global' | 'individual')}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="global" id="global" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="global" className="font-medium cursor-pointer">
                    WhatsApp da barbearia (global)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Um único número e mensagem para toda a barbearia. Apenas você pode editar.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <RadioGroupItem value="individual" id="individual" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="individual" className="font-medium cursor-pointer">
                    WhatsApp por barbeiro
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Cada barbeiro cadastra e gerencia o próprio número e mensagem.
                  </p>
                </div>
              </div>
            </RadioGroup>

            <Button onClick={handleSaveGlobalSettings} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar modo
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Mode Badge - For Barbers (view only) */}
      {!isMaster && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Modo atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-sm">
              {mode === 'global' ? 'WhatsApp da barbearia (global)' : 'WhatsApp por barbeiro'}
            </Badge>
            {mode === 'global' && (
              <p className="text-sm text-muted-foreground mt-2">
                O administrador gerencia o número e mensagem da barbearia. Você pode copiar a mensagem acima.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* BLOCK 4 - Phone Number Configuration */}
      {/* Global mode: only master can edit */}
      {mode === 'global' && isMaster && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Número da Barbearia
            </CardTitle>
            <CardDescription>
              Este número será usado para gerar links de WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="globalPhone">Número do WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="globalPhone"
                  placeholder="(00) 00000-0000"
                  value={globalPhone}
                  onChange={(e) => setGlobalPhone(formatPhone(e.target.value))}
                  className="pl-10"
                  maxLength={15}
                />
              </div>
            </div>

            <Button onClick={handleSaveGlobalSettings} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar número
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Individual mode: each barber edits their own */}
      {mode === 'individual' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Meu Número de WhatsApp
            </CardTitle>
            <CardDescription>
              Configure seu número pessoal para receber contatos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="myPhone">Meu número</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="myPhone"
                  placeholder="(00) 00000-0000"
                  value={myPhone}
                  onChange={(e) => setMyPhone(formatPhone(e.target.value))}
                  className="pl-10"
                  maxLength={15}
                />
              </div>
            </div>

            <Button onClick={handleSaveMySettings} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar meu número
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppAtendimento;
