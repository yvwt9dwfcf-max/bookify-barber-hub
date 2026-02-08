import { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useBarbershopBarbers } from '@/hooks/useBarbershopBarbers';
import { supabase, Barber, BarberPermissions, PLAN_NAMES } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Users, Plus, Loader2, Trash2, Settings, Mail, Lock, User, Crown, AlertTriangle, Copy, Link as LinkIcon, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BarberWithPermissions extends Barber {
  permissions?: BarberPermissions;
}

const Barbeiros = () => {
  const { barbershop, isMaster } = useUserRole();
  const { barbers, loading, canAddMore, currentCount, maxBarbers, refetch } = useBarbershopBarbers();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<BarberWithPermissions | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Add barber form
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberEmail, setNewBarberEmail] = useState('');
  const [newBarberPassword, setNewBarberPassword] = useState('');

  // Permissions form
  const [canEditOwn, setCanEditOwn] = useState(true);
  const [canViewOthers, setCanViewOthers] = useState(false);
  const [canEditOthers, setCanEditOthers] = useState(false);

  const resetAddForm = () => {
    setNewBarberName('');
    setNewBarberEmail('');
    setNewBarberPassword('');
  };

  const handleAddBarber = async () => {
    if (!barbershop || !isMaster) return;

    if (!newBarberName.trim() || !newBarberEmail.trim()) {
      toast.error('Preencha nome e email');
      return;
    }

    if (!canAddMore) {
      toast.error(`Limite de ${maxBarbers} barbeiros atingido`);
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-barber`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            name: newBarberName.trim(),
            email: newBarberEmail.trim(),
            password: newBarberPassword || undefined,
            barbershop_id: barbershop.id,
            permissions: {
              can_edit_own_schedule: true,
              can_view_others_schedule: false,
              can_edit_others_schedule: false,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao adicionar barbeiro');
      }

      toast.success(result.message || 'Barbeiro adicionado com sucesso!');
      resetAddForm();
      setShowAddDialog(false);
      refetch();
    } catch (error: any) {
      console.error('Erro ao adicionar barbeiro:', error);
      toast.error(error.message || 'Erro ao adicionar barbeiro');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPermissions = (barber: BarberWithPermissions) => {
    setSelectedBarber(barber);
    setCanEditOwn(barber.permissions?.can_edit_own_schedule ?? true);
    setCanViewOthers(barber.permissions?.can_view_others_schedule ?? false);
    setCanEditOthers(barber.permissions?.can_edit_others_schedule ?? false);
    setShowPermissionsDialog(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedBarber) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('barber_permissions')
        .upsert({
          barber_id: selectedBarber.id,
          can_edit_own_schedule: canEditOwn,
          can_view_others_schedule: canViewOthers,
          can_edit_others_schedule: canEditOthers,
        }, {
          onConflict: 'barber_id',
        });

      if (error) throw error;

      toast.success('Permissões atualizadas!');
      setShowPermissionsDialog(false);
      await refetch();
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      toast.error('Erro ao atualizar permissões');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBarber = async (barber: BarberWithPermissions) => {
    try {
      // Soft delete - just set is_active to false
      const { error } = await supabase
        .from('barbers')
        .update({ is_active: false })
        .eq('id', barber.id);

      if (error) throw error;

      toast.success('Barbeiro removido');
      refetch();
    } catch (error) {
      console.error('Erro ao remover barbeiro:', error);
      toast.error('Erro ao remover barbeiro');
    }
  };

  const copyBarberLink = async (barberId: string) => {
    const link = `${window.location.origin}/b/${barberId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(barberId);
      toast.success('Link copiado!');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  if (!isMaster) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso restrito</h2>
          <p className="text-muted-foreground">
            Apenas o administrador pode gerenciar barbeiros.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie os barbeiros da sua barbearia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {currentCount}/{maxBarbers} barbeiros
          </Badge>
          <Badge variant="secondary">
            Plano {PLAN_NAMES[barbershop?.plan || 'basic']}
          </Badge>
        </div>
      </div>

      {/* Add Barber Button */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button 
            className="btn-primary-gradient"
            disabled={!canAddMore}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Barbeiro
          </Button>
        </DialogTrigger>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Barbeiro</DialogTitle>
          <DialogDescription>
            Adicione um novo membro à equipe. Se o email já existir, o usuário será vinculado automaticamente.
          </DialogDescription>
        </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="barber-name">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="barber-name"
                  placeholder="Nome do barbeiro"
                  value={newBarberName}
                  onChange={(e) => setNewBarberName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barber-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="barber-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newBarberEmail}
                  onChange={(e) => setNewBarberEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="barber-password">Senha inicial (opcional)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="barber-password"
                  type="password"
                  placeholder="Necessária apenas para novos usuários"
                  value={newBarberPassword}
                  onChange={(e) => setNewBarberPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Deixe em branco se o usuário já possui conta. Para novos usuários, mínimo 6 caracteres.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddBarber} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!canAddMore && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium">Limite de barbeiros atingido</p>
              <p className="text-sm text-muted-foreground">
                Seu plano permite até {maxBarbers} barbeiros. Faça upgrade para adicionar mais.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barbers List */}
      <div className="grid gap-4">
        {barbers.map((barber) => (
          <Card key={barber.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{barber.name}</h3>
                    {barber.auth_id === barbershop?.id && (
                      <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0">
                        <Crown className="h-3 w-3" />
                        Master
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground break-all" style={{ overflowWrap: 'anywhere' }}>
                    {barber.email}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {barber.permissions?.can_edit_own_schedule && (
                      <Badge variant="outline" className="text-xs">Edita própria agenda</Badge>
                    )}
                    {barber.permissions?.can_view_others_schedule && (
                      <Badge variant="outline" className="text-xs">Vê agendas de outros</Badge>
                    )}
                    {barber.permissions?.can_edit_others_schedule && (
                      <Badge variant="outline" className="text-xs">Cria para outros</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyBarberLink(barber.id)}
                    title="Copiar link de agendamento"
                  >
                    {copiedLink === barber.id ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenPermissions(barber)}
                    title="Configurar permissões"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Remover barbeiro"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover barbeiro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O barbeiro {barber.name} será desativado. Os agendamentos existentes serão mantidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveBarber(barber)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {barbers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhum barbeiro cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione os membros da sua equipe para começar
            </p>
          </CardContent>
        </Card>
      )}

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões de {selectedBarber?.name}</DialogTitle>
            <DialogDescription>
              Configure o que este barbeiro pode fazer no sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label>Editar própria agenda</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pode criar, editar e cancelar seus próprios agendamentos
                </p>
              </div>
              <Switch
                checked={canEditOwn}
                onCheckedChange={setCanEditOwn}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label>Pode visualizar agenda de outros profissionais</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permite ver os agendamentos dos demais membros da equipe
                </p>
              </div>
              <Switch
                checked={canViewOthers}
                onCheckedChange={setCanViewOthers}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label>Pode criar agendamentos para outros profissionais</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permite criar, editar e cancelar agendamentos de outros membros
                </p>
              </div>
              <Switch
                checked={canEditOthers}
                onCheckedChange={setCanEditOthers}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Barbeiros;
