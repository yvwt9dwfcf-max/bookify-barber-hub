import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 px-4 sm:px-6">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-10"
        >
          <Zap className="h-4 w-4" />
          3 dias grátis · Sem cartão de crédito
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-8"
        >
          <span className="text-foreground">Mais clientes, menos</span>
          <br />
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--primary-gradient)' }}>
            confusão
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Controle sua agenda, sua equipe e seu faturamento em um só lugar. 
          Seus clientes agendam online, você foca em cortar.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link to="/register">
            <Button size="lg" className="btn-primary-gradient text-base px-8 py-6 rounded-xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 transition-all duration-300">
              Começar teste grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <a href="#como-funciona">
            <Button variant="outline" size="lg" className="text-base px-8 py-6 rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:border-border">
              Como funciona?
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
