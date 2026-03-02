import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, Clock, Users, Smartphone, BarChart3, Shield, 
  ArrowRight, CheckCircle, Zap, Globe, Gift, DollarSign
} from 'lucide-react';
import { PLANS } from '@/lib/plans';

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
  {
    icon: Gift,
    title: 'Programa de Fidelidade',
    description: 'Fidelize seus clientes com um sistema de pontos simples e prático por serviço concluído.',
  },
  {
    icon: DollarSign,
    title: 'Gestão de Comissões',
    description: 'Defina comissões por barbeiro e por serviço, com relatório mensal automático.',
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/" />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="btn-primary-gradient text-sm rounded-lg">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 md:pt-44 md:pb-36 px-4 sm:px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute top-40 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px] animate-pulse-soft" />
          <div className="absolute top-60 right-1/4 w-[200px] h-[200px] rounded-full bg-primary/10 blur-[80px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-10 animate-fade-in">
            <Zap className="h-4 w-4" />
            <span>Teste grátis por 3 dias. Sem cartão de crédito.</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Sistema profissional para</span>
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--primary-gradient)' }}>
              barbearias que querem crescer
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Organização e tecnologia em um só lugar. Gerencie agendamentos, equipe e faturamento enquanto seus clientes agendam online, sem complicação.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/register">
              <Button size="lg" className="btn-primary-gradient text-base px-8 py-6 rounded-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 transition-all duration-300">
                Começar teste grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="text-base px-8 py-6 rounded-lg border-border/60 text-muted-foreground hover:text-foreground hover:border-border">
                Ver funcionalidades
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 px-4 sm:px-6 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Globe className="h-4 w-4" />
              Funcionalidades
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5">
              Tudo que você precisa
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              Ferramentas profissionais para elevar sua barbearia ao próximo nível.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="group border-border/30 bg-card/80 backdrop-blur-sm hover:shadow-card-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-5 transition-colors duration-300" style={{ background: 'var(--primary-gradient)' }}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 md:py-32 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5">
              Planos simples e transparentes
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              Escolha o plano ideal para o tamanho da sua barbearia. Teste grátis por 3 dias.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {PLANS.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular 
                    ? 'border-primary shadow-xl shadow-primary/15 scale-[1.02] md:scale-105' 
                    : 'border-border/30 hover:shadow-card-lg hover:border-border/60'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--primary-gradient)' }} />
                )}
                <CardContent className="p-8">
                  {plan.popular && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 badge-gradient">
                      Mais popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-5">
                    <span className="text-3xl font-extrabold">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-8">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">{plan.label}</span>
                  </div>
                  <ul className="space-y-3.5 mb-10">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full rounded-lg ${plan.popular ? 'btn-primary-gradient' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => {
                      localStorage.setItem('selected_plan', plan.id);
                      window.location.href = '/register';
                    }}
                  >
                    Começar teste grátis
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Card className="relative overflow-hidden border-0 shadow-2xl">
            <div className="absolute inset-0" style={{ background: 'var(--primary-gradient)' }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
            <CardContent className="relative p-10 md:p-14 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-5">
                Pronto para transformar sua barbearia?
              </h2>
              <p className="text-white/75 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                Teste grátis por 3 dias. Sem cartão de crédito. Cancele quando quiser.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="text-base px-8 py-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-white text-primary hover:bg-white/90">
                  Começar teste grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" linkTo="/" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Bookify. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
