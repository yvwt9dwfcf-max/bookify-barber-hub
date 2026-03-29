import { useState, useEffect, useRef } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload, MapPin, Instagram, Send as MessageCircle, Link2, Save, Loader2,
  Camera, Copy, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, ExternalLink, Trash2, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { PerfilPublicoSkeleton } from '@/components/painel/skeletons';
import { motion } from 'framer-motion';

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
    const { error } = await supabase.storage.from('public-profiles').upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('public-profiles').getPublicUrl(fileName);
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
    } catch { toast.error('Erro ao enviar foto de capa'); }
    finally { setUploadingCover(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !barbershop) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, `${barbershop.id}/logo`);
      setLogoUrl(url);
      toast.success('Logo enviada!');
    } catch { toast.error('Erro ao enviar logo'); }
    finally { setUploadingLogo(false); }
  };

  const formatPhone = (value: string) => {
    const n = value.replace(/\D/g, '');
    if (n.length <= 2) return n;
    if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    if (n.length <= 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7, 11)}`;
  };

  const formatCep = (value: string) => {
    const n = value.replace(/\D/g, '');
    if (n.length <= 5) return n;
    return `${n.slice(0, 5)}-${n.slice(5, 8)}`;
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
        const { error } = await supabase.from('public_profiles').update(profileData).eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('public_profiles').insert(profileData);
        if (error) throw error;
      }
      if (cidade !== barbershop.city) {
        await supabase.from('barbershops').update({ city: cidade }).eq('id', barbershop.id);
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
    } finally { setSaving(false); }
  };

  const publicSlug = slugPersonalizado || barbershop?.slug || '';
  const publicLinkReal = publicSlug ? `${window.location.origin}/barbearia/${publicSlug}` : '';
  const publicLinkDisplay = publicSlug ? `bookify.app/${publicSlug}` : '';

  const handleCopyLink = async () => {
    if (!publicLinkReal) return;
    try {
      await navigator.clipboard.writeText(publicLinkReal);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Erro ao copiar'); }
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

  if (loading) return <PerfilPublicoSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl space-y-5 pb-8"
    >
      {/* Header with link */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Perfil Público</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sua página de agendamento online</p>
        </div>
        {publicLinkReal && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-xs"
            onClick={() => window.open(publicLinkReal, '_blank')}
          >
            <Globe className="h-3.5 w-3.5" />
            Ver página
          </Button>
        )}
      </div>

      {/* Link público — compact */}
      {publicLinkDisplay && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <Link2 className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-mono text-muted-foreground truncate flex-1">{publicLinkDisplay}</span>
          <Button
            onClick={handleCopyLink}
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
          >
            {copied ? <CheckCircle className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      )}

      {/* === IMAGENS: Capa + Logo unificados === */}
      <Section title="Imagens" icon={<Camera className="h-4 w-4" />}>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

        {/* Cover */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Foto de capa</Label>
          {fotoCapa ? (
            <div className="relative rounded-xl overflow-hidden group">
              <img src={fotoCapa} alt="Capa" className="w-full h-40 object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => coverInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1" /> Trocar
                </Button>
                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setFotoCapa(null)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
            >
              {uploadingCover ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span className="text-xs">{uploadingCover ? 'Enviando...' : 'Adicionar foto de capa'}</span>
            </button>
          )}
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4 pt-1">
          {logoUrl ? (
            <div className="relative group shrink-0">
              <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-border" />
              <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1">
                <button className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="h-3 w-3" />
                </button>
                <button className="h-7 w-7 rounded-lg bg-destructive flex items-center justify-center" onClick={() => setLogoUrl(null)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-16 h-16 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Logo</Label>
            <p className="text-[11px] text-muted-foreground/60">200×200px · JPG, PNG ou WebP</p>
          </div>
        </div>
      </Section>

      {/* === SOBRE === */}
      <Section title="Sobre" icon={<span className="text-sm">📝</span>}>
        <Textarea
          placeholder="Descreva sua barbearia, serviços, diferenciais..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
      </Section>

      {/* === ENDEREÇO === */}
      <Section title="Endereço" icon={<MapPin className="h-4 w-4" />}>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-3 space-y-1.5">
            <Label className="text-xs">Rua</Label>
            <Input placeholder="Rua, Avenida..." value={endereco} onChange={(e) => setEndereco(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nº</Label>
            <Input placeholder="123" value={numero} onChange={(e) => setNumero(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Cidade</Label>
            <Input placeholder="São Paulo" value={cidade} onChange={(e) => setCidade(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">UF</Label>
            <Input placeholder="SP" value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} className="h-9 text-sm" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">CEP</Label>
            <Input placeholder="00000-000" value={cep} onChange={(e) => setCep(formatCep(e.target.value))} maxLength={9} className="h-9 text-sm" />
          </div>
        </div>

        {cidade && (
          <div className="rounded-xl overflow-hidden border border-border h-36 mt-1">
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
      </Section>

      {/* === REDES & CONTATO (agrupados) === */}
      <Section title="Redes & Contato" icon={<MessageCircle className="h-4 w-4" />}>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Instagram className="h-3.5 w-3.5" /> Instagram
          </Label>
          <Input
            placeholder="https://instagram.com/suabarbearia"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </Label>
          <Input
            placeholder="(00) 00000-0000"
            value={whatsappNumero}
            onChange={(e) => setWhatsappNumero(formatPhone(e.target.value))}
            maxLength={15}
            className="h-9 text-sm"
          />
          <p className="text-[11px] text-muted-foreground/60">Botão flutuante aparecerá na página pública</p>
        </div>
      </Section>

      {/* === LINK PERSONALIZADO === */}
      <Section title="Link personalizado" icon={<Link2 className="h-4 w-4" />}>
        <Input
          placeholder="minha-barbearia"
          value={slugPersonalizado}
          onChange={(e) => setSlugPersonalizado(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          className="h-9 text-sm font-mono"
        />
        {slugPersonalizado && (
          <p className="text-[11px] text-muted-foreground/60 font-mono">
            {window.location.origin}/barbearia/{slugPersonalizado}
          </p>
        )}
      </Section>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full btn-primary-gradient h-11 text-sm font-semibold rounded-xl"
        size="lg"
      >
        {saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
        ) : (
          <><Save className="mr-2 h-4 w-4" /> Salvar Perfil Público</>
        )}
      </Button>
    </motion.div>
  );
};

/* Reusable section wrapper — replaces individual Cards */
const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      {icon}
      {title}
    </div>
    {children}
  </div>
);

export default PerfilPublico;
