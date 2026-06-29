import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientesSkeleton } from '@/components/painel/skeletons';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  UsersRound, Trophy, UserX, Search, Phone, ChevronRight,
  Calendar, Crown, MessageCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface OutletContext {
  barber: { id: string; barbershop_id: string } | null;
  barbershop: { id: string; name: string } | null;
  isMaster: boolean;
}

interface ClientData {
  name: string;
  phone: string;
  visits: number;
  totalSpent: number;
  lastVisit: string;
  appointments: {
    date: string;
    serviceName: string;
    price: number;
    status: string;
  }[];
}

import { formatCurrency } from '@/lib/formatters';

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const Clientes = () => {
  const { barbershop, isMaster } = useOutletContext<OutletContext>();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'top' | 'inactive'>('all');
  const [periodFilter, setPeriodFilter] = useState<number>(0); // 0 = all time

  // Fetch all completed appointments with service info
  const { data: rawAppointments, isLoading } = useQuery({
    queryKey: ['client-management', barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('id, customer_name, customer_phone, start_time, status, services(name, price)')
        .eq('barbershop_id', barbershop.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isMaster,
  });

  // Aggregate client data
  const clients = useMemo(() => {
    if (!rawAppointments?.length) return [];
    const map = new Map<string, ClientData>();

    rawAppointments.forEach(apt => {
      const key = apt.customer_phone || apt.customer_name;
      const existing = map.get(key);
      const entry = {
        date: apt.start_time,
        serviceName: (apt.services as any)?.name || 'Serviço',
        price: Number((apt.services as any)?.price || 0),
        status: apt.status,
      };

      if (existing) {
        existing.visits++;
        existing.totalSpent += entry.price;
        if (apt.start_time > existing.lastVisit) {
          existing.lastVisit = apt.start_time;
        }
        existing.appointments.push(entry);
      } else {
        map.set(key, {
          name: apt.customer_name,
          phone: apt.customer_phone,
          visits: 1,
          totalSpent: entry.price,
          lastVisit: apt.start_time,
          appointments: [entry],
        });
      }
    });

    return Array.from(map.values());
  }, [rawAppointments]);

  // Apply period filter first
  const periodClients = useMemo(() => {
    if (periodFilter === 0) return clients;
    const cutoff = subDays(new Date(), periodFilter);
    return clients.filter(c => new Date(c.lastVisit) >= cutoff);
  }, [clients, periodFilter]);

  // Filter and sort
  const filteredClients = useMemo(() => {
    let list = [...periodClients];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }

    if (activeTab === 'top') {
      list.sort((a, b) => b.visits - a.visits);
    } else if (activeTab === 'inactive') {
      const now = new Date();
      list = list.filter(c => differenceInDays(now, new Date(c.lastVisit)) >= 30);
      list.sort((a, b) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime());
    } else {
      list.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
    }

    return list;
  }, [periodClients, search, activeTab]);

  const topClients = useMemo(() => [...clients].sort((a, b) => b.visits - a.visits).slice(0, 5), [clients]);
  const inactiveClients = useMemo(() => {
    const now = new Date();
    return clients
      .filter(c => differenceInDays(now, new Date(c.lastVisit)) >= 30)
      .sort((a, b) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime());
  }, [clients]);

  const handleOpenClient = (client: ClientData) => {
    setSelectedClient(client);
    setDetailsOpen(true);
  };

  if (!isMaster) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-page-enter">
      {/* Header */}
      <div className="pb-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-primary" />
          Clientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o relacionamento com seus clientes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border/40">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{clients.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{topClients.length > 0 ? topClients[0].visits : 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Maior freq.</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive/80">{inactiveClients.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Inativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {[
          { key: 'all' as const, label: 'Todos', icon: UsersRound },
          { key: 'top' as const, label: 'Mais frequentes', icon: Trophy },
          { key: 'inactive' as const, label: 'Inativos', icon: UserX },
        ].map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'h-8 px-3 text-xs gap-1.5 flex-1',
              activeTab === tab.key && 'btn-primary-gradient'
            )}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Period Filter */}
      <div className="flex gap-1.5">
        {[
          { value: 0, label: 'Todos' },
          { value: 30, label: '30 dias' },
          { value: 60, label: '60 dias' },
          { value: 90, label: '90 dias' },
        ].map(p => (
          <Button
            key={p.value}
            variant={periodFilter === p.value ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPeriodFilter(p.value)}
            className={cn(
              'h-7 px-3 text-[11px] flex-1',
              periodFilter === p.value && 'font-semibold'
            )}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Client List */}
      {isLoading ? (
        <ClientesSkeleton />
      ) : filteredClients.length === 0 ? (
        <Card className="border-border/40 border-dashed">
          <CardContent className="text-center py-10">
            <UserX className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'Nenhum cliente encontrado' : activeTab === 'inactive' ? 'Nenhum cliente inativo' : 'Nenhum cliente ainda'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filteredClients.map((client, index) => {
            const daysAgo = differenceInDays(new Date(), new Date(client.lastVisit));
            return (
              <button
                key={`${client.phone}-${index}`}
                onClick={() => handleOpenClient(client)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl',
                  'bg-card/60 border border-border/30',
                  'hover:bg-card/90 hover:border-border/50',
                  'transition-all duration-200 active:scale-[0.99]',
                  'text-left group'
                )}
              >
                {/* Ranking number for top tab */}
                {activeTab === 'top' && (
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                    index === 0 && 'bg-warning/15 text-warning',
                    index === 1 && 'bg-muted/50 text-muted-foreground',
                    index === 2 && 'bg-warning/10 text-warning/70',
                    index > 2 && 'bg-muted/30 text-muted-foreground/60',
                  )}>
                    {index === 0 ? <Crown className="h-3.5 w-3.5" /> : `${index + 1}º`}
                  </div>
                )}

                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {getInitials(client.name)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{client.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {client.visits} {client.visits === 1 ? 'visita' : 'visitas'}
                    </span>
                    <span className="text-[11px] text-muted-foreground/40">•</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatCurrency(client.totalSpent)}
                    </span>
                  </div>
                </div>

                {/* Right side */}
                <div className="shrink-0 text-right">
                  {activeTab === 'inactive' ? (
                    <span className="text-[11px] text-destructive/70 font-medium">
                      {daysAgo} dias atrás
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">
                      {daysAgo === 0 ? 'Hoje' : daysAgo === 1 ? 'Ontem' : `${daysAgo}d atrás`}
                    </span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors ml-auto mt-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Client Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          {selectedClient && (
            <div className="space-y-5 overflow-y-auto h-full pb-8">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">
                      {getInitials(selectedClient.name)}
                    </span>
                  </div>
                  <div>
                    <SheetTitle className="text-lg">{selectedClient.name}</SheetTitle>
                    {selectedClient.phone && (
                      <a
                        href={`tel:${selectedClient.phone}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5"
                      >
                        <Phone className="h-3 w-3" />
                        {selectedClient.phone}
                      </a>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold">{selectedClient.visits}</p>
                  <p className="text-[11px] text-muted-foreground">Visitas</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold">{formatCurrency(selectedClient.totalSpent)}</p>
                  <p className="text-[11px] text-muted-foreground">Total gasto</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold">
                    {differenceInDays(new Date(), new Date(selectedClient.lastVisit))}d
                  </p>
                  <p className="text-[11px] text-muted-foreground">Desde última</p>
                </div>
              </div>

              {/* WhatsApp Button for inactive clients */}
              {selectedClient.phone && differenceInDays(new Date(), new Date(selectedClient.lastVisit)) >= 30 && (
                <Button
                  variant="outline"
                  className="w-full gap-2 h-10 text-sm border-border/40"
                  onClick={() => {
                    const phone = selectedClient.phone.replace(/\D/g, '');
                    const msg = encodeURIComponent(
                      `Olá ${selectedClient.name.split(' ')[0]}! Sentimos sua falta por aqui 😊 Que tal agendar um horário?`
                    );
                    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar mensagem no WhatsApp
                </Button>
              )}

              <Separator className="bg-border/30" />

              {/* History */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Histórico de atendimentos
                </h3>
                <div className="space-y-1">
                  {selectedClient.appointments
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((apt, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-medium">{apt.serviceName}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {format(new Date(apt.date), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(apt.price)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Clientes;
