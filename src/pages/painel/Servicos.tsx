import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, Service, Barber } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Scissors, Plus, Pencil, Trash2, Loader2, Clock, Users } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/premium-skeleton';
import { toast } from 'sonner';
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
import { Badge } from '@/components/ui/badge';

interface ContextType {
  barber: Barber | null;
  barbershop: { id: string } | null;
  isMaster: boolean;
}

interface ServiceWithBarbers extends Service {
  assignedBarberIds: string[];
}

const Servicos = () => {
  const { barber, barbershop, isMaster } = useOutletContext<ContextType>();
  const [services, setServices] = useState<ServiceWithBarbers[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithBarbers | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [active, setActive] = useState(true);
  const [selectedBarberIds, setSelectedBarberIds] = useState<string[]>([]);

  useEffect(() => {
    if (barbershop) {
      fetchData();
    }
  }, [barbershop]);

  const fetchData = async () => {
    if (!barbershop) return;

    try {
      // Fetch services da barbearia
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('name');

      if (servicesError) throw servicesError;

      // Fetch barbers da barbearia
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .eq('is_active', true)
        .order('name');

      if (barbersError) throw barbersError;

      // Fetch barber_services associations
      const { data: barberServicesData, error: bsError } = await supabase
        .from('barber_services')
        .select('barber_id, service_id');

      if (bsError) throw bsError;

      // Map services with their assigned barbers
      const servicesWithBarbers = (servicesData || []).map(service => ({
        ...service,
        assignedBarberIds: (barberServicesData || [])
          .filter(bs => bs.service_id === service.id)
          .map(bs => bs.barber_id)
      }));

      setServices(servicesWithBarbers);
      setBarbers(barbersData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setDuration('30');
    setActive(true);
    setSelectedBarberIds([]);
    setEditingService(null);
  };

  const openEditDialog = (service: ServiceWithBarbers) => {
    setEditingService(service);
    setName(service.name);
    setPrice(String(service.price));
    setDuration(String(service.duration_minutes));
    setActive(service.active);
    setSelectedBarberIds(service.assignedBarberIds);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    // Por padrão, todos os barbeiros ativos são selecionados para novos serviços
    setSelectedBarberIds(barbers.map(b => b.id));
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!barbershop || !barber) return;
    if (!name.trim()) {
      toast.error('Digite o nome do serviço');
      return;
    }
    if (!price || Number(price) < 0) {
      toast.error('Digite um preço válido');
      return;
    }
    if (!duration || Number(duration) < 5) {
      toast.error('A duração mínima é 5 minutos');
      return;
    }

    setSaving(true);
    try {
      let serviceId: string;

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update({
            name: name.trim(),
            price: Number(price),
            duration_minutes: Number(duration),
            active,
          })
          .eq('id', editingService.id);

        if (error) throw error;
        serviceId = editingService.id;

        // Remove old associations
        await supabase
          .from('barber_services')
          .delete()
          .eq('service_id', serviceId);

        toast.success('Serviço atualizado');
      } else {
        // Create new service - belongs to barbershop
        const { data: newService, error } = await supabase
          .from('services')
          .insert({
            barber_id: barber.id, // Mantém para compatibilidade com RLS existente
            barbershop_id: barbershop.id,
            name: name.trim(),
            price: Number(price),
            duration_minutes: Number(duration),
            active,
          })
          .select()
          .single();

        if (error) throw error;
        serviceId = newService.id;
        toast.success('Serviço criado');
      }

      // Create barber_services associations
      if (selectedBarberIds.length > 0) {
        const associations = selectedBarberIds.map(barberId => ({
          barber_id: barberId,
          service_id: serviceId,
        }));

        const { error: assocError } = await supabase
          .from('barber_services')
          .insert(associations);

        if (assocError) {
          console.error('Erro ao associar barbeiros:', assocError);
        }
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error('Erro ao salvar serviço');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete associations first
      await supabase
        .from('barber_services')
        .delete()
        .eq('service_id', id);

      // Delete service
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Serviço excluído');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir serviço');
    }
  };

  const toggleBarber = (barberId: string) => {
    setSelectedBarberIds(prev => 
      prev.includes(barberId)
        ? prev.filter(id => id !== barberId)
        : [...prev, barberId]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-page-enter">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-muted/30 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground">
            {isMaster 
              ? 'Gerencie os serviços oferecidos pela barbearia'
              : 'Serviços oferecidos pela barbearia'}
          </p>
        </div>

        {isMaster && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="btn-primary-gradient" onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo serviço
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Editar serviço' : 'Novo serviço'}
                </DialogTitle>
                <DialogDescription>
                  {editingService 
                    ? 'Atualize as informações do serviço'
                    : 'Adicione um novo serviço à barbearia'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do serviço</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Corte masculino"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="30"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="5"
                      step="5"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Serviço ativo</Label>
                  <Switch
                    id="active"
                    checked={active}
                    onCheckedChange={setActive}
                  />
                </div>

                {/* Seleção de barbeiros */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Barbeiros que atendem este serviço
                  </Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                    {barbers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum barbeiro cadastrado
                      </p>
                    ) : (
                      barbers.map(b => (
                        <div key={b.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`barber-${b.id}`}
                            checked={selectedBarberIds.includes(b.id)}
                            onCheckedChange={() => toggleBarber(b.id)}
                          />
                          <label
                            htmlFor={`barber-${b.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {b.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={saving}>
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
        )}
      </div>

      {/* Services List */}
      {services.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Scissors className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              {isMaster 
                ? 'Adicione serviços para que clientes possam agendar.'
                : 'Aguarde o administrador cadastrar os serviços.'}
            </p>
            {isMaster && (
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar serviço
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} className={!service.active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Scissors className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.duration_minutes} min
                        </span>
                        <span className="font-medium text-primary">
                          {formatPrice(Number(service.price))}
                        </span>
                      </div>
                      {!service.active && (
                        <span className="text-xs text-muted-foreground mt-1 block">
                          Inativo
                        </span>
                      )}
                      {/* Mostrar barbeiros associados */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {service.assignedBarberIds.length === 0 ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Nenhum barbeiro
                          </Badge>
                        ) : service.assignedBarberIds.length === barbers.length ? (
                          <Badge variant="secondary" className="text-xs">
                            Todos os barbeiros
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {service.assignedBarberIds.length} barbeiro(s)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {isMaster && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(service)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O serviço "{service.name}" será permanentemente excluído.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(service.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Servicos;
