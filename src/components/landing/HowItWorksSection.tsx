import { motion } from 'framer-motion';

const steps = [
  {
    step: '01',
    title: 'Configure em minutos',
    description: 'Cadastre serviços, equipe e horários. Sem importação complicada, sem onboarding pago.',
  },
  {
    step: '02',
    title: 'Compartilhe seu link',
    description: 'Receba agendamentos do Instagram, WhatsApp e Google. Tudo centralizado na sua agenda.',
  },
  {
    step: '03',
    title: 'Acompanhe e cresça',
    description: 'Decisões baseadas em dados: faturamento, retenção, comissões e produtividade da equipe.',
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 md:py-28 px-4 sm:px-6 bg-secondary/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
          className="max-w-2xl mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">Fluxo</p>
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight leading-[1.1] text-foreground">
            Do cadastro ao primeiro agendamento em menos de 10 minutos.
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {steps.map((item) => (
            <motion.div key={item.step} variants={fadeInUp} className="relative">
              <div className="text-5xl font-bold text-primary/30 mb-3 tracking-tight">{item.step}</div>
              <h3 className="font-semibold text-lg mb-2 text-foreground tracking-tight">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
