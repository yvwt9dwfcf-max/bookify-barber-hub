import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function CtaSection() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6" style={{ borderTop: '1px solid var(--landing-line)' }}>
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
        >
          <h2
            className="font-display font-bold text-3xl sm:text-4xl md:text-5xl leading-[1.08] mb-6"
            style={{ color: 'hsl(var(--paper))' }}
          >
            Sua barbearia, organizada de verdade.
          </h2>
          <p className="text-base sm:text-lg mb-9 leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Grátis por 7 dias. Sem cartão de crédito. Cancele quando quiser.
          </p>
          <Link
            to="/register"
            className="font-editorial-mono text-xs uppercase tracking-[0.12em] px-8 h-12 inline-flex items-center rounded-md font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              color: '#0A0A08',
              boxShadow: '0 8px 28px -8px rgba(34, 197, 94, 0.5)',
            }}
          >
            Criar conta grátis →
          </Link>
          <p className="text-sm mt-7" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Já tem conta?{' '}
            <Link
              to="/login"
              className="underline underline-offset-4 transition-colors"
              style={{ color: 'hsl(var(--paper))', textDecorationColor: 'var(--landing-line)' }}
            >
              Entrar
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
