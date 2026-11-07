import { Component, type ReactNode } from 'react';
import { isChunkLoadError } from '@/lib/chunkReload';

interface State { error: unknown }

/** Last line of defence: never leave the user on a blank screen. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    const updated = isChunkLoadError(this.state.error);
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <p className="font-display text-2xl font-bold text-foreground">Bookify</p>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-foreground">
            {updated ? 'O app foi atualizado' : 'Algo não carregou direito'}
          </h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            {updated ? 'Toque abaixo para abrir a versão mais nova.' : 'Toque abaixo para tentar de novo.'}
          </p>
        </div>
        <button type="button" onClick={() => window.location.reload()} className="btn-primary-solid h-12 px-6">
          Recarregar
        </button>
      </div>
    );
  }
}
