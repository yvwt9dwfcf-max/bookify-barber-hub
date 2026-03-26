import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export function CtaSection() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <Card className="relative overflow-hidden border-0 shadow-2xl">
            <div className="absolute inset-0" style={{ background: 'var(--primary-gradient)' }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
            <CardContent className="relative p-10 md:p-14 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-5">
                Bora organizar sua barbearia?
              </h2>
              <p className="text-white/75 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                3 dias grátis pra testar tudo. 
                Sem cartão, sem compromisso. Cancela quando quiser.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="text-base px-8 py-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-white text-primary hover:bg-white/90">
                  Começar agora grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
