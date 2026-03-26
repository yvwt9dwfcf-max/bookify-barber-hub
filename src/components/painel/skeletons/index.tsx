import { PremiumSkeleton } from '@/components/ui/premium-skeleton';

/* ── Shared header skeleton ────────────────────────── */
function SkeletonPageHeader({ titleW = 'w-48', subtitleW = 'w-72', action = false }: { titleW?: string; subtitleW?: string; action?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-2">
        <PremiumSkeleton className={`h-7 ${titleW}`} />
        <PremiumSkeleton className={`h-4 ${subtitleW}`} />
      </div>
      {action && <PremiumSkeleton className="h-10 w-36 rounded-lg" />}
    </div>
  );
}

/* ── Clientes ──────────────────────────────────────── */
export function ClientesSkeleton() {
  return (
    <div className="space-y-4 animate-page-enter">
      <SkeletonPageHeader titleW="w-36" subtitleW="w-64" />
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border border-border/30 bg-card/60 p-3 space-y-2">
            <PremiumSkeleton className="w-8 h-8 rounded-xl mx-auto" />
            <PremiumSkeleton className="w-10 h-5 mx-auto" />
            <PremiumSkeleton className="w-16 h-2 mx-auto" />
          </div>
        ))}
      </div>
      {/* Tab bar */}
      <PremiumSkeleton className="h-9 w-full rounded-lg" />
      {/* Search */}
      <PremiumSkeleton className="h-9 w-full rounded-lg" />
      {/* Client rows */}
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-card/40">
            <PremiumSkeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <PremiumSkeleton className="h-4 w-32" />
              <PremiumSkeleton className="h-3 w-24" />
            </div>
            <PremiumSkeleton className="h-4 w-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Comissões ─────────────────────────────────────── */
export function ComissoesSkeleton() {
  return (
    <div className="space-y-4 animate-page-enter">
      <SkeletonPageHeader titleW="w-52" subtitleW="w-80" />
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl border border-border/30 bg-card/60 p-4">
            <div className="flex items-center gap-3">
              <PremiumSkeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <PremiumSkeleton className="h-4 w-28" />
                <PremiumSkeleton className="h-3 w-48" />
              </div>
              <PremiumSkeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Relatórios ────────────────────────────────────── */
export function RelatoriosSkeleton() {
  return (
    <div className="space-y-4 animate-page-enter">
      <SkeletonPageHeader titleW="w-40" subtitleW="w-56" action />
      {/* Period buttons */}
      <div className="flex justify-end gap-2">
        <PremiumSkeleton className="h-8 w-16 rounded-lg" />
        <PremiumSkeleton className="h-8 w-16 rounded-lg" />
        <PremiumSkeleton className="h-8 w-16 rounded-lg" />
      </div>
      {/* Tabs */}
      <PremiumSkeleton className="h-11 w-full rounded-lg" />
      {/* Chart */}
      <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-3">
        <PremiumSkeleton className="h-5 w-28" />
        <PremiumSkeleton className="h-[180px] w-full rounded-lg" />
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-2">
            <PremiumSkeleton className="h-4 w-20" />
            <PremiumSkeleton className="h-8 w-16" />
            <PremiumSkeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── WhatsApp ──────────────────────────────────────── */
export function WhatsAppSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl animate-page-enter">
      <SkeletonPageHeader titleW="w-56" subtitleW="w-80" />
      {/* Mode selector */}
      <div className="rounded-xl border border-border/30 bg-card/60 p-5 space-y-4">
        <PremiumSkeleton className="h-5 w-40" />
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/20">
              <PremiumSkeleton className="w-5 h-5 rounded-full" />
              <div className="flex-1 space-y-1">
                <PremiumSkeleton className="h-4 w-32" />
                <PremiumSkeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Phone + message fields */}
      <div className="rounded-xl border border-border/30 bg-card/60 p-5 space-y-4">
        <PremiumSkeleton className="h-4 w-24" />
        <PremiumSkeleton className="h-10 w-full rounded-lg" />
        <PremiumSkeleton className="h-4 w-36" />
        <PremiumSkeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}

/* ── Assinatura ────────────────────────────────────── */
export function AssinaturaSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-page-enter">
      {/* Plan card */}
      <div className="rounded-xl border border-border/30 bg-card/60 overflow-hidden">
        <div className="h-1 bg-muted/50" />
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <PremiumSkeleton className="h-3 w-20" />
              <PremiumSkeleton className="h-8 w-36" />
            </div>
            <PremiumSkeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <PremiumSkeleton className="h-3 w-20" />
              <PremiumSkeleton className="h-5 w-28" />
            </div>
            <div className="space-y-1">
              <PremiumSkeleton className="h-3 w-20" />
              <PremiumSkeleton className="h-5 w-28" />
            </div>
          </div>
          <PremiumSkeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      {/* Plan comparison */}
      <div className="space-y-4">
        <PremiumSkeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl border border-border/30 bg-card/60 p-5 space-y-3">
              <PremiumSkeleton className="h-5 w-20" />
              <PremiumSkeleton className="h-8 w-24" />
              <div className="space-y-2 pt-2">
                {[0, 1, 2, 3].map(j => (
                  <PremiumSkeleton key={j} className="h-3 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Perfil Público ────────────────────────────────── */
export function PerfilPublicoSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl animate-page-enter">
      <SkeletonPageHeader titleW="w-40" subtitleW="w-72" />
      {/* Link preview */}
      <div className="rounded-xl border border-border/30 bg-card/60 p-4 flex items-center gap-3">
        <PremiumSkeleton className="h-5 w-5 rounded" />
        <PremiumSkeleton className="h-4 flex-1" />
        <PremiumSkeleton className="h-8 w-20 rounded-lg" />
      </div>
      {/* Form fields */}
      <div className="rounded-xl border border-border/30 bg-card/60 p-5 space-y-5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <PremiumSkeleton className="h-4 w-24" />
            <PremiumSkeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        {/* Photo upload area */}
        <PremiumSkeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

/* ── Configurações ─────────────────────────────────── */
export function ConfiguracoesSkeleton() {
  return (
    <div className="space-y-6 animate-page-enter">
      <SkeletonPageHeader titleW="w-44" subtitleW="w-64" />
      {/* Profile section */}
      <div className="rounded-xl border border-border/30 bg-card/60 p-5 space-y-4">
        <div className="flex items-center gap-4">
          <PremiumSkeleton className="w-16 h-16 rounded-xl" />
          <div className="flex-1 space-y-2">
            <PremiumSkeleton className="h-5 w-36" />
            <PremiumSkeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-1.5">
              <PremiumSkeleton className="h-4 w-20" />
              <PremiumSkeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      {/* Settings toggles */}
      <div className="rounded-xl border border-border/30 bg-card/60 p-5 space-y-4">
        {[0, 1].map(i => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1">
              <PremiumSkeleton className="h-4 w-32" />
              <PremiumSkeleton className="h-3 w-48" />
            </div>
            <PremiumSkeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
