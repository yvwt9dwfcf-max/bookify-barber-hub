import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

export const LandingFooter = forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer
      ref={ref}
      className="py-10 px-4 sm:px-6"
      style={{ background: '#0A0A08', borderTop: '1px solid var(--landing-line)' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="font-display font-bold text-lg tracking-tight" style={{ color: 'hsl(var(--paper))' }}>
          Bookify
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/termos-de-uso"
            className="text-sm transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--paper))')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
          >
            Termos de Uso
          </Link>
          <Link
            to="/politica-de-privacidade"
            className="text-sm transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--paper))')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
          >
            Política de Privacidade
          </Link>
        </div>
        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          © {new Date().getFullYear()} Bookify. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
});

LandingFooter.displayName = 'LandingFooter';
