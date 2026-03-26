import { useState, useEffect, useRef } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  ImageIcon as Image, Upload, MapPin, Instagram, Send as MessageCircle, Link2, Save, Loader2,
  Camera, Copy, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, ExternalLink, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface PublicProfile {
  id: string;
  barbershop_id: string;
  foto_capa_url: string | null;
  logo_url: string | null;
  descricao: string | null;
  endereco: string | null;
  numero: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  instagram_url: string | null;
  whatsapp_numero: string | null;
  slug_personalizado: string | null;
}

const PerfilPublico = () => {
  const { barbershop, isMaster } = useUserRole();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [descricao, setDescricao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [whatsappNumero, setWhatsappNumero] = useState('');
  const [slugPersonalizado, setSlugPersonalizado] = useState('');
  const [fotoCapa, setFotoCapa] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (barbershop?.id) fetchProfile();
  }, [barbershop?.id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('barbershop_id', barbershop!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data as PublicProfile);
        setDescricao(data.descricao || '');
        setEndereco(data.endereco || '');
        setNumero(data.numero || '');
        setCidade(data.cidade || barbershop?.city || '');
        setEstado(data.estado || '');
        setCep(data.cep || '');
        setInstagramUrl(data.instagram_url || '');
        setWhatsappNumero(data.whatsapp_numero || '');
        setSlugPersonalizado(data.slug_personalizado || barbershop?.slug || '');
        setFotoCapa(data.foto_capa_url);
        setLogoUrl(data.logo_url);
      } else {
        setCidade(barbershop?.city || '');
        setSlugPersonalizado(barbershop?.slug || '');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar perfil público');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `${path}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('public-profiles')
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('public-profiles')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !barbershop) return;

    setUploadingCover(true);
    try {
      const url = await uploadImage(file, `${barbershop.id}/cover`);
      setFotoCapa(url);
      toast.success('Foto de capa enviada!');
    } catch (err) {
      toast.error('Erro ao enviar foto de capa');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !barbershop) return;

    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, `${barbershop.id}/logo`);
      setLogoUrl(url);
      toast.success('Logo enviada!');
    } catch (err) {
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleSave = async () => {
    if (!barbershop) return;
    setSaving(true);

    try {
      const profileData = {
        barbershop_id: barbershop.id,
        foto_capa_url: fotoCapa,
        logo_url: logoUrl,
        descricao: descricao || null,
        endereco: endereco || null,
        numero: numero || null,
        cidade: cidade || null,
        estado: estado || null,
        cep: cep || null,
        instagram_url: instagramUrl || null,
        whatsapp_numero: whatsappNumero || null,
        slug_personalizado: slugPersonalizado || null,
      };

      if (profile) {
        const { error } = await supabase
          .from('public_profiles')
          .update(profileData)
          .eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('public_profiles')
          .insert(profileData);
        if (error) throw error;
      }

      // Also update barbershop city if changed
      if (cidade !== barbershop.city) {
        await supabase
          .from('barbershops')
          .update({ city: cidade })
          .eq('id', barbershop.id);
      }

      toast.success('Perfil público salvo com sucesso!');
      fetchProfile();
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('slug_personalizado')) {
        toast.error('Este slug já está em uso. Escolha outro.');
      } else {
        toast.error('Erro ao salvar perfil público');
      }
    } finally {
      setSaving(false);
    }
  };

  const publicSlug = slugPersonalizado || barbershop?.slug || '';
  const publicLinkReal = publicSlug
    ? `${window.location.origin}/barbearia/${publicSlug}`
    : '';
  const publicLinkDisplay = publicSlug ? `bookify.app/${publicSlug}` : '';

  const handleCopyLink = async () => {
    if (!publicLinkReal) return;
    try {
      await navigator.clipboard.writeText(publicLinkReal);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  if (!isMaster) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Acesso restrito</h2>
        <p className="text-muted-foreground">Apenas o administrador pode editar o perfil público.</p>
      </div>
    );
  }

  if (loading) {
    return <PerfilPublicoSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Perfil Público</h1>
        <p className="text-muted-foreground">Configure sua página pública de agendamento</p>
      </div>

      {/* Public Link Preview */}
      {publicLinkDisplay && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Seu link público</span>
            </div>
            <div className="flex gap-2">
              <Input value={publicLinkDisplay} readOnly className="font-mono text-xs bg-background" />
              <Button
                onClick={handleCopyLink}
                variant={copied ? 'default' : 'outline'}
                size="icon"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(publicLinkReal, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cover Photo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" />
            Foto de Capa
          </CardTitle>
          <CardDescription>Imagem exibida no topo da sua página pública</CardDescription>
        </CardHeader>
        <CardContent>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          {fotoCapa ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={fotoCapa} alt="Capa" className="w-full h-48 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => coverInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Trocar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setFotoCapa(null)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Remover
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-32 border-dashed flex flex-col gap-2"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
            >
              {uploadingCover ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              <span className="text-sm">{uploadingCover ? 'Enviando...' : 'Enviar foto de capa'}</span>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="h-5 w-5" />
            Logo
          </CardTitle>
          <CardDescription>Logo da sua barbearia</CardDescription>
        </CardHeader>
        <CardContent>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative group">
                <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-border" />
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => setLogoUrl(null)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-20 h-20 border-dashed rounded-2xl flex flex-col gap-1"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              </Button>
            )}
            <div className="text-sm text-muted-foreground">
              <p>Recomendado: 200x200px</p>
              <p>Formato: JPG, PNG ou WebP</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📝 Descrição</CardTitle>
          <CardDescription>Apresente sua barbearia para os clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Descreva sua barbearia, serviços oferecidos, diferenciais..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Endereço
          </CardTitle>
          <CardDescription>Localização da sua barbearia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Rua</Label>
              <Input placeholder="Rua, Avenida..." value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input placeholder="123" value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input placeholder="São Paulo" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input placeholder="SP" value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input
              placeholder="00000-000"
              value={cep}
              onChange={(e) => setCep(formatCep(e.target.value))}
              maxLength={9}
            />
          </div>

          {/* Map Preview */}
          {cidade && (
            <div className="rounded-xl overflow-hidden border border-border h-48">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  [endereco, numero, cidade, estado, cep].filter(Boolean).join(', ')
                )}&output=embed`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Instagram className="h-5 w-5" />
            Instagram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="https://instagram.com/suabarbearia"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </CardTitle>
          <CardDescription>Um botão flutuante de WhatsApp aparecerá na página pública</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="(00) 00000-0000"
            value={whatsappNumero}
            onChange={(e) => setWhatsappNumero(formatPhone(e.target.value))}
            maxLength={15}
          />
        </CardContent>
      </Card>

      {/* Custom Slug */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5" />
            Slug Personalizado
          </CardTitle>
          <CardDescription>Personalize o endereço da sua página pública</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="minha-barbearia"
            value={slugPersonalizado}
            onChange={(e) => setSlugPersonalizado(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          />
          {slugPersonalizado && (
            <p className="text-sm text-muted-foreground font-mono">
              {window.location.origin}/barbearia/{slugPersonalizado}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full btn-primary-gradient h-12 text-base rounded-xl"
        size="lg"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-5 w-5" />
            Salvar Perfil Público
          </>
        )}
      </Button>
    </div>
  );
};

export default PerfilPublico;
