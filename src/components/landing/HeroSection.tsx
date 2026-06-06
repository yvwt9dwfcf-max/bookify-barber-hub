import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import iphoneMockup from '@/assets/iphone-agenda-mockup.png';

export function HeroSection() {
  return (
    <section className="relative pt-28 pb-12 md:pt-36 md:pb-20 px-4 sm:px-6 overflow-hidden">
      {/* Subtle background — single soft radial, removed cansa-vista glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-8 items-center">
        {/* LEFT — Copy */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/40 text-xs font-medium text-muted-foreground mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Plataforma de gestão para barbearias
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-[2.5rem] sm:text-5xl lg:text-[3.75rem] font-bold tracking-[-0.03em] leading-[1.05] mb-6 text-foreground"
          >
            A operação da sua
            <br />
            barbearia,{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--primary-gradient)' }}>
              sob controle.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
          >
            Agenda, equipe, financeiro e atendimento online em uma única plataforma.
            Desenhada para profissionais que tratam barbearia como negócio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center mb-8"
          >
            <Link to="/register">
              <Button size="lg" className="btn-primary-gradient text-sm px-6 h-12 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30">
                Iniciar 3 dias grátis
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button variant="outline" size="lg" className="text-sm px-6 h-12 rounded-xl border-border/60">
                Ver como funciona
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-xs text-muted-foreground"
          >
            {['Sem cartão de crédito', 'Cancela quando quiser', 'Suporte em português'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        {/* RIGHT — iPhone mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
        >
          {/* Soft glow behind phone */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[70%] h-[70%] rounded-full bg-primary/15 blur-[80px]" />
          </div>
          <motion.img
            src={iphoneMockup}
            alt="App Bookify rodando em iPhone, mostrando a agenda da barbearia"
            width={1024}
            height={1536}
            className="relative w-full max-w-[380px] lg:max-w-[440px] h-auto drop-shadow-2xl"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </section>
  );
}
