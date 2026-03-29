import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

export const LandingFooter = forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer ref={ref} className="border-t border-border/30 py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size="sm" linkTo="/" />
        <div className="flex items-center gap-4">
          <Link to="/termos-de-uso" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Termos de Uso
          </Link>
          <Link to="/politica-de-privacidade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Política de Privacidade
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Bookify. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
});

LandingFooter.displayName = 'LandingFooter';
