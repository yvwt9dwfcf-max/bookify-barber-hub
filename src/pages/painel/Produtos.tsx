import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { Barber, Barbershop } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PremiumSkeleton } from '@/components/ui/premium-skeleton';
import { ArrowLeft, Plus, Loader2, Trash2, Package, AlertTriangle, ImagePlus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import MultiSaleSheet, { CartItem } from '@/components/painel/MultiSaleSheet';

interface ContextType {
  barber: Barber | null;
  barbershop: Barbershop | null;
  isMaster: boolean;
}

interface Product {
  id: string;
  barbershop_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  sale_price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const Produtos = () => {
  const { barber, barbershop, isMaster } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);

  // form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('name');
      if (error) throw error;
      return (data || []) as Product[];
    },
    enabled: !!barbershop?.id,
  });

  const stats = useMemo(() => {
    if (!products?.length) return { total: 0, lowStock: 0, value: 0 };
    return {
      total: products.filter((p) => p.is_active).length,
      lowStock: products.filter((p) => p.is_active && p.stock <= p.min_stock).length,
      value: products.reduce((s, p) => s + Number(p.cost_price) * p.stock, 0),
    };
  }, [products]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSalePrice('');
    setCostPrice('');
    setStock('');
    setMinStock('');
    setIsActive(true);
    setPhotoUrl(null);
    setEditing(null);
  };

  const openNew = () => {
    resetForm();
    setSheetOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setDescription(p.description || '');
    setSalePrice(p.sale_price.toString().replace('.', ','));
    setCostPrice(p.cost_price.toString().replace('.', ','));
    setStock(p.stock.toString());
    setMinStock(p.min_stock.toString());
    setIsActive(p.is_active);
    setPhotoUrl(p.photo_url);
    setSheetOpen(true);
  };

  const uploadPhoto = async (file: File) => {
    if (!barbershop?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${barbershop.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('product-photos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch (e: any) {
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!barbershop?.id) throw new Error('Barbearia não encontrada');
      if (!name.trim()) throw new Error('Nome é obrigatório');
      const sale = parseFloat(salePrice.replace(',', '.'));
      const cost = parseFloat(costPrice.replace(',', '.')) || 0;
      const st = parseInt(stock || '0', 10);
      const mst = parseInt(minStock || '0', 10);
      if (isNaN(sale) || sale <= 0) throw new Error('Preço de venda inválido');

      const payload = {
        barbershop_id: barbershop.id,
        name: name.trim(),
        description: description.trim() || null,
        photo_url: photoUrl,
        sale_price: sale,
        cost_price: cost,
        stock: st,
        min_stock: mst,
        is_active: isActive,
      };

      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(editing ? 'Produto atualizado' : 'Produto criado');
      setSheetOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto removido');
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const openSale = (p: Product) => {
    setSaleProduct(p);
    setSaleOpen(true);
  };

  return (
    <div className="space-y-5 animate-page-enter pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/painel/caixa')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produtos
          </h1>
          <p className="text-xs text-muted-foreground">Catálogo e estoque para venda</p>
        </div>
        {isMaster && (
          <Button size="sm" className="btn-primary-gradient" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ativos</p>
            <p className="text-base font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className={stats.lowStock > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Estoque baixo</p>
            <p className={`text-base font-bold ${stats.lowStock > 0 ? 'text-destructive' : ''}`}>{stats.lowStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Valor estoque</p>
            <p className="text-base font-bold">{formatCurrency(stats.value)}</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <PremiumSkeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !products?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold mb-1">Nenhum produto cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-4">Cadastre pomadas, bebidas e qualquer produto que você venda.</p>
            {isMaster && (
              <Button size="sm" onClick={openNew} className="btn-primary-gradient">
                <Plus className="h-4 w-4 mr-1" />
                Cadastrar primeiro produto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const lowStock = p.stock <= p.min_stock;
            return (
              <Card
                key={p.id}
                className={`transition-all active:scale-[0.99] ${!p.is_active ? 'opacity-50' : ''}`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className="size-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                    onClick={() => isMaster && openEdit(p)}
                  >
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => isMaster && openEdit(p)}>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      {lowStock && p.is_active && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1 gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {p.stock}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-primary">{formatCurrency(Number(p.sale_price))}</span>
                      <span className="text-[11px] text-muted-foreground">• {p.stock} em estoque</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="default"
                    className="h-10 w-10 rounded-xl shrink-0 btn-primary-gradient"
                    onClick={() => openSale(p)}
                    disabled={!p.is_active || p.stock <= 0}
                    title="Vender"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[92dvh] rounded-t-2xl p-0 flex flex-col overscroll-contain">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <SheetTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Photo */}
            <div className="flex items-center gap-3">
              <label className="size-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:bg-muted/70 transition-colors shrink-0 border-2 border-dashed border-border">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                />
              </label>
              <div className="text-xs text-muted-foreground">
                {photoUrl ? 'Toque para trocar' : 'Adicionar foto (opcional)'}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nome do produto</Label>
              <Input placeholder="Ex: Pomada modeladora" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Preço venda</Label>
                <Input placeholder="0,00" inputMode="decimal" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço custo</Label>
                <Input placeholder="0,00" inputMode="decimal" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Estoque atual</Label>
                <Input placeholder="0" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estoque mínimo</Label>
                <Input placeholder="0" inputMode="numeric" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea
                placeholder="Detalhes do produto"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div>
                <Label className="text-xs">Produto ativo</Label>
                <p className="text-[10px] text-muted-foreground">Disponível para venda</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {editing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir produto
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir "{editing.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O histórico de vendas será preservado, mas o produto não estará mais disponível.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteMutation.mutate(editing.id);
                        setSheetOpen(false);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="border-t p-4 flex gap-2 bg-background">
            <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 btn-primary-gradient"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Quick Sale Sheet */}
      {saleProduct && barbershop && (
        <QuickSaleSheet
          open={saleOpen}
          onOpenChange={setSaleOpen}
          product={saleProduct}
          barbershopId={barbershop.id}
          defaultBarberId={barber?.id}
        />
      )}
    </div>
  );
};

export default Produtos;
