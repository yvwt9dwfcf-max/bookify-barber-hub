import { Loader2, Check, AlertCircle } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function AutoSaveIndicator({ status, className = '' }: AutoSaveIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className={`flex items-center gap-1 text-[11px] transition-opacity duration-300 ${className}`}>
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Salvando...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-primary" />
          <span className="text-primary">Salvo</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Erro ao salvar</span>
        </>
      )}
    </div>
  );
}
