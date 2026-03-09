import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, Service, Barber } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Sparkles as Scissors, Plus, PenLine as Pencil, Trash2, Loader2, Timer as Clock, UsersRound as Users, Camera, X, ImagePlus } from 'lucide-react';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ContextType {
  barber: Barber | null;
  barbershop: { id: string } | null;
  isMaster: boolean;
}

interface ServiceWithBarbers extends Service {
  assignedBarberIds: string[];
  myPhotoUrl?: string | null;
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
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedBarberIds, setSelectedBarberIds] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-barber photo upload state
  const [uploadingServicePhoto, setUploadingServicePhoto] = useState<string | null>(null);
  const servicePhotoInputRef = useRef<HTMLInputElement>(null);
  const [activeServiceForPhoto, setActiveServiceForPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (barbershop) {
      fetchData();
    }
  }, [barbershop]);

  const fetchData = async () => {
    if (!barbershop || !barber) return;

    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('name');

      if (servicesError) throw servicesError;

      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .eq('is_active', true)
        .order('name');

      if (barbersError) throw barbersError;

      const { data: barberServicesData, error: bsError } = await supabase
        .from('barber_services')
        .select('barber_id, service_id');

      if (bsError) throw bsError;

      // Fetch my service photos
      const { data: myPhotos } = await supabase
        .from('barber_service_photos')
        .select('service_id, photo_url')
        .eq('barber_id', barber.id);

      const photoMap = new Map((myPhotos || []).map(p => [p.service_id, p.photo_url]));

      const servicesWithBarbers = (servicesData || []).map(service => ({
        ...service,
        assignedBarberIds: (barberServicesData || [])
          .filter(bs => bs.service_id === service.id)
          .map(bs => bs.barber_id),
        myPhotoUrl: photoMap.get(service.id) || null,
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
    setIsGlobal(true);
    setSelectedBarberIds([]);
    setEditingService(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openEditDialog = (service: ServiceWithBarbers) => {
    setEditingService(service);
    setName(service.name);
    setPrice(String(service.price));
    setDuration(String(service.duration_minutes));
    setActive(service.active);
    setIsGlobal(service.is_global);
    setSelectedBarberIds(service.assignedBarberIds);
    setPhotoFile(null);
    setPhotoPreview(service.photo_url || null);
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setSelectedBarberIds(barbers.map(b => b.id));
    setDialogOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const uploadPhoto = async (serviceId: string): Promise<string | null> => {
    if (!photoFile) return null;
    setUploadingPhoto(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `${barbershop!.id}/${serviceId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('service-photos')
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('service-photos')
        .getPublicUrl(filePath);

      return urlData.publicUrl + '?t=' + Date.now();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar foto');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle per-barber service photo upload
  const handleServicePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, serviceId: string) => {
    const file = e.target.files?.[0];
    if (!file || !barber) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingServicePhoto(serviceId);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${barber.id}/${serviceId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('service-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('service-photos')
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl + '?t=' + Date.now();

      // Upsert into barber_service_photos
      const { error: dbError } = await supabase
        .from('barber_service_photos')
        .upsert({
          barber_id: barber.id,
          service_id: serviceId,
          photo_url: photoUrl,
        }, { onConflict: 'barber_id,service_id' });

      if (dbError) throw dbError;

      toast.success('Foto do serviço atualizada!');
      fetchData();
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploadingServicePhoto(null);
      setActiveServiceForPhoto(null);
    }
  };

  const removeServicePhoto = async (serviceId: string) => {
    if (!barber) return;
    try {
      await supabase
        .from('barber_service_photos')
        .delete()
        .eq('barber_id', barber.id)
        .eq('service_id', serviceId);

      toast.success('Foto removida');
      fetchData();
    } catch (error) {
      toast.error('Erro ao remover foto');
    }
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
    if (!duration || Number(duration) < 15) {
      toast.error('A duração mínima é 15 minutos');
      return;
    }

    setSaving(true);
    try {
      let serviceId: string;

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: name.trim(),
            price: Number(price),
            duration_minutes: Number(duration),
            active,
            is_global: isGlobal,
          })
          .eq('id', editingService.id);

        if (error) throw error;
        serviceId = editingService.id;

        await supabase
          .from('barber_services')
          .delete()
          .eq('service_id', serviceId);

        toast.success('Serviço atualizado');
      } else {
        const { data: newService, error } = await supabase
          .from('services')
          .insert({
            barber_id: barber.id,
            barbershop_id: barbershop.id,
            name: name.trim(),
            price: Number(price),
            duration_minutes: Number(duration),
            active,
            is_global: isGlobal,
          })
          .select()
          .single();

        if (error) throw error;
        serviceId = newService.id;
        toast.success('Serviço criado');
      }

      // Upload global service photo if selected
      if (photoFile) {
        const photoUrl = await uploadPhoto(serviceId);
        if (photoUrl) {
          await supabase
            .from('services')
            .update({ photo_url: photoUrl })
            .eq('id', serviceId);
        }
      } else if (!photoPreview && editingService?.photo_url) {
        await supabase
          .from('services')
          .update({ photo_url: null })
          .eq('id', serviceId);
      }

      if (!isGlobal && selectedBarberIds.length > 0) {
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
      await supabase
        .from('barber_services')
        .delete()
        .eq('service_id', id);

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
              : 'Adicione suas fotos de trabalho em cada serviço'}
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                {/* Global service photo upload (master only) */}
                <div className="space-y-2">
                  <Label>Foto padrão do serviço</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20 rounded-xl">
                        {photoPreview ? (
                          <AvatarImage src={photoPreview} alt="Foto do serviço" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="rounded-xl bg-primary/10">
                          <Scissors className="h-8 w-8 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        {photoPreview ? 'Trocar foto' : 'Adicionar foto'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">JPG ou PNG, até 5MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

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
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 22 }, (_, i) => (i + 3) * 5).map(min => (
                          <SelectItem key={min} value={String(min)}>
                            {min} min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_global">Serviço global</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Disponível para todos os profissionais automaticamente
                      </p>
                    </div>
                    <Switch
                      id="is_global"
                      checked={isGlobal}
                      onCheckedChange={setIsGlobal}
                    />
                  </div>
                </div>

                {!isGlobal && (
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
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={saving || uploadingPhoto}>
                  {saving || uploadingPhoto ? (
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

      {/* Hidden input for per-barber service photo */}
      <input
        ref={servicePhotoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (activeServiceForPhoto) {
            handleServicePhotoUpload(e, activeServiceForPhoto);
          }
        }}
        className="hidden"
      />

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
                    {/* Show my photo or global photo or fallback */}
                    <div className="relative group">
                      <Avatar className="h-14 w-14 rounded-xl flex-shrink-0">
                        {service.myPhotoUrl ? (
                          <AvatarImage src={service.myPhotoUrl} alt={service.name} className="object-cover" />
                        ) : service.photo_url ? (
                          <AvatarImage src={service.photo_url} alt={service.name} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="rounded-xl bg-primary/10">
                          <Scissors className="h-6 w-6 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      {/* Upload overlay */}
                      <button
                        type="button"
                        disabled={uploadingServicePhoto === service.id}
                        onClick={() => {
                          setActiveServiceForPhoto(service.id);
                          servicePhotoInputRef.current?.click();
                        }}
                        className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {uploadingServicePhoto === service.id ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5 text-white" />
                        )}
                      </button>
                      {/* Remove photo button */}
                      {service.myPhotoUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeServicePhoto(service.id);
                          }}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
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
                      {service.myPhotoUrl ? (
                        <Badge variant="secondary" className="text-xs mt-1.5">
                          📸 Minha foto
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveServiceForPhoto(service.id);
                            servicePhotoInputRef.current?.click();
                          }}
                          className="text-xs text-primary hover:underline mt-1.5 flex items-center gap-1"
                        >
                          <ImagePlus className="h-3 w-3" />
                          Adicionar minha foto
                        </button>
                      )}
                      {!service.active && (
                        <span className="text-xs text-muted-foreground mt-1 block">
                          Inativo
                        </span>
                      )}
                      {isMaster && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {service.is_global ? (
                            <Badge variant="secondary" className="text-xs">
                              🌐 Todos os barbeiros
                            </Badge>
                          ) : service.assignedBarberIds.length === 0 ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Nenhum barbeiro
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {service.assignedBarberIds.length} barbeiro(s)
                            </Badge>
                          )}
                        </div>
                      )}
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
