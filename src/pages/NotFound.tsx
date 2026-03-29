import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchX } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-sm w-full shadow-card-lg border-border/40 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-muted/50 border border-border/30">
            <SearchX className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div>
            <h1 className="text-5xl font-extrabold text-primary mb-2">404</h1>
            <p className="text-lg font-semibold mb-1">Página não encontrada</p>
            <p className="text-sm text-muted-foreground">
              O endereço que você acessou não existe ou foi removido.
            </p>
          </div>
          <Button asChild className="btn-primary-gradient w-full rounded-xl">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </CardContent>
      </Card>
      <div className="mt-6">
        <Logo size="sm" linkTo="/" />
      </div>
    </div>
  );
};

export default NotFound;
