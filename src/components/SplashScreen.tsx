import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onFinished: () => void;
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('hold'), 600);
    const exitTimer = setTimeout(() => setPhase('exit'), 1800);
    const doneTimer = setTimeout(onFinished, 2400);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinished]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? null : null}
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'exit' ? 0 : 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        onAnimationComplete={() => {
          if (phase === 'exit') onFinished();
        }}
      >
        {/* Subtle radial glow behind logo */}
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase === 'enter' ? 1.2 : 1.5, opacity: phase === 'exit' ? 0 : 0.8 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Logo text */}
        <motion.div className="flex flex-col items-center gap-3 relative">
          {/* Icon / decorative element */}
          <motion.div
            className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: phase === 'exit' ? 0.8 : 1,
              rotate: 0,
              opacity: phase === 'exit' ? 0 : 1,
            }}
            transition={{
              scale: { type: 'spring', damping: 15, stiffness: 200, delay: 0.1 },
              rotate: { type: 'spring', damping: 20, stiffness: 150, delay: 0.1 },
              opacity: { duration: 0.3 },
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-8 h-8 text-primary"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </motion.div>

          {/* Brand name */}
          <motion.h1
            className="text-4xl font-display font-bold text-foreground tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: phase === 'exit' ? 0 : 1,
              y: phase === 'exit' ? -10 : 0,
            }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          >
            Book
            <span className="text-primary">ify</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            className="text-sm text-muted-foreground font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: phase === 'exit' ? 0 : 1,
              y: phase === 'exit' ? -5 : 0,
            }}
            transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
          >
            Sua agenda inteligente
          </motion.p>

          {/* Loading dots */}
          <motion.div
            className="flex gap-1.5 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'exit' ? 0 : 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary/60"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
