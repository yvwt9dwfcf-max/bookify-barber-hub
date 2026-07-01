import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { awardLoyaltyPoints } from '@/lib/loyaltyUtils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Plus, Minus, Search,
  Package, Sparkles, Receipt, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  sale_price: number;
  cost_price: number;
  stock: number;
}

interface ComandaAppointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  barbershop_id: string | null;
  barber_id?: string | null;
  start_time: string;
  service?: { name: string; price: number } | null;
}

interface ComandaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: ComandaAppointment | null;
  onCompleted: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}


const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const ComandaSheet = ({ open, onOpenChange, appointment, onCompleted }: ComandaSheetProps) => {
  const qc = useQueryClient();
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [search, setSearch] = useState('');
  const [showProducts, setShowProducts] = useState(false);

  useEffect(() => {
    if (open) {
      setPaymentMethod('dinheiro');
      setCart({});
      setSearch('');
      setShowProducts(false);
    }
  }, [open]);

  const { data: products } = useQuery({
    queryKey: ['comanda-products', appointment?.barbershop_id],
    queryFn: async () => {
      if (!appointment?.barbershop_id) return [] as Product[];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sale_price, cost_price, stock')
        .eq('barbershop_id', appointment.barbershop_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as Product[];
    },
    enabled: open && !!appointment?.barbershop_id,
  });

  const filtered = useMemo(() => {
    const list = products || [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(s));
  }, [products, search]);

  const addToCart = (p: Product) => {
    setCart((c) => {
      const existing = c[p.id];
      const nextQty = (existing?.quantity || 0) + 1;
      if (nextQty > p.stock) {
        toast.error(`Estoque insuficiente (${p.stock})`);
        return c;
      }
      return { ...c, [p.id]: { product: p, quantity: nextQty } };
    });
  };

  const decFromCart = (id: string) => {
    setCart((c) => {
      const item = c[id];
      if (!item) return c;
      const next = { ...c };
      if (item.quantity <= 1) delete next[id];
      else next[id] = { ...item, quantity: item.quantity - 1 };
      return next;
    });
  };

  const removeFromCart = (id: string) => {
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  };

  const servicePrice = Number(appointment?.service?.price || 0);
  const productsTotal = useMemo(
    () => Object.values(cart).reduce((s, i) => s + Number(i.product.sale_price) * i.quantity, 0),
    [cart],
  );
  const total = servicePrice + productsTotal;
  const cartCount = useMemo(() => Object.values(cart).reduce((s, i) => s + i.quantity, 0), [cart]);

  const finishMutation = useMutation({
    mutationFn: async () => {
      if (!appointment) throw new Error('Atendimento inválido');

      // Update the appointment as completed with payment method
      const { error: aptErr } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
        })
        .eq('id', appointment.id);
      if (aptErr) throw aptErr;

      // Insert product sales for each cart item
      const items = Object.values(cart);
      if (items.length > 0 && appointment.barbershop_id) {
        const rows = items.map((i) => ({
          barbershop_id: appointment.barbershop_id!,
          product_id: i.product.id,
          barber_id: appointment.barber_id || null,
          appointment_id: appointment.id,
          quantity: i.quantity,
          unit_price: i.product.sale_price,
          unit_cost: i.product.cost_price,
          total_amount: Number(i.product.sale_price) * i.quantity,
          customer_name: appointment.customer_name,
          customer_phone: appointment.customer_phone,
          payment_method: paymentMethod,
        }));
        const { error: salesErr } = await supabase.from('product_sales').insert(rows);
        if (salesErr) throw salesErr;
      }

      // Loyalty (silent)
      await awardLoyaltyPoints({
        id: appointment.id,
        customer_name: appointment.customer_name,
        customer_phone: appointment.customer_phone,
        barbershop_id: appointment.barbershop_id,
      }).catch(() => {});
    },
    onSuccess: () => {
      toast.success(`Comanda fechada · ${formatCurrency(total)}`);
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product_sales'] });
      qc.invalidateQueries({ queryKey: ['cash-flow'] });
      qc.invalidateQueries({ queryKey: ['financeiro-resumo'] });
      qc.invalidateQueries({ queryKey: ['reports-all-appointments'] });
      onOpenChange(false);
      onCompleted();
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao fechar comanda'),
  });

  if (!appointment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 flex flex-col h-[92dvh] overscroll-contain"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b text-left">
          <SheetTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Fechar comanda
          </SheetTitle>
          <SheetDescription className="text-xs">
            {appointment.customer_name} · {format(new Date(appointment.start_time), "dd 'de' MMM · HH:mm", { locale: ptBR })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Service line */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Serviço
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {appointment.service?.name || 'Atendimento'}
                </p>
                <p className="text-[11px] text-muted-foreground">Atendimento principal</p>
              </div>
              <span className="text-sm font-bold tabular-nums">{formatCurrency(servicePrice)}</span>
            </div>
          </div>

          {/* Products in cart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Produtos {cartCount > 0 && `(${cartCount})`}
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowProducts((v) => !v)}
                className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            {Object.values(cart).length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                Nenhum produto adicionado.
              </div>
            ) : (
              <div className="space-y-1.5">
                {Object.values(cart).map((item) => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatCurrency(Number(item.product.sale_price))} · cada
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        onClick={() => decFromCart(item.product.id)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-5 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        onClick={() => addToCart(item.product)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-bold tabular-nums w-16 text-right">
                      {formatCurrency(Number(item.product.sale_price) * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showProducts && (
              <div className="mt-3 border border-border/60 rounded-xl overflow-hidden">
                <div className="p-2 border-b border-border/60 bg-muted/30">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar produto..."
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Nenhum produto encontrado.
                    </div>
                  ) : (
                    filtered.map((p) => {
                      const inCart = cart[p.id]?.quantity || 0;
                      const out = p.stock <= 0;
                      return (
                        <button
                          key={p.id}
                          disabled={out}
                          onClick={() => addToCart(p)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-border/40 last:border-b-0 transition-colors',
                            out ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 active:bg-muted',
                          )}
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatCurrency(Number(p.sale_price))} · {p.stock} em estoque
                            </p>
                          </div>
                          {inCart > 0 && (
                            <span className="text-[11px] font-bold text-primary px-1.5 py-0.5 rounded-full bg-primary/10">
                              {inCart}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Forma de pagamento
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all active:scale-95',
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 text-muted-foreground',
                    )}
                  >
                    <Icon className={cn('h-4 w-4', active ? 'text-primary' : m.color)} />
                    <span className={cn('text-[10px] font-medium', active && 'text-primary')}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-card px-5 py-4 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total da comanda</p>
              {productsTotal > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Serviço {formatCurrency(servicePrice)} + Produtos {formatCurrency(productsTotal)}
                </p>
              )}
            </div>
            <p className="text-2xl font-bold tabular-nums text-primary">{formatCurrency(total)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 btn-primary-gradient active:scale-[0.98]"
              onClick={() => finishMutation.mutate()}
              disabled={finishMutation.isPending}
            >
              {finishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Fechar comanda'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ComandaSheet;
