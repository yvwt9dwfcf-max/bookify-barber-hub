import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function CtaSection() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-border/40 bg-card p-10 md:p-16 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-primary/[0.04]" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-5 text-foreground">
              Comece hoje. Cresça amanhã.
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-9 max-w-md mx-auto leading-relaxed">
              3 dias grátis. Sem cartão. Sem compromisso. Sem letra miúda.
            </p>
            <Link to="/register">
              <Button size="lg" className="btn-primary-gradient text-sm px-7 h-12 rounded-xl shadow-lg shadow-primary/25">
                Iniciar teste grátis
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
