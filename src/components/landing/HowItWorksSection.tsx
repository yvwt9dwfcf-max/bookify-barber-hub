import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

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

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export function HowItWorksSection() {
  return (
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
            Comece em 3 passos
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Rápido, fácil e sem enrolação. Sua barbearia online em minutos.
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
  );
}
