import { CalendarDays, Users, BarChart3, Smartphone, Stamp, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: CalendarDays,
    title: 'Agenda inteligente',
    description: 'Bloqueios, pausas, recorrências e prevenção de conflitos em tempo real.',
  },
  {
    icon: Smartphone,
    title: 'Agendamento online',
    description: 'Link público próprio. Seu cliente agenda em 30 segundos, sem login.',
  },
  {
    icon: Users,
    title: 'Equipe organizada',
    description: 'Permissões granulares, agendas individuais e metas por profissional.',
  },
  {
    icon: DollarSign,
    title: 'Financeiro completo',
    description: 'Caixa, despesas, comissões automáticas e relatórios de lucro líquido.',
  },
  {
    icon: BarChart3,
    title: 'Indicadores reais',
    description: 'Ticket médio, taxa de retorno e desempenho por barbeiro e por serviço.',
  },
  {
    icon: Stamp,
    title: 'Fidelidade automática',
    description: 'Programa de pontos integrado ao agendamento. Mais retenção, sem esforço.',
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
          className="max-w-2xl mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">Plataforma completa</p>
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1] mb-4 text-foreground">
            Tudo que sua operação precisa.
            <br />
            <span className="text-muted-foreground">Nada que não precisa.</span>
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/30 rounded-2xl overflow-hidden border border-border/30"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              className="bg-card p-7 hover:bg-secondary/40 transition-colors duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <feature.icon className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <h3 className="font-semibold text-base mb-2 text-foreground tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
