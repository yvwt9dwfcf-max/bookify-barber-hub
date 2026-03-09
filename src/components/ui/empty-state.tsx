import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-14 px-6 text-center animate-fade-in",
      className
    )}>
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-125" />
        <div className="relative w-16 h-16 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center">
          <Icon className="h-7 w-7 text-primary/80" />
        </div>
      </div>
      <h3 className="text-base font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="btn-primary-gradient px-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export { EmptyState };
