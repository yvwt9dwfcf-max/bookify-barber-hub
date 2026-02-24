import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Trash2, MessageSquare, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OutletContext {
  barber: { id: string; barbershop_id: string } | null;
  barbershop: { id: string; name: string } | null;
  isMaster: boolean;
}

const Avaliacoes = () => {
  const { barbershop, isMaster } = useOutletContext<OutletContext>();
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', barbershop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, barbers(name)')
        .eq('barbershop_id', barbershop!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Avaliação removida.');
    },
  });

  const stats = useMemo(() => {
    if (!reviews?.length) return { avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] };
    const total = reviews.length;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(r => distribution[r.rating - 1]++);
    return { avg: sum / total, total, distribution };
  }, [reviews]);

  // Per barber stats
  const barberStats = useMemo(() => {
    if (!reviews?.length) return [];
    const map: Record<string, { name: string; total: number; sum: number }> = {};
    reviews.forEach(r => {
      const name = (r.barbers as any)?.name || 'Desconhecido';
      if (!map[r.barber_id]) map[r.barber_id] = { name, total: 0, sum: 0 };
      map[r.barber_id].total++;
      map[r.barber_id].sum += r.rating;
    });
    return Object.values(map)
      .map(b => ({ ...b, avg: b.sum / b.total }))
      .sort((a, b) => b.avg - a.avg);
  }, [reviews]);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4 animate-page-enter">
      <div className="pb-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Avaliações de Clientes
        </h1>
        <p className="text-sm text-muted-foreground">Veja o que seus clientes pensam do atendimento</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            {isLoading ? <Skeleton className="h-10 w-16 mx-auto" /> : (
              <>
                <p className="text-3xl font-bold text-primary">{stats.avg.toFixed(1)}</p>
                <div className="flex justify-center mt-1">{renderStars(Math.round(stats.avg))}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.total} avaliações</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            {isLoading ? <Skeleton className="h-16 w-full" /> : (
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = stats.distribution[rating - 1];
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs w-3">{rating}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per barber */}
      {barberStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Nota por barbeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1">
            <div className="space-y-2">
              {barberStats.map(b => (
                <div key={b.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">{b.name}</span>
                  <div className="flex items-center gap-2">
                    {renderStars(Math.round(b.avg))}
                    <span className="text-xs text-muted-foreground">{b.avg.toFixed(1)} ({b.total})</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews list */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Avaliações recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{review.customer_name}</span>
                      {renderStars(review.rating)}
                    </div>
                    {isMaster && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(review.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {review.comment && <p className="text-xs text-muted-foreground">{review.comment}</p>}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Barbeiro: {(review.barbers as any)?.name || '-'}</span>
                    <span>•</span>
                    <span>{format(new Date(review.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">Nenhuma avaliação recebida ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Avaliacoes;
