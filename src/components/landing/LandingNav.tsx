import { Link } from 'react-router-dom';

export function LandingNav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl pt-[env(safe-area-inset-top)]"
      style={{ background: 'rgba(10, 10, 8, 0.8)', borderBottom: '1px solid var(--landing-line)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-xl tracking-tight" style={{ color: 'hsl(var(--paper))' }}>
          Bookify
        </Link>
        <div className="flex items-center gap-6">
          <Link
            to="/login"
            className="font-editorial-mono text-xs uppercase tracking-[0.12em] transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--paper))')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
          >
            Entrar
          </Link>
          <Link
            to="/register"
            className="font-editorial-mono text-xs uppercase tracking-[0.12em] px-4 py-2.5 rounded-md font-medium transition-colors"
            style={{ background: '#22C55E', color: '#0A0A08' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#16A34A')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#22C55E')}
          >
            Criar conta
          </Link>
        </div>
      </div>
    </nav>
  );
}
