import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Minus, Plus, Banknote, Smartphone, CreditCard, Trash2, Package, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export interface CartItem {
  product_id: string;
  name: string;
  sale_price: number;
  cost_price: number;
  stock: number;
  quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  setItems: (items: CartItem[]) => void;
  barbershopId: string;
  defaultBarberId?: string;
}

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'Pix', icon: Smartphone },
  { value: 'debito', label: 'Débito', icon: CreditCard },
  { value: 'credito', label: 'Crédito', icon: CreditCard },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function MultiSaleSheet({
  open, onOpenChange, items, setItems, barbershopId, defaultBarberId,
}: Props) {
  const qc = useQueryClient();
  const [barberId, setBarberId] = useState(defaultBarberId || '');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [customerName, setCustomerName] = useState('');
  const [receipt, setReceipt] = useState<{ total: number; method: string; itemCount: number; date: Date } | null>(null);

  useEffect(() => {
    if (open) {
      setBarberId(defaultBarberId || '');
      setPaymentMethod('dinheiro');
      setCustomerName('');
      setReceipt(null);
    }
  }, [open, defaultBarberId]);

  const { data: barbers } = useQuery({
    queryKey: ['active-barbers', barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barbers').select('id, name')
        .eq('barbershop_id', barbershopId).eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const total = useMemo(
    () => items.reduce((s, i) => s + i.sale_price * i.quantity, 0),
    [items]
  );
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const updateQty = (product_id: string, delta: number) => {
    setItems(
      items
        .map((i) =>
          i.product_id === product_id
            ? { ...i, quantity: Math.min(i.stock, Math.max(0, i.quantity + delta)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (product_id: string) => {
    setItems(items.filter((i) => i.product_id !== product_id));
  };

  const sellMutation = useMutation({
    mutationFn: async () => {
      if (!items.length) throw new Error('Carrinho vazio');
      const rows = items.map((i) => ({
        barbershop_id: barbershopId,
        product_id: i.product_id,
        barber_id: barberId || null,
        quantity: i.quantity,
        unit_price: i.sale_price,
        unit_cost: i.cost_price,
        total_amount: i.sale_price * i.quantity,
        customer_name: customerName.trim() || null,
        payment_method: paymentMethod,
      }));
      const { error } = await supabase.from('product_sales').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product_sales'] });
      qc.invalidateQueries({ queryKey: ['cash-flow'] });
      qc.invalidateQueries({ queryKey: ['financeiro-resumo'] });
      const itemCount = items.reduce((s, i) => s + i.quantity, 0);
      setReceipt({ total, method: paymentMethod, itemCount, date: new Date() });
      setItems([]);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao registrar venda'),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] rounded-t-2xl p-0 flex flex-col overscroll-contain">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Comanda de venda
            {totalQty > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                · {totalQty} {totalQty === 1 ? 'item' : 'itens'}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {!items.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Adicione produtos para iniciar a venda</p>
            </div>
          ) : (
            <>
              {/* Cart items */}
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.product_id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.name}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {formatCurrency(it.sale_price)} • estoque {it.stock}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-background rounded-full border">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                        onClick={() => updateQty(it.product_id, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-sm font-bold w-6 text-center tabular-nums">{it.quantity}</span>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 rounded-full"
                        onClick={() => updateQty(it.product_id, 1)}
                        disabled={it.quantity >= it.stock}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm font-bold tabular-nums w-20 text-right">
                      {formatCurrency(it.sale_price * it.quantity)}
                    </p>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(it.product_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-2xl font-bold tabular-nums">{formatCurrency(total)}</span>
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <Label className="text-xs">Forma de pagamento</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all active:scale-95 ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-muted/30 text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] font-medium">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Barber */}
              <div className="space-y-1.5">
                <Label className="text-xs">Barbeiro responsável</Label>
                <Select value={barberId} onValueChange={setBarberId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {barbers?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer */}
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente (opcional)</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="border-t p-4 flex gap-2 bg-background">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Continuar comprando
          </Button>
          <Button
            className="flex-[1.4] btn-primary-gradient"
            onClick={() => sellMutation.mutate()}
            disabled={sellMutation.isPending || !items.length}
          >
            {sellMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Finalizar ${formatCurrency(total)}`
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
