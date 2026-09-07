import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function RazorIllustration() {
  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox="0 0 320 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[340px] h-auto"
        aria-hidden="true"
      >
        {/* Lâmina */}
        <path
          d="M40 70 L190 70 L190 100 L60 100 C45 100 38 88 40 70 Z"
          stroke="#22C55E"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="48" y1="78" x2="182" y2="78" stroke="#22C55E" strokeWidth="0.75" opacity="0.5" />
        {/* Fio de corte em bordô */}
        <path d="M190 70 L190 100 L182 100" stroke="#8B1E2B" strokeWidth="2" strokeLinecap="round" />
        {/* Pino de articulação */}
        <circle cx="196" cy="85" r="4.5" stroke="#22C55E" strokeWidth="1.5" />
        {/* Cabo */}
        <path
          d="M200 85 C230 85 255 92 282 104 C288 107 290 113 286 117 C282 121 274 120 268 117 C244 105 222 100 196 100"
          stroke="#22C55E"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M200 85 C232 90 256 97 280 110"
          stroke="#22C55E"
          strokeWidth="0.75"
          opacity="0.45"
          strokeLinecap="round"
        />
        {/* Linhas de precisão / marcação */}
        <line x1="40" y1="130" x2="280" y2="130" stroke="rgba(242,238,228,0.14)" strokeWidth="1" strokeDasharray="2 6" />
        <line x1="40" y1="124" x2="40" y2="136" stroke="rgba(242,238,228,0.25)" strokeWidth="1" />
        <line x1="280" y1="124" x2="280" y2="136" stroke="rgba(242,238,228,0.25)" strokeWidth="1" />
        <line x1="115" y1="40" x2="115" y2="58" stroke="rgba(242,238,228,0.2)" strokeWidth="1" />
        <line x1="109" y1="40" x2="121" y2="40" stroke="rgba(242,238,228,0.2)" strokeWidth="1" />
      </svg>
      <p
        className="font-editorial-mono text-[10px] uppercase tracking-[0.22em] mt-6"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        FIG. 01 — PRECISÃO
      </p>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative pt-[calc(7rem+env(safe-area-inset-top))] pb-16 md:pt-[calc(9.5rem+env(safe-area-inset-top))] md:pb-24 px-4 sm:px-6 overflow-hidden">
      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-14 lg:gap-10 items-center">
        {/* LEFT — Copy */}
        <div className="text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-editorial-mono text-xs uppercase tracking-[0.22em] mb-7"
            style={{ color: '#22C55E' }}
          >
            — Gestão para barbearias
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display font-bold text-[2.5rem] sm:text-5xl lg:text-[3.6rem] leading-[1.08] mb-7"
            style={{ color: 'hsl(var(--paper))' }}
          >
            A gestão da sua barbearia,{' '}
            <em className="relative inline-block not-italic">
              <span
                className="absolute inset-x-[-0.08em] bottom-[0.06em] h-[0.42em] -z-10"
                style={{ background: 'rgba(139, 30, 43, 0.55)' }}
              />
              <span className="italic">editada</span>
            </em>{' '}
            com precisão.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed"
            style={{ color: '#D8D4C8' }}
          >
            Agenda, equipe, financeiro e atendimento online em uma única plataforma.
            Desenhada para profissionais que tratam barbearia como negócio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start items-center"
          >
            <Link
              to="/register"
              className="font-editorial-mono text-xs uppercase tracking-[0.12em] px-7 h-12 inline-flex items-center rounded-md font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                color: '#0A0A08',
                boxShadow: '0 8px 28px -8px rgba(34, 197, 94, 0.5)',
              }}
            >
              Criar conta grátis
            </Link>
            <a
              href="#features"
              className="text-sm underline underline-offset-4 transition-colors"
              style={{ color: 'hsl(var(--muted-foreground))', textDecorationColor: 'var(--landing-line)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--paper))')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
            >
              Ver o que inclui →
            </a>
          </motion.div>
        </div>

        {/* RIGHT — Razor line illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex items-center justify-center"
        >
          <RazorIllustration />
        </motion.div>
      </div>
    </section>
  );
}
