import { cn } from "@/lib/utils";

interface PremiumSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'chart';
}

function PremiumSkeleton({ className, variant = 'default', ...props }: PremiumSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-muted/50 relative overflow-hidden",
        "after:absolute after:inset-0 after:translate-x-[-100%]",
        "after:bg-gradient-to-r after:from-transparent after:via-primary/[0.04] after:to-transparent",
        "after:animate-[shimmer_2s_ease-in-out_infinite]",
        variant === 'card' && "h-32",
        variant === 'text' && "h-4",
        variant === 'avatar' && "h-10 w-10 rounded-full",
        variant === 'chart' && "h-48",
        className
      )}
      {...props}
    />
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/30 bg-card/60 p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <PremiumSkeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <PremiumSkeleton variant="text" className="w-3/4" />
          <PremiumSkeleton variant="text" className="w-1/2 h-3" />
        </div>
      </div>
    </div>
  );
}

function SkeletonSlot({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl", className)}>
      <PremiumSkeleton className="w-12 h-5" />
      <div className="w-px h-6 bg-border/20" />
      <PremiumSkeleton variant="text" className="flex-1 h-3" />
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border/30 bg-card/60 p-3 text-center space-y-2">
          <PremiumSkeleton className="w-8 h-8 rounded-xl mx-auto" />
          <PremiumSkeleton variant="text" className="w-10 h-6 mx-auto" />
          <PremiumSkeleton variant="text" className="w-14 h-2 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export { PremiumSkeleton, SkeletonCard, SkeletonSlot, SkeletonStats };
