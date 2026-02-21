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
      "flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in",
      className
    )}>
      <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="btn-primary-gradient">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export { EmptyState };
