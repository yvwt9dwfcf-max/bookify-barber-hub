import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';

export function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20 pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo size="sm" linkTo="/" className="translate-y-0.5" />
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Entrar
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="btn-primary-gradient text-sm rounded-lg">
              Teste grátis
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
