import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Minus, Plus, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sale_price: number;
  cost_price: number;
  stock: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
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

export default function QuickSaleSheet({ open, onOpenChange, product, barbershopId, defaultBarberId }: Props) {
  const qc = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [barberId, setBarberId] = useState(defaultBarberId || '');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setBarberId(defaultBarberId || '');
      setPaymentMethod('dinheiro');
      setCustomerName('');
    }
  }, [open, defaultBarberId]);

  const { data: barbers } = useQuery({
    queryKey: ['active-barbers', barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const total = Number(product.sale_price) * quantity;

  const sellMutation = useMutation({
    mutationFn: async () => {
      if (quantity <= 0) throw new Error('Quantidade inválida');
      if (quantity > product.stock) throw new Error(`Só temos ${product.stock} em estoque`);

      const { error } = await supabase.from('product_sales').insert({
        barbershop_id: barbershopId,
        product_id: product.id,
        barber_id: barberId || null,
        quantity,
        unit_price: product.sale_price,
        unit_cost: product.cost_price,
        total_amount: total,
        customer_name: customerName.trim() || null,
        payment_method: paymentMethod,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product_sales'] });
      qc.invalidateQueries({ queryKey: ['cash-flow'] });
      toast.success(`Venda registrada: ${formatCurrency(total)}`);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao registrar venda'),
  });

  const dec = () => setQuantity((q) => Math.max(1, q - 1));
  const inc = () => setQuantity((q) => Math.min(product.stock, q + 1));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[92dvh] rounded-t-2xl p-0 flex flex-col overscroll-contain">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle>Vender produto</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Product header */}
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{product.name}</p>
            <p className="text-3xl font-bold tabular-nums">{formatCurrency(total)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{product.stock} disponíveis</p>
          </div>

          {/* Quantity stepper */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={dec}
              disabled={quantity <= 1}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <div className="text-3xl font-bold tabular-nums w-16 text-center">{quantity}</div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={inc}
              disabled={quantity >= product.stock}
            >
              <Plus className="h-5 w-5" />
            </Button>
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
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {barbers?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente (opcional)</Label>
            <Input
              placeholder="Nome do cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
        </div>

        <div className="border-t p-4 flex gap-2 bg-background">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 btn-primary-gradient"
            onClick={() => sellMutation.mutate()}
            disabled={sellMutation.isPending}
          >
            {sellMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirmar ${formatCurrency(total)}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
