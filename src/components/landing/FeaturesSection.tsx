import { motion } from 'framer-motion';

const features = [
  {
    title: 'Agenda inteligente',
    description: 'Bloqueios, pausas, recorrências e prevenção de conflitos em tempo real.',
  },
  {
    title: 'Link de agendamento',
    description: 'Link público próprio. Seu cliente agenda em 30 segundos, sem login.',
  },
  {
    title: 'Equipe sob medida',
    description: 'Permissões granulares, agendas individuais e metas por profissional.',
  },
  {
    title: 'Financeiro completo',
    description: 'Caixa, despesas, comissões automáticas e relatórios de lucro líquido.',
  },
  {
    title: 'Indicadores reais',
    description: 'Ticket médio, taxa de retorno e desempenho por barbeiro e por serviço.',
  },
  {
    title: 'Fidelidade automática',
    description: 'Programa de pontos integrado ao agendamento. Mais retenção, sem esforço.',
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
