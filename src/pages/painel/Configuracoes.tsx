import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Barber, Barbershop, PLAN_NAMES, PLAN_DISPLAY_LABELS, supabase, PlanType, PLAN_LIMITS } from '@/lib/supabase';
import { useBarber } from '@/hooks/useBarber';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Loader2, Save, Building2, Crown, CreditCard, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionSheet } from '@/components/painel/SubscriptionSheet';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

const Configuracoes = () => {
  const { barber } = useOutletContext<ContextType>();
  const { updateBarber } = useBarber();
  const { barbershop, isMaster, refetch } = useUserRole();
  
  const [saving, setSaving] = useState(false);
  const [showSubscriptionSheet, setShowSubscriptionSheet] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const [name, setName] = useState(barber?.name || '');
  const [phone, setPhone] = useState(barber?.phone || '');

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

  const handlePlanChange = async (newPlan: PlanType) => {
    if (!barbershop || !isMaster) return;
    
    setUpdatingPlan(true);
    try {
      const newLimit = PLAN_LIMITS[newPlan];
      
      const { error } = await supabase
        .from('barbershops')
        .update({ 
          plan: newPlan,
          max_barbers: newLimit
        })
        .eq('id', barbershop.id);

      if (error) throw error;
      
      toast.success(`Plano alterado para ${PLAN_NAMES[newPlan]}`);
      refetch();
    } catch (error) {
      console.error('Erro ao alterar plano:', error);
      toast.error('Erro ao alterar plano');
    } finally {
      setUpdatingPlan(false);
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

      {/* Subscription Card - Only for Masters */}
      {isMaster && barbershop && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Assinatura
            </CardTitle>
            <CardDescription>
              Gerencie o plano da sua barbearia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subscription Status Warning */}
            {!barbershop.subscription_active && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Assinatura inativa</p>
                  <p className="text-sm text-muted-foreground">
                    Algumas funcionalidades estão bloqueadas
                  </p>
                </div>
              </div>
            )}
            
            <button
              onClick={() => setShowSubscriptionSheet(true)}
              disabled={updatingPlan}
              className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div>
                <p className="font-medium">Plano atual</p>
                <p className="text-sm text-muted-foreground">
                  {PLAN_NAMES[barbershop.plan]} – {PLAN_DISPLAY_LABELS[barbershop.plan]}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      )}

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

      {/* Subscription Sheet */}
      {barbershop && (
        <SubscriptionSheet
          open={showSubscriptionSheet}
          onOpenChange={setShowSubscriptionSheet}
          currentPlan={barbershop.plan}
          onSelectPlan={isMaster ? handlePlanChange : undefined}
        />
      )}
    </div>
  );
};

export default Configuracoes;
