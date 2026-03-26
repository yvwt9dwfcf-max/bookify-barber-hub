import { Card, CardContent } from '@/components/ui/card';
import { 
  CalendarDays as Calendar, Timer as Clock, UsersRound as Users, Smartphone, 
  PieChart as BarChart3, ShieldCheck as Shield, Stamp as Gift, Coins as DollarSign, Share2 as Globe 
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

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export function FeaturesSection() {
  return (
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
            Tudo pra você trabalhar tranquilo
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Organização, controle e mais tempo pra fazer o que você faz de melhor.
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
  );
}
