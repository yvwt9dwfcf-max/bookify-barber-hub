import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: 'Em 60 dias dobrei o número de agendamentos online. A agenda em papel ficou no passado.',
    author: 'Rafael Andrade',
    role: 'Andrade Barbearia · São Paulo',
  },
  {
    quote: 'Finalmente tenho controle real do financeiro. Sei exatamente o lucro líquido de cada barbeiro.',
    author: 'Marcos Vieira',
    role: 'MV Studio · Belo Horizonte',
  },
  {
    quote: 'Profissional, rápido e sem firula. Meus clientes elogiam o link de agendamento toda semana.',
    author: 'Lucas Pereira',
    role: 'Corte Reto · Curitiba',
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export function SocialProofSection() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
          className="max-w-2xl mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">Quem usa</p>
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1] text-foreground">
            Profissionais que escolheram operar com precisão.
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {testimonials.map((t) => (
            <motion.figure
              key={t.author}
              variants={fadeInUp}
              className="bg-card border border-border/40 rounded-2xl p-6 flex flex-col"
            >
              <blockquote className="text-sm leading-relaxed text-foreground mb-5 flex-1">
                "{t.quote}"
              </blockquote>
              <figcaption className="pt-4 border-t border-border/40">
                <div className="font-semibold text-sm text-foreground">{t.author}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
