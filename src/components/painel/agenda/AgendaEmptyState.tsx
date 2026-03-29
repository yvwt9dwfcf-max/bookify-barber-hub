import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarX, Copy, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Barbershop } from '@/lib/supabase';

interface AgendaEmptyStateProps {
  isToday: boolean;
  barbershop: Barbershop | null;
  onDismiss: () => void;
}

const AgendaEmptyState = ({ isToday, barbershop, onDismiss }: AgendaEmptyStateProps) => {
  const handleCopyLink = () => {
    const slug = barbershop?.slug;
    if (slug) {
      const link = `${window.location.origin}/agendar/${slug}`;
      navigator.clipboard.writeText(link);
      toast.success('Link copiado!');
    } else {
      toast.error('Configure o perfil público primeiro');
    }
  };

  const handleShareLink = () => {
    const slug = barbershop?.slug;
    if (slug) {
      const link = `${window.location.origin}/agendar/${slug}`;
      if (navigator.share) {
        navigator.share({ title: barbershop?.name, url: link });
      } else {
        navigator.clipboard.writeText(link);
        toast.success('Link copiado!');
      }
    } else {
      toast.error('Configure o perfil público primeiro');
    }
  };

  return (
    <Card className="border-border/40 border-dashed shadow-sm bg-card/60 backdrop-blur-sm rounded-xl mb-3 relative">
      <CardContent className="text-center py-10 px-6">
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="relative mb-5 inline-flex">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-125" />
          <div className="relative w-16 h-16 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center">
            <CalendarX className="h-7 w-7 text-primary/80" />
          </div>
        </div>
        <h3 className="text-base font-semibold mb-1.5">
          {isToday ? 'Nenhum agendamento hoje' : 'Nenhum agendamento para este dia'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-2 leading-relaxed">
          {isToday ? 'Ainda não há clientes marcados para hoje.' : 'Ainda não há clientes marcados para este dia.'}
        </p>
        <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto mb-6 leading-relaxed">
          Compartilhe seu link de agendamento para que seus clientes possam marcar um horário facilmente.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="default" className="btn-primary-gradient px-5" onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-1.5" />
            Copiar link de agendamento
          </Button>
          <Button variant="outline" className="px-5" onClick={handleShareLink}>
            <Share2 className="h-4 w-4 mr-1.5" />
            Compartilhar link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgendaEmptyState;
