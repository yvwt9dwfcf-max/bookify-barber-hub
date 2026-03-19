import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CalendarDays as Calendar, Timer as Clock, UsersRound as Users, Smartphone, PieChart as BarChart3, ShieldCheck as Shield, 
  ArrowRight, Zap, Share2 as Globe, Stamp as Gift, Coins as DollarSign, Play, Star, CheckCircle2,
  TrendingUp, MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Calendar,
    title: 'Agenda sem confusão',
    description: 'Controle seus horários em tempo real. Nada de caderninho ou WhatsApp lotado.',
  },
  {
    icon: Smartphone,
    title: 'Clientes agendam sozinhos',
    description: 'Mande o link e pronto. Seu cliente escolhe o horário sem te incomodar.',
  },
  {
    icon: Users,
    title: 'Equipe organizada',
    description: 'Cada barbeiro com sua agenda, seus horários e suas permissões.',
  },
  {
    icon: Clock,
    title: 'Horários do seu jeito',
    description: 'Defina expediente, pausas e folgas em poucos cliques.',
  },
  {
    icon: BarChart3,
    title: 'Saiba quanto faturou',
    description: 'Veja o faturamento, os atendimentos e o desempenho de cada barbeiro.',
  },
  {
    icon: Shield,
    title: 'Dados sempre seguros',
    description: 'Criptografia e backups automáticos. Seus dados não se perdem.',
  },
  {
    icon: Gift,
    title: 'Cliente que volta',
    description: 'Programa de fidelidade com pontos. Seu cliente volta e indica outros.',
  },
  {
    icon: DollarSign,
    title: 'Comissões na mão',
    description: 'Calcule comissão por barbeiro e por serviço. Sem planilha, sem erro.',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Crie sua conta em 1 minuto',
    description: 'Cadastro rápido e 3 dias grátis pra você testar tudo, sem pagar nada.',
  },
  {
    step: '02',
    title: 'Monte sua barbearia',
    description: 'Coloque seus serviços, preços, barbeiros e horários. Simples e rápido.',
  },
  {
    step: '03',
    title: 'Mande o link pros clientes',
    description: 'Compartilhe no Instagram, WhatsApp ou onde quiser. Os agendamentos começam a chegar.',
  },
];

const stats = [
  { value: '3 dias', label: 'Grátis pra testar' },
  { value: '100%', label: 'Online, sem instalar nada' },
  { value: '24h', label: 'Clientes agendam sozinhos' },
  { value: '0', label: 'Cartão necessário' },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

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
                Teste grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-4 sm:px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute top-40 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-10"
          >
            <Zap className="h-4 w-4" />
            3 dias grátis · Sem cartão de crédito
          </motion.div>

          {/* Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-8"
          >
            <span className="text-foreground">Mais clientes, menos</span>
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--primary-gradient)' }}>
              confusão
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Controle sua agenda, sua equipe e seu faturamento em um só lugar. 
            Seus clientes agendam online, você foca em cortar.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/register">
              <Button size="lg" className="btn-primary-gradient text-base px-8 py-6 rounded-xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 transition-all duration-300">
                Começar teste grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button variant="outline" size="lg" className="text-base px-8 py-6 rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:border-border">
                Como funciona?
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="py-8 px-4 sm:px-6 border-y border-border/20 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video / Demo Placeholder */}
      <section className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
            variants={fadeInUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Veja como funciona na prática
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Em poucos minutos sua barbearia tá online e recebendo agendamentos.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
            variants={fadeInUp}
            className="relative aspect-video rounded-2xl overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm shadow-2xl shadow-black/30"
          >
            {/* Placeholder - substituir por vídeo real futuramente */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary/15 border border-primary/30 backdrop-blur-sm">
                <Play className="h-8 w-8 text-primary ml-1" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Vídeo demonstrativo em breve
              </p>
            </div>
            {/* Efeito de grid sutil */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 px-4 sm:px-6 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Globe className="h-4 w-4" />
              Funcionalidades
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5">
              Tudo que sua barbearia precisa
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              Ferramentas profissionais para organizar e fazer sua barbearia crescer.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="group border-border/30 bg-card/80 backdrop-blur-sm hover:shadow-card-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 h-full">
                  <CardContent className="p-6">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300" style={{ background: 'var(--primary-gradient)' }}>
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-bold text-base mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <TrendingUp className="h-4 w-4" />
              Simples e rápido
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5">
              Como funciona?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              Em 3 passos simples, sua barbearia está online e pronta para receber agendamentos.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="space-y-6"
          >
            {howItWorks.map((item) => (
              <motion.div key={item.step} variants={fadeInUp}>
                <Card className="border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8 flex items-start gap-5">
                    <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold text-primary bg-primary/10 border border-primary/20">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1.5">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-card/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
            variants={fadeInUp}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Star className="h-4 w-4" />
              Por que escolher o Bookify?
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-12">
              Feito para barbearias que querem crescer
            </h2>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          >
            {[
              { icon: CheckCircle2, title: 'Sem papel, sem confusão', desc: 'Esqueça a agenda de papel. Tudo digital, organizado e acessível de qualquer lugar.' },
              { icon: MessageCircle, title: 'Clientes agendam sozinhos', desc: 'Compartilhe seu link e receba agendamentos 24 horas por dia, sem precisar atender telefone.' },
              { icon: TrendingUp, title: 'Controle total do faturamento', desc: 'Saiba exatamente quanto cada barbeiro faturou, as comissões e o desempenho da equipe.' },
              { icon: Gift, title: 'Fidelize seus clientes', desc: 'Sistema de pontos que faz seus clientes voltarem sempre. Simples de configurar e usar.' },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeInUp}>
                <Card className="border-border/30 bg-card/80 text-left h-full">
                  <CardContent className="p-6">
                    <item.icon className="h-6 w-6 text-primary mb-3" />
                    <h3 className="font-bold text-base mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
            variants={fadeInUp}
          >
            <Card className="relative overflow-hidden border-0 shadow-2xl">
              <div className="absolute inset-0" style={{ background: 'var(--primary-gradient)' }} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
              <CardContent className="relative p-10 md:p-14 text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-5">
                  Pronto para organizar sua barbearia?
                </h2>
                <p className="text-white/75 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                  Crie sua conta agora e teste todas as funcionalidades por 3 dias. 
                  Sem cartão de crédito, sem compromisso.
                </p>
                <Link to="/register">
                  <Button size="lg" variant="secondary" className="text-base px-8 py-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-white text-primary hover:bg-white/90">
                    Criar conta grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-10 px-4 sm:px-6">
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
    </div>
  );
};

export default LandingPage;
