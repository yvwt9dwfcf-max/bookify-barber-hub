import { motion } from 'framer-motion';

const features = [
  {
    title: 'Agenda inteligente',
    description: 'Veja os horários da equipe, organize pausas e bloqueie períodos indisponíveis.',
  },
  {
    title: 'Link de agendamento',
    description: 'Seu cliente escolhe profissional, serviço e horário pelo seu link, sem criar conta.',
  },
  {
    title: 'Equipe sob medida',
    description: 'Permissões granulares, agendas individuais e metas por profissional.',
  },
  {
    title: 'Financeiro completo',
    description: 'Acompanhe entradas, despesas e comissões para entender o resultado da barbearia.',
  },
  {
    title: 'Indicadores reais',
    description: 'Ticket médio, taxa de retorno e desempenho por barbeiro e por serviço.',
  },
  {
    title: 'Fidelidade automática',
    description: 'Configure pontos por serviço e acompanhe a fidelidade dos seus clientes.',
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
          className="mb-14"
        >
          <p
            className="font-editorial-mono text-xs uppercase tracking-[0.22em] mb-5"
            style={{ color: '#22C55E' }}
          >
            — Plataforma completa
          </p>
          <h2
            className="font-display font-bold text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.1]"
            style={{ color: 'hsl(var(--paper))' }}
          >
            Tudo que sua operação precisa.
            <br />
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>Nada que não precisa.</span>
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              className="group flex items-baseline gap-5 sm:gap-7 py-6 sm:py-7 transition-colors duration-300"
              style={{ borderBottom: '1px solid var(--landing-line)' }}
            >
              <span
                className="font-editorial-mono text-sm font-medium shrink-0 tabular-nums"
                style={{ color: 'hsl(var(--bordeaux))' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <h3
                  className="font-display font-bold text-xl sm:text-2xl leading-snug mb-1.5"
                  style={{ color: 'hsl(var(--paper))' }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {feature.description}
                </p>
              </div>
              <span
                className="flex-1 self-end mb-2 hidden sm:block"
                style={{ borderBottom: '1px dotted var(--landing-line)' }}
                aria-hidden="true"
              />
              <span className="w-6 shrink-0 hidden sm:block" aria-hidden="true" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
