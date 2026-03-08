import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Loader2, TriangleAlert as AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ExcluirConta = () => {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      await supabase.auth.signOut();
      toast.success('Conta excluída com sucesso.');
      navigate('/');
    } catch (err: any) {
      toast.error('Erro ao excluir conta. Tente novamente.');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/painel/configuracoes')}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-bold">Excluir conta</h1>
      </div>

      {/* Warning Content */}
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-destructive/10 shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">
              Excluir sua conta removerá permanentemente todos os dados associados ao Bookify.
            </p>
            <p className="text-sm font-medium">Isso inclui:</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />
                Agendamentos
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />
                Clientes
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />
                Serviços
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />
                Informações da barbearia
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />
                Histórico do sistema
              </li>
            </ul>
            <p className="text-sm font-semibold text-destructive">
              Essa ação não pode ser desfeita.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Button with Confirmation */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            className="w-full gap-2"
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleting ? 'Excluindo...' : 'Excluir conta'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é permanente e todos os dados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExcluirConta;
