import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, Clock, Users, Smartphone, BarChart3, Shield, 
  ArrowRight, CheckCircle, Zap, Globe
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Agenda Inteligente',
    description: 'Gerencie todos os agendamentos em tempo real com visão diária e mensal.',
  },
  {
    icon: Smartphone,
    title: 'Link de Agendamento',
    description: 'Seus clientes agendam pelo celular sem precisar ligar ou mandar mensagem.',
  },
  {
    icon: Users,
    title: 'Gestão de Equipe',
    description: 'Adicione barbeiros, defina permissões e gerencie horários de cada um.',
  },
  {
    icon: Clock,
    title: 'Horários Flexíveis',
    description: 'Configure horários de funcionamento, intervalos e bloqueios com facilidade.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'Acompanhe faturamento, atendimentos e desempenho da sua barbearia.',
  },
  {
    icon: Shield,
    title: 'Seguro e Confiável',
    description: 'Seus dados protegidos com criptografia e backups automáticos.',
  },
];

const plans = [
  {
    name: 'Básico',
    price: 'Grátis',
    period: '',
    description: 'Para começar',
    features: ['1 barbeiro', 'Agendamento online', 'Agenda diária', 'Link de agendamento'],
    highlighted: false,
  },
  {
    name: 'Profissional',
    price: 'R$ 49',
    period: '/mês',
    description: 'Mais popular',
    features: ['Até 5 barbeiros', 'Tudo do Básico', 'Relatórios completos', 'WhatsApp integrado', 'Suporte prioritário'],
    highlighted: true,
  },
  {
    name: 'Estúdio',
    price: 'R$ 99',
    period: '/mês',
    description: 'Para grandes equipes',
    features: ['Barbeiros ilimitados', 'Tudo do Profissional', 'Multi-unidades', 'API personalizada', 'Gerente dedicado'],
    highlighted: false,
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/" />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                Entrar
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="btn-primary-gradient text-sm">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-4 sm:px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-40 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/10 blur-3xl animate-pulse-soft" />
          <div className="absolute top-60 right-1/4 w-[200px] h-[200px] rounded-full bg-primary/8 blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Zap className="h-4 w-4" />
            <span>A plataforma #1 para barbearias</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Sua barbearia
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--primary-gradient)' }}>
              na palma da mão
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Gerencie agendamentos, equipe e faturamento em um só lugar. 
            Seus clientes agendam online, sem complicação.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/register">
              <Button size="lg" className="btn-primary-gradient text-base px-8 py-6 rounded-xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300">
                Começar grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="text-base px-8 py-6 rounded-xl border-border/80">
                Ver funcionalidades
              </Button>
            </a>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 px-4 sm:px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Globe className="h-4 w-4" />
              Funcionalidades
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Ferramentas profissionais para elevar sua barbearia ao próximo nível.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="group border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300" style={{ background: 'var(--primary-gradient)' }}>
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Planos simples e transparentes
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Escolha o plano ideal para o tamanho da sua barbearia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.name}
                className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlighted 
                    ? 'border-primary shadow-xl shadow-primary/10 scale-[1.02] md:scale-105' 
                    : 'border-border/50 hover:shadow-lg'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--primary-gradient)' }} />
                )}
                <CardContent className="p-6 md:p-8">
                  {plan.highlighted && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 badge-gradient">
                      Mais popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button 
                      className={`w-full rounded-xl ${plan.highlighted ? 'btn-primary-gradient' : ''}`}
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      Começar agora
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="relative overflow-hidden border-0 shadow-2xl">
            <div className="absolute inset-0" style={{ background: 'var(--primary-gradient)' }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
            <CardContent className="relative p-8 md:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Pronto para transformar sua barbearia?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-lg mx-auto">
                Junte-se a centenas de profissionais que já modernizaram seus negócios.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="text-base px-8 py-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  Criar minha conta grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" linkTo="/" />
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link>
              <Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Bookify. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
