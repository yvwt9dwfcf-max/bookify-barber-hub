import { Card, CardContent } from '@/components/ui/card';
import { Star, CheckCircle2, MessageCircle, TrendingUp, Stamp as Gift } from 'lucide-react';
import { motion } from 'framer-motion';

const proofs = [
  { icon: CheckCircle2, title: 'Acabou a bagunça', desc: 'Nada de agenda de papel ou mensagem perdida. Tudo num lugar só, do celular ou computador.' },
  { icon: MessageCircle, title: 'Menos ligação, mais cliente', desc: 'Seu cliente agenda sozinho, a qualquer hora. Você para de perder tempo no telefone.' },
  { icon: TrendingUp, title: 'Dinheiro no controle', desc: 'Faturamento, comissões e desempenho de cada barbeiro. Tudo claro, sem surpresa no fim do mês.' },
  { icon: Gift, title: 'Cliente que sempre volta', desc: 'Programa de pontos automático. Seu cliente acumula e volta pra resgatar. Fidelização na prática.' },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export function SocialProofSection() {
  return (
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
            Resultado real pra sua barbearia
          </h2>
        </motion.div>

        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          {proofs.map((item) => (
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
  );
}
