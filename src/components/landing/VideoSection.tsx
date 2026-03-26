import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export function VideoSection() {
  return (
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary/15 border border-primary/30 backdrop-blur-sm">
              <Play className="h-8 w-8 text-primary ml-1" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Vídeo demonstrativo em breve
            </p>
          </div>
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </motion.div>
      </div>
    </section>
  );
}
