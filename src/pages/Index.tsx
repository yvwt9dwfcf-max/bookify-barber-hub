import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Scissors, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: User,
    title: 'Escolha seu barbeiro',
    description: 'Selecione o profissional de sua preferência',
  },
  {
    icon: Scissors,
    title: 'Selecione o serviço',
    description: 'Veja os serviços disponíveis e preços',
  },
  {
    icon: Calendar,
    title: 'Agende seu horário',
    description: 'Escolha a data e hora que melhor combina com você',
  },
  {
    icon: CheckCircle,
    title: 'Confirmação instantânea',
    description: 'Receba a confirmação na hora',
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="section-padding py-4 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo />
          <Button variant="outline" asChild>
            <Link to="/login">Área do Barbeiro</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Agende seu corte de forma
              <span className="text-primary"> rápida e fácil</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Escolha o profissional, o serviço e o horário que melhor combina com você. Sem filas, sem espera.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="btn-primary-gradient text-lg px-8">
                <Link to="/agendar">
                  <Calendar className="mr-2 h-5 w-5" />
                  Agendar agora
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding py-16 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Como funciona
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card rounded-2xl p-6 shadow-card card-hover"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-semibold">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Pronto para agendar?
          </h2>
          <p className="text-muted-foreground mb-8">
            Escolha o melhor horário e garanta seu atendimento.
          </p>
          <Button asChild size="lg" className="btn-primary-gradient text-lg px-8">
            <Link to="/agendar">
              <Clock className="mr-2 h-5 w-5" />
              Ver horários disponíveis
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="section-padding py-8 border-t border-border/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" linkTo="/" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Bookify. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
