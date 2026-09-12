import { useState, useEffect, useRef } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TimeInput } from '@/components/ui/TimeInput';
import {
  Upload, MapPin, Instagram, Send as MessageCircle, Link2, Save, Loader2,
  Camera, Copy, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, ExternalLink, Trash2, Globe,
  CalendarCheck, Clock, Palette, Images, Plus, Check
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
  booking_enabled: boolean;
  booking_24h: boolean;
  booking_start_time: string;
  booking_end_time: string;
  theme_style: 'editorial' | 'urbano';
  font_style: 'playfair' | 'luckiest_guy';
  accent_color: string;
  gallery_enabled: boolean;
}

interface GalleryPhoto {
  id: string;
  barbershop_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

const ACCENT_COLORS = ['#22C55E', '#4DA6FF', '#8B1E2B', '#F2C94C', '#A855F7', '#F2EEE4'];

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
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [booking24h, setBooking24h] = useState(true);
  const [bookingStart, setBookingStart] = useState('08:00');
  const [bookingEnd, setBookingEnd] = useState('22:00');
  const [bookingSaveStatus, setBookingSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [themeStyle, setThemeStyle] = useState<'editorial' | 'urbano'>('editorial');
  const [fontStyle, setFontStyle] = useState<'playfair' | 'luckiest_guy'>('playfair');
  const [accentColor, setAccentColor] = useState('#22C55E');
  const [galleryEnabled, setGalleryEnabled] = useState(true);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (barbershop?.id) fetchProfile();
  }, [barbershop?.id]);

  const fetchProfile = async () => {
    try {
      if (!barbershop?.id) return;
      const [profileResult, galleryResult] = await Promise.all([
        supabase
          .from('public_profiles')
          .select('*')
          .eq('barbershop_id', barbershop.id)
          .maybeSingle(),
        supabase
          .from('barbershop_gallery')
          .select('*')
          .eq('barbershop_id', barbershop.id)
          .order('sort_order', { ascending: true }),
      ]);
      const { data, error } = profileResult;
      if (error) throw error;
      if (galleryResult.error) throw galleryResult.error;
      setGallery((galleryResult.data || []) as GalleryPhoto[]);
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
        setBookingEnabled((data as any).booking_enabled ?? true);
        setBooking24h((data as any).booking_24h ?? true);
        setBookingStart(((data as any).booking_start_time || '08:00').slice(0, 5));
        setBookingEnd(((data as any).booking_end_time || '22:00').slice(0, 5));
        setThemeStyle(data.theme_style === 'urbano' ? 'urbano' : 'editorial');
        setFontStyle(data.font_style === 'luckiest_guy' ? 'luckiest_guy' : 'playfair');
        setAccentColor(data.accent_color || '#22C55E');
        setGalleryEnabled(data.gallery_enabled ?? true);
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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !barbershop) return;
    setUploadingGallery(true);
    try {
      let nextOrder = gallery.reduce((max, photo) => Math.max(max, photo.sort_order), -1) + 1;
      const newPhotos: GalleryPhoto[] = [];

      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg';
        const storagePath = `${barbershop.id}/gallery/${Date.now()}-${nextOrder}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('gallery-photos')
          .upload(storagePath, file, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('gallery-photos').getPublicUrl(storagePath);
        const { data: inserted, error: insertError } = await supabase
          .from('barbershop_gallery')
          .insert({
            barbershop_id: barbershop.id,
            image_url: urlData.publicUrl,
            sort_order: nextOrder,
          })
          .select()
          .single();

        if (insertError) {
          await supabase.storage.from('gallery-photos').remove([storagePath]);
          throw insertError;
        }
        newPhotos.push(inserted as GalleryPhoto);
        nextOrder += 1;
      }

      setGallery((current) => [...current, ...newPhotos].sort((a, b) => a.sort_order - b.sort_order));
      toast.success(files.length > 1 ? `${files.length} fotos adicionadas` : 'Foto adicionada');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao adicionar fotos à galeria');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const getStoragePath = (url: string) => {
    const marker = '/storage/v1/object/public/gallery-photos/';
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0]);
  };

  const handleDeleteGalleryPhoto = async (photo: GalleryPhoto) => {
    setDeletingPhotoId(photo.id);
    try {
      const { error } = await supabase.from('barbershop_gallery').delete().eq('id', photo.id);
      if (error) throw error;

      const storagePath = getStoragePath(photo.image_url);
      if (storagePath) {
        const { error: storageError } = await supabase.storage.from('gallery-photos').remove([storagePath]);
        if (storageError) console.error(storageError);
      }
      setGallery((current) => current.filter((item) => item.id !== photo.id));
      toast.success('Foto removida');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover foto');
    } finally {
      setDeletingPhotoId(null);
    }
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

  const handleSaveAppearance = async () => {
    if (!barbershop) return;
    setSavingAppearance(true);
    const appearanceData = {
      barbershop_id: barbershop.id,
      theme_style: themeStyle,
      font_style: fontStyle,
      accent_color: accentColor,
      gallery_enabled: galleryEnabled,
    };

    try {
      if (profile) {
        const { data, error } = await supabase
          .from('public_profiles')
          .update(appearanceData)
          .eq('id', profile.id)
          .select()
          .single();
        if (error) throw error;
        setProfile(data as PublicProfile);
      } else {
        const { data, error } = await supabase
          .from('public_profiles')
          .insert(appearanceData)
          .select()
          .single();
        if (error) throw error;
        setProfile(data as PublicProfile);
      }
      toast.success('Aparência salva');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar aparência');
    } finally {
      setSavingAppearance(false);
    }
  };

  // Auto-save booking gating fields without full form save
  const saveBookingSettings = async (patch: {
    booking_enabled?: boolean;
    booking_24h?: boolean;
    booking_start_time?: string;
    booking_end_time?: string;
  }) => {
    if (!barbershop) return;
    setBookingSaveStatus('saving');
    try {
      if (profile) {
        const { error } = await supabase.from('public_profiles').update(patch).eq('id', profile.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('public_profiles')
          .insert({ barbershop_id: barbershop.id, ...patch })
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) setProfile(data as PublicProfile);
      }
      setBookingSaveStatus('saved');
      setTimeout(() => setBookingSaveStatus('idle'), 1500);
    } catch {
      setBookingSaveStatus('idle');
      toast.error('Erro ao salvar');
    }
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
    const barberSlug = profile?.slug_personalizado || barbershop?.slug || '';
    const barberLinkReal = barberSlug ? `${window.location.origin}/barbearia/${barberSlug}` : '';
    const barberLinkDisplay = barberSlug ? `bookify.app/${barberSlug}` : '';

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md mx-auto py-12 space-y-6"
      >
        <div className="text-center space-y-2">
          <Globe className="h-10 w-10 mx-auto text-primary" />
          <h2 className="text-xl font-bold">Link de Agendamento</h2>
          <p className="text-sm text-muted-foreground">Compartilhe com seus clientes para receberem agendamentos online.</p>
        </div>

        {barberLinkReal ? (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-mono text-muted-foreground truncate flex-1">{barberLinkDisplay}</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(barberLinkReal);
                    setCopied(true);
                    toast.success('Link copiado!');
                    setTimeout(() => setCopied(false), 2000);
                  } catch { toast.error('Erro ao copiar'); }
                }}
                variant="outline"
                className="flex-1 gap-1.5 text-sm"
              >
                {copied ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado!' : 'Copiar link'}
              </Button>
              <Button
                onClick={() => window.open(barberLinkReal, '_blank')}
                variant="outline"
                className="gap-1.5 text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 rounded-2xl border border-border bg-card">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">O administrador ainda não configurou o perfil público.</p>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Para editar o perfil público, peça ao administrador da barbearia.
        </p>
      </motion.div>
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
          <h1 className="text-xl font-bold">Perfil Público</h1>
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
              <img src={fotoCapa} alt="Foto de capa do perfil da barbearia" className="w-full h-40 object-cover" />
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
              <img src={logoUrl} alt="Logo da barbearia" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-border" />
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

      {/* === APARÊNCIA === */}
      <Section title="Aparência" icon={<Palette className="h-4 w-4 text-primary" />} editorial>
        <div className="space-y-2.5">
          <p className="font-editorial-mono text-[10px] uppercase text-muted-foreground">Estilo</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={themeStyle === 'editorial'}
              onClick={() => setThemeStyle('editorial')}
              className={`overflow-hidden rounded-xl border text-left transition-colors ${themeStyle === 'editorial' ? 'border-primary' : 'border-border hover:border-muted-foreground/40'}`}
            >
              <div className="flex h-24 items-center justify-center bg-background p-3">
                <span className="font-display text-xl text-[hsl(var(--paper))]">Barbearia</span>
              </div>
              <div className="border-t border-border bg-card px-3 py-2.5 text-sm font-medium">Editorial</div>
            </button>
            <button
              type="button"
              aria-pressed={themeStyle === 'urbano'}
              onClick={() => setThemeStyle('urbano')}
              className={`overflow-hidden rounded-xl border text-left transition-colors ${themeStyle === 'urbano' ? 'border-primary' : 'border-border hover:border-muted-foreground/40'}`}
            >
              <div className="flex h-24 items-center justify-center bg-background p-3">
                <span className="font-urban-preview text-xl text-[#4DA6FF]">BARBEARIA</span>
              </div>
              <div className="border-t border-border bg-card px-3 py-2.5 text-sm font-medium">Urbano</div>
            </button>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border pt-4">
          <p className="font-editorial-mono text-[10px] uppercase text-muted-foreground">Fonte</p>
          <div className="space-y-2">
            <button
              type="button"
              aria-pressed={fontStyle === 'playfair'}
              onClick={() => setFontStyle('playfair')}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${fontStyle === 'playfair' ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg text-foreground">Barbearia do João</p>
                <p className="font-editorial-mono text-[10px] text-muted-foreground">Formal · Editorial</p>
              </div>
              <SelectionRadio selected={fontStyle === 'playfair'} />
            </button>
            <button
              type="button"
              aria-pressed={fontStyle === 'luckiest_guy'}
              onClick={() => setFontStyle('luckiest_guy')}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${fontStyle === 'luckiest_guy' ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-urban-preview text-lg text-foreground">BARBEARIA DO JOÃO</p>
                <p className="font-editorial-mono text-[10px] text-muted-foreground">Ousada · Rua</p>
              </div>
              <SelectionRadio selected={fontStyle === 'luckiest_guy'} />
            </button>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="font-editorial-mono text-[10px] uppercase text-muted-foreground">Cor de destaque</p>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => {
              const selected = accentColor.toUpperCase() === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccentColor(color)}
                  aria-label={`Selecionar cor ${color}`}
                  aria-pressed={selected}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform ${selected ? 'scale-110 border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                >
                  {selected && <Check className={`h-4 w-4 ${color === '#F2EEE4' || color === '#F2C94C' ? 'text-background' : 'text-white'}`} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium">Mostrar galeria</p>
            <p className="text-[11px] text-muted-foreground">Se desativado, a seção some da página pública</p>
          </div>
          <Switch checked={galleryEnabled} onCheckedChange={setGalleryEnabled} />
        </div>

        <Button
          type="button"
          onClick={handleSaveAppearance}
          disabled={savingAppearance}
          className="btn-primary-solid h-11 w-full"
        >
          {savingAppearance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {savingAppearance ? 'Salvando...' : 'Salvar aparência'}
        </Button>
      </Section>

      {/* === GALERIA === */}
      <Section title="Galeria" icon={<Images className="h-4 w-4 text-primary" />} editorial>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleGalleryUpload}
        />

        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                <img src={photo.image_url} alt="Foto da galeria da barbearia" className="h-full w-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label="Excluir foto"
                  disabled={deletingPhotoId === photo.id}
                  onClick={() => handleDeleteGalleryPhoto(photo)}
                  className="absolute right-2 top-2 h-9 w-9 opacity-100 shadow-md sm:opacity-0 sm:group-hover:opacity-100"
                >
                  {deletingPhotoId === photo.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
            <Images className="mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Sua galeria está vazia</p>
            <p className="text-[11px] text-muted-foreground">Adicione fotos do ambiente e dos seus trabalhos</p>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => galleryInputRef.current?.click()}
          disabled={uploadingGallery}
          className="h-11 w-full border-dashed font-medium"
        >
          {uploadingGallery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {uploadingGallery ? 'Enviando fotos...' : 'Adicionar fotos'}
        </Button>
      </Section>

      {/* === AGENDAMENTO ONLINE === */}
      <Section title="Agendamento online" icon={<CalendarCheck className="h-4 w-4" />}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {bookingEnabled ? 'Ativado' : 'Desativado'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {bookingEnabled
                ? 'Clientes podem agendar pelo link público'
                : 'Sua página pública mostrará agenda indisponível'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {bookingSaveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            {bookingSaveStatus === 'saved' && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
            <Switch
              checked={bookingEnabled}
              onCheckedChange={(v) => {
                setBookingEnabled(v);
                saveBookingSettings({ booking_enabled: v });
              }}
            />
          </div>
        </div>

        {bookingEnabled && (
          <div className="pt-3 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Aceitar agendamentos 24h
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {booking24h ? 'Sem restrição de horário' : 'Apenas em horário definido'}
                </p>
              </div>
              <Switch
                checked={booking24h}
                onCheckedChange={(v) => {
                  setBooking24h(v);
                  saveBookingSettings({ booking_24h: v });
                }}
              />
            </div>

            {!booking24h && (
              <div className="flex items-center gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Abre</Label>
                  <TimeInput
                    value={bookingStart}
                    onChange={(v) => {
                      setBookingStart(v);
                      if (/^\d{2}:\d{2}$/.test(v)) saveBookingSettings({ booking_start_time: v });
                    }}
                  />
                </div>
                <div className="text-muted-foreground text-sm pt-5">—</div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fecha</Label>
                  <TimeInput
                    value={bookingEnd}
                    onChange={(v) => {
                      setBookingEnd(v);
                      if (/^\d{2}:\d{2}$/.test(v)) saveBookingSettings({ booking_end_time: v });
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground self-end pb-2 flex-1">
                  Fora desse horário, o cliente verá uma mensagem com o próximo horário disponível.
                </p>
              </div>
            )}
          </div>
        )}
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
        className="w-full btn-primary-solid h-11 text-sm font-semibold"
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
const Section = ({ title, icon, children, editorial = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; editorial?: boolean }) => (
  <div className={`rounded-2xl border border-border bg-card p-4 space-y-4 ${editorial ? 'font-sans' : 'space-y-3'}`}>
    <div className={`flex items-center gap-2 text-foreground ${editorial ? 'font-display text-lg' : 'text-sm font-semibold'}`}>
      {icon}
      {title}
    </div>
    {children}
  </div>
);

const SelectionRadio = ({ selected }: { selected: boolean }) => (
  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary' : 'border-muted-foreground/50'}`}>
    {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
  </span>
);

export default PerfilPublico;
